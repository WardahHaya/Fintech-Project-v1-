from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import ConfigDict, Field

from app.schemas.kyc import SchemaModel


class MerchantDecision(str, Enum):
    APPROVED = "APPROVED"
    ESCALATE = "ESCALATE"
    REJECTED = "REJECTED"


class MerchantReviewResponse(SchemaModel):
    decision: MerchantDecision
    risk_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: list[str] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)


class MerchantReviewRecord(SchemaModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    merchant_id: str
    business_name: str
    risk_score: int
    confidence_score: float
    decision: str
    reasoning: list[str]
    missing_documents: list[str]
    reviewed_at: datetime
