from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.kyc import SchemaModel


class ComplianceQueryRequest(SchemaModel):
    query: str = Field(min_length=5)


class ComplianceQuerySource(SchemaModel):
    chunk_id: str
    source: str
    domain: str
    article: str | None = None
    title: str
    score: float


class ComplianceQueryResponse(SchemaModel):
    answer: str
    sources: list[ComplianceQuerySource] = Field(default_factory=list)
    has_groq: bool


class ComplianceQueryRecord(SchemaModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    query_text: str
    answer: str
    source_chunk_ids: list[str] = Field(default_factory=list)
    confidence: float | None = None
    has_groq: bool
    queried_at: datetime
