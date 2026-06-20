from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

try:
    from pgvector.sqlalchemy import Vector as PgVector

    def _vector_type(dimensions: int):
        return PgVector(dimensions)
except Exception:  # pragma: no cover - optional local fallback
    def _vector_type(_: int):
        return JSON


class ComplianceChunk(Base):
    __tablename__ = "compliance_chunks"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True, default=uuid4)
    chunk_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    article: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    embedding: Mapped[object] = mapped_column(_vector_type(384), nullable=False)


class ComplianceQuery(Base):
    __tablename__ = "compliance_queries"

    id: Mapped[object] = mapped_column(Uuid, primary_key=True, default=uuid4)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    source_chunk_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    has_groq: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    queried_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
