from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import TypedDict

from groq import Groq
from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.compliance import ComplianceQuery
from app.rag.retriever import RetrievedComplianceChunk, get_compliance_retriever
from app.schemas.compliance import ComplianceQueryResponse, ComplianceQuerySource


SYSTEM_PROMPT = (
    "Answer ONLY from the provided SAMA regulatory context. Always cite which "
    "article/source the answer is drawn from. If the answer is not covered in the "
    "context, say so explicitly. Do not speculate."
)


@dataclass(frozen=True)
class ComplianceAgentExecution:
    response: ComplianceQueryResponse
    source_chunk_ids: list[str]
    confidence: float | None


class QueryState(TypedDict, total=False):
    query: str
    db: Session
    retrieved_chunks: list[RetrievedComplianceChunk]
    context: str
    answer: str
    has_groq: bool
    confidence: float | None
    response: ComplianceQueryResponse


class ComplianceAgent:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.retriever = get_compliance_retriever()
        self.client = Groq(api_key=self.settings.groq_api_key) if self.settings.groq_enabled else None
        self.graph = self._build_graph()

    def _retrieve_context(self, state: QueryState) -> QueryState:
        db = state["db"]
        query = state["query"]
        chunks = self.retriever.retrieve(db, query, top_k=3)
        context_parts = []
        for chunk in chunks:
            label = f"{chunk.source} | {chunk.article or 'Article not provided'} | {chunk.title}"
            context_parts.append(f"[{chunk.chunk_id}] {label}\n{chunk.content}")

        confidence = chunks[0].score if chunks else None
        return {
            "retrieved_chunks": chunks,
            "context": "\n\n".join(context_parts),
            "confidence": confidence,
        }

    def _generate_answer(self, state: QueryState) -> QueryState:
        chunks = state["retrieved_chunks"]
        if not chunks:
            return {
                "answer": "The current compliance corpus does not cover this question.",
                "has_groq": False,
            }

        if self.client is None:
            return {
                "answer": chunks[0].content,
                "has_groq": False,
            }

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                temperature=0,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Question:\n{state['query']}\n\nContext:\n{state['context']}",
                    },
                ],
            )
            answer = (response.choices[0].message.content or "").strip()
            if answer:
                return {"answer": answer, "has_groq": True}
        except Exception:
            pass

        return {
            "answer": chunks[0].content,
            "has_groq": False,
        }

    def _finalize(self, state: QueryState) -> QueryState:
        response = ComplianceQueryResponse(
            answer=state["answer"],
            sources=[
                ComplianceQuerySource(
                    chunk_id=chunk.chunk_id,
                    source=chunk.source,
                    domain=chunk.domain,
                    article=chunk.article,
                    title=chunk.title,
                    score=chunk.score,
                )
                for chunk in state["retrieved_chunks"]
            ],
            has_groq=state["has_groq"],
        )
        return {"response": response}

    def _build_graph(self):
        graph = StateGraph(QueryState)
        graph.add_node("retrieve_context", self._retrieve_context)
        graph.add_node("generate_answer", self._generate_answer)
        graph.add_node("finalize", self._finalize)
        graph.add_edge(START, "retrieve_context")
        graph.add_edge("retrieve_context", "generate_answer")
        graph.add_edge("generate_answer", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    async def answer_query(self, query: str, db: Session) -> ComplianceAgentExecution:
        result = await self.graph.ainvoke({"query": query, "db": db})
        response = result["response"]
        source_chunk_ids = [source.chunk_id for source in response.sources]
        confidence = result.get("confidence")

        db.add(
            ComplianceQuery(
                query_text=query,
                answer=response.answer,
                source_chunk_ids=source_chunk_ids,
                confidence=confidence,
                has_groq=response.has_groq,
            )
        )
        db.commit()

        return ComplianceAgentExecution(
            response=response,
            source_chunk_ids=source_chunk_ids,
            confidence=confidence,
        )


@lru_cache
def get_compliance_agent() -> ComplianceAgent:
    return ComplianceAgent()
