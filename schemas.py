"""
schemas.py — Tiqmo AI Agents: Dataset Schemas
Defines data models for KYC, Merchant, and Compliance RAG datasets.
"""

from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


# ─── ENUMS ───────────────────────────────────────────────────────────────────

class KYCDecision(str, Enum):
    APPROVED       = "approved"
    REJECTED       = "rejected"
    MANUAL_REVIEW  = "manual_review"

class DocumentType(str, Enum):
    NATIONAL_ID = "national_id"
    PASSPORT    = "passport"
    IQAMA       = "iqama"          # Saudi residency permit

class RiskLevel(str, Enum):
    LOW    = "low"
    MEDIUM = "medium"
    HIGH   = "high"

class MerchantDecision(str, Enum):
    APPROVED  = "approved"
    ESCALATE  = "escalate"
    REJECTED  = "rejected"

class MerchantCategory(str, Enum):
    FOOD        = "food"
    RETAIL      = "retail"
    SERVICES    = "services"
    TRANSPORT   = "transport"
    HEALTHCARE  = "healthcare"
    EDUCATION   = "education"
    ELECTRONICS = "electronics"
    RESTAURANTS = "restaurants"

class ComplianceDomain(str, Enum):
    KYC              = "kyc"
    AML              = "aml"
    PAYMENT_SERVICES = "payment_services"
    CONSUMER_PROT    = "consumer_protection"
    DIGITAL_WALLET   = "digital_wallet"


# ─── KYC SCHEMA ──────────────────────────────────────────────────────────────

class KYCRecord(BaseModel):
    record_id:           str
    full_name_en:        str
    full_name_ar:        Optional[str]
    national_id:         str            # 10-digit, starts with 1 (citizen) or 2 (resident)
    document_type:       DocumentType
    nationality:         str
    dob:                 str            # YYYY-MM-DD
    issue_date:          str
    expiry_date:         str
    is_expired:          bool
    selfie_match_score:  float          # 0.0–1.0 (face match confidence)
    name_match_score:    float          # 0.0–1.0 (form vs document name)
    address:             str
    phone:               str            # +966XXXXXXXXX
    risk_flags:          List[str]      # e.g. ["expired_doc", "low_selfie_match"]
    age:                 int
    is_underage:         bool
    duplicate_flag:      bool
    label:               KYCDecision
    rejection_reason:    Optional[str]


# ─── MERCHANT SCHEMA ─────────────────────────────────────────────────────────

class MerchantRecord(BaseModel):
    merchant_id:             str
    business_name_en:        str
    business_name_ar:        Optional[str]
    category:                MerchantCategory
    cr_number:               str            # 10-digit Saudi CR
    owner_name:              str
    owner_national_id:       str
    registration_date:       str
    city:                    str
    monthly_transaction_vol: int            # SAR
    avg_transaction_value:   float          # SAR
    num_transactions_monthly: int
    missing_docs:            List[str]
    risk_level:              RiskLevel
    risk_flags:              List[str]
    decision:                MerchantDecision
    rejection_reason:        Optional[str]


# ─── COMPLIANCE RAG CHUNK SCHEMA ─────────────────────────────────────────────

class ComplianceChunk(BaseModel):
    chunk_id:     str
    source:       str           # e.g. "SAMA_PSP_Regulations_2023"
    domain:       ComplianceDomain
    article:      Optional[str] # e.g. "Article 12, Section 3"
    title:        str
    content:      str           # the actual text chunk (200–400 tokens ideal)
    keywords:     List[str]
    language:     str           # "en" or "ar"
