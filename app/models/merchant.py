from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MerchantReview(Base):
    __tablename__ = "merchant_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    merchant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    reasoning: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    missing_documents: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
