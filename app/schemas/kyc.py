from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class KYCDecision(str, Enum):
    APPROVED = "APPROVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    REJECTED = "REJECTED"


class CustomerProfile(SchemaModel):
    customer_id: str
    full_name: str | None = None
    date_of_birth: date | None = None
    country_of_residence: str | None = None
    nationality: str | None = None
    email: str | None = None
    phone: str | None = None
    pep_status: bool | None = None
    risk_watchlist_match: bool | None = None


class DocumentMetadata(SchemaModel):
    document_type: str
    extracted_name: str | None = None
    expiration_date: date | None = None
    ocr_confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class CustomerDocumentBundle(SchemaModel):
    customer_id: str
    documents: list[DocumentMetadata]


class KYCReviewResponse(SchemaModel):
    decision: KYCDecision
    risk_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: list[str] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)


class KYCReviewRecord(SchemaModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_id: str
    full_name: str
    risk_score: int
    confidence_score: float
    decision: str
    reasoning: list[str]
    missing_documents: list[str]
    reviewed_at: datetime
