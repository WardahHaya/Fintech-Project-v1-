from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, func, insert, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal, _normalize_database_url, engine
from app.models.compliance import ComplianceChunk, ComplianceQuery


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384
TOP_K = 3
CORPUS_PATH = Path(__file__).resolve().parents[2] / "data" / "compliance" / "compliance_corpus.json"

_retriever_lock = threading.Lock()
_bootstrap_lock = threading.Lock()
_bootstrap_thread: threading.Thread | None = None
_bootstrap_complete = threading.Event()
_bootstrap_error: str | None = None
_retriever_instance: "ComplianceRetriever | None" = None


@dataclass(frozen=True)
class RetrievedComplianceChunk:
    chunk_id: str
    source: str
    domain: str
    article: str | None
    title: str
    content: str
    score: float


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def _direct_database_url(database_url: str) -> str:
    normalized = _normalize_database_url(database_url)
    return normalized.replace("-pooler.", ".", 1) if "-pooler." in normalized else normalized


class ComplianceRetriever:
    def __init__(self) -> None:
        self.settings = get_settings()
        from sentence_transformers import SentenceTransformer

        self.embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        dimensions = self.embedding_model.get_sentence_embedding_dimension()
        if dimensions != EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Unexpected embedding dimension {dimensions}; expected {EMBEDDING_DIMENSIONS}."
            )

    def bootstrap(self) -> None:
        self._ensure_pgvector_extension()
        ComplianceChunk.__table__.create(bind=engine, checkfirst=True)
        ComplianceQuery.__table__.create(bind=engine, checkfirst=True)

        with SessionLocal() as db:
            existing_rows = db.scalar(select(func.count()).select_from(ComplianceChunk)) or 0
            if existing_rows == 0:
                self._seed_corpus(db)

    def _ensure_pgvector_extension(self) -> None:
        if engine.dialect.name != "postgresql":
            return

        create_extension = text("CREATE EXTENSION IF NOT EXISTS vector;")
        try:
            with engine.begin() as connection:
                connection.execute(create_extension)
            return
        except Exception:
            direct_url = _direct_database_url(self.settings.database_url)
            normalized_direct_url = _normalize_database_url(direct_url)
            if normalized_direct_url == _normalize_database_url(self.settings.database_url):
                raise

            direct_engine = create_engine(normalized_direct_url, pool_pre_ping=True, future=True)
            try:
                with direct_engine.begin() as connection:
                    connection.execute(create_extension)
            finally:
                direct_engine.dispose()

    def _seed_corpus(self, db: Session) -> None:
        with open(CORPUS_PATH, encoding="utf-8") as handle:
            payload = json.load(handle)

        contents = [entry["content"] for entry in payload]
        embeddings = self.embed_many(contents)
        rows = []
        for entry, embedding in zip(payload, embeddings, strict=False):
            rows.append(
                {
                    "chunk_id": entry["chunk_id"],
                    "source": entry["source"],
                    "domain": entry["domain"],
                    "article": entry.get("article"),
                    "title": entry["title"],
                    "content": entry["content"],
                    "keywords": entry.get("keywords", []),
                    "language": entry.get("language", "en"),
                    "embedding": embedding,
                }
            )

        db.execute(insert(ComplianceChunk), rows)
        db.commit()

    def embed_query(self, query: str) -> list[float]:
        vector = self.embedding_model.encode(query, normalize_embeddings=True)
        return [float(value) for value in vector.tolist()]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        matrix = self.embedding_model.encode(texts, normalize_embeddings=True)
        return [[float(value) for value in row.tolist()] for row in matrix]

    def retrieve(self, db: Session, query: str, top_k: int = TOP_K) -> list[RetrievedComplianceChunk]:
        query_embedding = self.embed_query(query)

        if db.bind is not None and db.bind.dialect.name == "postgresql":
            statement = text(
                """
                SELECT
                    chunk_id,
                    source,
                    domain,
                    article,
                    title,
                    content,
                    (1 - (embedding <=> CAST(:embedding AS vector))) AS score
                FROM compliance_chunks
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT :limit
                """
            )
            rows = db.execute(
                statement,
                {"embedding": _vector_literal(query_embedding), "limit": top_k},
            ).mappings()
            return [
                RetrievedComplianceChunk(
                    chunk_id=row["chunk_id"],
                    source=row["source"],
                    domain=row["domain"],
                    article=row["article"],
                    title=row["title"],
                    content=row["content"],
                    score=float(row["score"]),
                )
                for row in rows
            ]

        chunks = db.scalars(select(ComplianceChunk)).all()
        scored_chunks: list[RetrievedComplianceChunk] = []
        for chunk in chunks:
            embedding = [float(value) for value in list(chunk.embedding)]
            score = sum(left * right for left, right in zip(query_embedding, embedding, strict=False))
            scored_chunks.append(
                RetrievedComplianceChunk(
                    chunk_id=chunk.chunk_id,
                    source=chunk.source,
                    domain=chunk.domain,
                    article=chunk.article,
                    title=chunk.title,
                    content=chunk.content,
                    score=score,
                )
            )

        scored_chunks.sort(key=lambda item: item.score, reverse=True)
        return scored_chunks[:top_k]


def get_compliance_retriever() -> ComplianceRetriever:
    global _retriever_instance

    with _retriever_lock:
        if _retriever_instance is None:
            _retriever_instance = ComplianceRetriever()
        return _retriever_instance


def bootstrap_compliance_retriever() -> None:
    global _bootstrap_error

    try:
        get_compliance_retriever().bootstrap()
        _bootstrap_error = None
    except Exception as exc:
        _bootstrap_error = f"{type(exc).__name__}: {exc}"
    finally:
        _bootstrap_complete.set()


def start_compliance_bootstrap() -> None:
    global _bootstrap_thread

    with _bootstrap_lock:
        if _bootstrap_complete.is_set():
            return
        if _bootstrap_thread is not None and _bootstrap_thread.is_alive():
            return

        _bootstrap_thread = threading.Thread(
            target=bootstrap_compliance_retriever,
            name="compliance-bootstrap",
            daemon=True,
        )
        _bootstrap_thread.start()


def is_compliance_ready() -> bool:
    return _bootstrap_complete.is_set() and _bootstrap_error is None


def get_compliance_bootstrap_error() -> str | None:
    if not _bootstrap_complete.is_set():
        return None
    return _bootstrap_error
