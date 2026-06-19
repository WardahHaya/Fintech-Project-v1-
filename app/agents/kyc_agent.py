from __future__ import annotations

import ast
import csv
import json
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from typing import Any, TypedDict

from groq import Groq
from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError

from app.core.config import get_settings
from app.schemas.kyc import CustomerDocumentBundle, CustomerProfile, DocumentMetadata, KYCDecision, KYCReviewResponse


WATCHLIST_FLAGS = {"watchlist_match", "sanction_match", "risk_watchlist_match"}


class CustomerNotFoundError(Exception):
    """Raised when the customer is missing from the local KYC dataset."""


@dataclass(frozen=True)
class KYCReviewExecution:
    customer_id: str
    full_name: str
    result: KYCReviewResponse


@dataclass(frozen=True)
class KYCDatasetRecord:
    record_id: str
    full_name_en: str | None
    full_name_ar: str | None
    national_id: str | None
    document_type: str | None
    nationality: str | None
    dob: date | None
    issue_date: date | None
    expiry_date: date | None
    is_expired: bool
    selfie_match_score: float | None
    name_match_score: float | None
    address: str | None
    phone: str | None
    risk_flags: tuple[str, ...]
    age: int | None
    is_underage: bool
    duplicate_flag: bool
    label: str | None
    rejection_reason: str | None

    @property
    def full_name(self) -> str | None:
        return self.full_name_en or self.full_name_ar

    @property
    def country_of_residence(self) -> str | None:
        if not self.address:
            return None
        segments = [segment.strip() for segment in self.address.split(",") if segment.strip()]
        if not segments:
            return None
        return segments[-1]

    @property
    def risk_watchlist_match(self) -> bool:
        return any(flag in WATCHLIST_FLAGS for flag in self.normalized_risk_flags)

    @property
    def pep_status(self) -> bool:
        return "pep" in self.normalized_risk_flags

    @property
    def normalized_risk_flags(self) -> tuple[str, ...]:
        return tuple(flag.strip().lower() for flag in self.risk_flags if flag and flag.strip())


class ReviewState(TypedDict, total=False):
    customer_id: str
    dataset_record: KYCDatasetRecord
    profile: CustomerProfile
    document_bundle: CustomerDocumentBundle
    reasoning: list[str]
    missing_documents: list[str]
    risk_score: int
    decision: str
    confidence: float
    hard_reject: bool
    review_required: bool
    groq_audit: dict[str, Any] | None
    result: KYCReviewResponse


def _parse_optional_string(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _parse_bool(value: str | bool | None) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y"}


def _parse_float(value: str | None) -> float | None:
    normalized = _parse_optional_string(value)
    if normalized is None:
        return None
    return float(normalized)


def _parse_int(value: str | None) -> int | None:
    normalized = _parse_optional_string(value)
    if normalized is None:
        return None
    return int(normalized)


def _parse_date(value: str | None) -> date | None:
    normalized = _parse_optional_string(value)
    if normalized is None:
        return None
    return date.fromisoformat(normalized)


def _parse_flags(value: str | None) -> tuple[str, ...]:
    normalized = _parse_optional_string(value)
    if normalized is None:
        return tuple()
    try:
        parsed = ast.literal_eval(normalized)
    except (SyntaxError, ValueError):
        return tuple()
    if not isinstance(parsed, list):
        return tuple()
    return tuple(str(item).strip() for item in parsed if str(item).strip())


@lru_cache
def _load_kyc_dataset(dataset_path: str) -> dict[str, KYCDatasetRecord]:
    records: dict[str, KYCDatasetRecord] = {}
    with open(dataset_path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            record = KYCDatasetRecord(
                record_id=row["record_id"].strip(),
                full_name_en=_parse_optional_string(row.get("full_name_en")),
                full_name_ar=_parse_optional_string(row.get("full_name_ar")),
                national_id=_parse_optional_string(row.get("national_id")),
                document_type=_parse_optional_string(row.get("document_type")),
                nationality=_parse_optional_string(row.get("nationality")),
                dob=_parse_date(row.get("dob")),
                issue_date=_parse_date(row.get("issue_date")),
                expiry_date=_parse_date(row.get("expiry_date")),
                is_expired=_parse_bool(row.get("is_expired")),
                selfie_match_score=_parse_float(row.get("selfie_match_score")),
                name_match_score=_parse_float(row.get("name_match_score")),
                address=_parse_optional_string(row.get("address")),
                phone=_parse_optional_string(row.get("phone")),
                risk_flags=_parse_flags(row.get("risk_flags")),
                age=_parse_int(row.get("age")),
                is_underage=_parse_bool(row.get("is_underage")),
                duplicate_flag=_parse_bool(row.get("duplicate_flag")),
                label=_parse_optional_string(row.get("label")),
                rejection_reason=_parse_optional_string(row.get("rejection_reason")),
            )
            records[record.record_id] = record
    return records


class KYCReviewAgent:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = Groq(api_key=self.settings.groq_api_key) if self.settings.groq_enabled else None
        self.graph = self._build_graph()

    def _find_customer_context(self, customer_id: str) -> tuple[KYCDatasetRecord, CustomerProfile, CustomerDocumentBundle]:
        records = _load_kyc_dataset(str(self.settings.kyc_dataset_path))
        dataset_record = records.get(customer_id)
        if dataset_record is None:
            raise CustomerNotFoundError(
                f"Customer '{customer_id}' was not found in kyc_dataset.csv."
            )

        profile = CustomerProfile(
            customer_id=dataset_record.record_id,
            full_name=dataset_record.full_name,
            date_of_birth=dataset_record.dob,
            country_of_residence=dataset_record.country_of_residence,
            nationality=dataset_record.nationality,
            phone=dataset_record.phone,
            pep_status=dataset_record.pep_status,
            risk_watchlist_match=dataset_record.risk_watchlist_match,
        )

        documents = []
        if dataset_record.document_type:
            documents.append(
                DocumentMetadata(
                    document_type=dataset_record.document_type,
                    extracted_name=dataset_record.full_name,
                    expiration_date=dataset_record.expiry_date,
                )
            )
        document_bundle = CustomerDocumentBundle(customer_id=dataset_record.record_id, documents=documents)
        return dataset_record, profile, document_bundle

    def _load_context(self, state: ReviewState) -> ReviewState:
        dataset_record, profile, document_bundle = self._find_customer_context(state["customer_id"])
        return {
            "dataset_record": dataset_record,
            "profile": profile,
            "document_bundle": document_bundle,
        }

    def _evaluate_rules(self, state: ReviewState) -> ReviewState:
        dataset_record = state["dataset_record"]
        profile = state["profile"]
        document_bundle = state["document_bundle"]
        reference_date = self.settings.reference_date
        normalized_flags = set(dataset_record.normalized_risk_flags)

        reasoning: list[str] = []
        missing_documents: list[str] = []
        risk_score = 0
        hard_reject = False
        review_required = False

        missing_fields = [
            field_name
            for field_name in self.settings.required_profile_fields
            if getattr(profile, field_name, None) in (None, "")
        ]
        for field_name in missing_fields:
            reasoning.append(f"Missing required profile field in kyc_dataset.csv: {field_name}.")
            risk_score += 12

        if len(missing_fields) >= 2:
            hard_reject = True

        if not dataset_record.national_id or not dataset_record.document_type:
            missing_documents.append("identity_document")
            reasoning.append("Missing identity document metadata in kyc_dataset.csv.")
            risk_score += 45
            hard_reject = True

        if not document_bundle.documents:
            missing_documents.append("identity_document")

        name_match_score = dataset_record.name_match_score
        if name_match_score is None:
            reasoning.append("Name match score is unavailable in the KYC dataset.")
            risk_score += 18
            review_required = True
        elif name_match_score < 0.60:
            reasoning.append(
                f"Severe OCR name discrepancy detected from dataset name_match_score {name_match_score:.3f}."
            )
            risk_score += 35
            hard_reject = True
        elif name_match_score < 0.75:
            reasoning.append(
                f"Moderate OCR name discrepancy detected from dataset name_match_score {name_match_score:.3f}."
            )
            risk_score += 20
            review_required = True

        selfie_match_score = dataset_record.selfie_match_score
        if selfie_match_score is not None and selfie_match_score < 0.60:
            reasoning.append(
                f"Low selfie match score {selfie_match_score:.3f} indicates elevated identity verification risk."
            )
            risk_score += 25
            review_required = True
        elif selfie_match_score is not None and selfie_match_score < 0.70:
            reasoning.append(
                f"Borderline selfie match score {selfie_match_score:.3f} requires analyst review."
            )
            risk_score += 12
            review_required = True

        if dataset_record.is_expired or (
            dataset_record.expiry_date is not None and dataset_record.expiry_date < reference_date
        ):
            expiration_date = dataset_record.expiry_date.isoformat() if dataset_record.expiry_date else "unknown"
            reasoning.append(
                f"Identity document expired on {expiration_date} relative to review date {reference_date.isoformat()}."
            )
            risk_score += 45
            hard_reject = True

        residence = (profile.country_of_residence or "").strip().lower()
        nationality = (profile.nationality or "").strip().lower()
        if residence in self.settings.high_risk_residence_countries:
            reasoning.append(
                f"Country of residence '{profile.country_of_residence}' matches the configured high-risk residence list."
            )
            risk_score += 30
            review_required = True

        if nationality in self.settings.high_risk_nationality_countries or "high_risk_nationality" in normalized_flags:
            reasoning.append(
                f"Nationality '{profile.nationality}' is marked as high-risk in the provided KYC dataset."
            )
            risk_score += 24
            review_required = True

        if dataset_record.is_underage or (dataset_record.age is not None and dataset_record.age < 18):
            reasoning.append("Customer is underage according to the provided KYC dataset.")
            risk_score += 55
            hard_reject = True

        if dataset_record.duplicate_flag or "duplicate_id" in normalized_flags:
            reasoning.append("Duplicate identity signal detected in the provided KYC dataset.")
            risk_score += 40
            hard_reject = True

        if "identity_uncertainty" in normalized_flags:
            reasoning.append("Dataset risk flags include identity uncertainty.")
            risk_score += 18
            review_required = True

        if profile.pep_status is True:
            reasoning.append("PEP status is true and requires enhanced due diligence.")
            risk_score += 25
            review_required = True

        if profile.risk_watchlist_match is True:
            reasoning.append("Risk watchlist or sanctions match is true and triggers hard rejection.")
            risk_score += 55
            hard_reject = True

        risk_score = min(100, risk_score)
        if hard_reject or risk_score >= 75:
            decision = KYCDecision.REJECTED.value
            confidence = min(0.99, round(0.80 + (risk_score / 500), 2))
        elif review_required or risk_score >= 30:
            decision = KYCDecision.REVIEW_REQUIRED.value
            confidence = min(0.95, round(0.72 + (risk_score / 400), 2))
        else:
            decision = KYCDecision.APPROVED.value
            confidence = max(0.85, round(0.98 - (risk_score / 500), 2))

        if not reasoning:
            reasoning.append("All KYC checks passed using the provided kyc_dataset.csv record.")

        return {
            "reasoning": reasoning,
            "missing_documents": sorted(set(missing_documents)),
            "risk_score": risk_score,
            "decision": decision,
            "confidence": confidence,
            "hard_reject": hard_reject,
            "review_required": review_required,
        }

    def _groq_cross_check(self, state: ReviewState) -> ReviewState:
        if self.client is None:
            return {"groq_audit": None}

        profile = state["profile"]
        document_bundle = state["document_bundle"]
        dataset_record = state["dataset_record"]
        payload = {
            "profile": profile.model_dump(mode="json"),
            "documents": document_bundle.model_dump(mode="json"),
            "dataset_record": {
                "record_id": dataset_record.record_id,
                "national_id": dataset_record.national_id,
                "document_type": dataset_record.document_type,
                "expiry_date": dataset_record.expiry_date.isoformat() if dataset_record.expiry_date else None,
                "selfie_match_score": dataset_record.selfie_match_score,
                "name_match_score": dataset_record.name_match_score,
                "risk_flags": list(dataset_record.risk_flags),
                "label": dataset_record.label,
                "rejection_reason": dataset_record.rejection_reason,
            },
            "reference_date": self.settings.reference_date.isoformat(),
            "deterministic_result": {
                "decision": state["decision"],
                "risk_score": state["risk_score"],
                "confidence": state["confidence"],
                "reasoning": state["reasoning"],
                "missing_documents": state["missing_documents"],
            },
        }
        system_prompt = (
            "You are a compliance QA service for Tiqmo. "
            "Review the supplied KYC evidence and return only valid JSON with keys: "
            "decision, risk_score, confidence, reasoning, missing_documents. "
            "Do not add extra keys."
        )
        try:
            response = self.client.chat.completions.create(
                model=self.settings.groq_model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
            )
            content = response.choices[0].message.content or "{}"
            audit_payload = json.loads(content)
            KYCReviewResponse.model_validate(audit_payload)
            return {"groq_audit": audit_payload}
        except (json.JSONDecodeError, ValidationError, Exception):
            return {"groq_audit": None}

    def _finalize(self, state: ReviewState) -> ReviewState:
        response = KYCReviewResponse(
            decision=state["decision"],
            risk_score=state["risk_score"],
            confidence=state["confidence"],
            reasoning=state["reasoning"],
            missing_documents=state["missing_documents"],
        )
        return {"result": response}

    def _build_graph(self):
        graph = StateGraph(ReviewState)
        graph.add_node("load_context", self._load_context)
        graph.add_node("evaluate_rules", self._evaluate_rules)
        graph.add_node("groq_cross_check", self._groq_cross_check)
        graph.add_node("finalize", self._finalize)
        graph.add_edge(START, "load_context")
        graph.add_edge("load_context", "evaluate_rules")
        graph.add_edge("evaluate_rules", "groq_cross_check")
        graph.add_edge("groq_cross_check", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    async def review_customer(self, customer_id: str) -> KYCReviewExecution:
        result = await self.graph.ainvoke({"customer_id": customer_id})
        profile = result["profile"]
        return KYCReviewExecution(
            customer_id=profile.customer_id,
            full_name=profile.full_name or "Unknown Customer",
            result=result["result"],
        )


@lru_cache
def get_kyc_review_agent() -> KYCReviewAgent:
    return KYCReviewAgent()
