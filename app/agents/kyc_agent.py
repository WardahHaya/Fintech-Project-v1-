from __future__ import annotations

import json
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path
from typing import Any, TypedDict

from groq import Groq
from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError

from app.core.config import get_settings
from app.schemas.kyc import (
    CustomerDocumentBundle,
    CustomerProfile,
    KYCDecision,
    KYCReviewResponse,
)


IDENTITY_DOCUMENT_TYPES = {"national_id", "passport", "iqama", "residence_permit"}


class CustomerNotFoundError(Exception):
    """Raised when the customer is missing from the local profile dataset."""


@dataclass(frozen=True)
class KYCReviewExecution:
    customer_id: str
    full_name: str
    result: KYCReviewResponse


class ReviewState(TypedDict, total=False):
    customer_id: str
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


def _normalize_name(value: str | None) -> str:
    if not value:
        return ""
    sanitized = "".join(character.lower() if character.isalnum() else " " for character in value)
    return " ".join(sanitized.split())


def _similarity_ratio(left: str | None, right: str | None) -> float:
    return SequenceMatcher(a=_normalize_name(left), b=_normalize_name(right)).ratio()


class KYCReviewAgent:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = Groq(api_key=self.settings.groq_api_key) if self.settings.groq_enabled else None
        self.graph = self._build_graph()

    def _load_profiles(self) -> list[CustomerProfile]:
        with open(self.settings.customer_profiles_path, encoding="utf-8") as handle:
            payload = json.load(handle)
        return [CustomerProfile.model_validate(item) for item in payload]

    def _load_document_bundles(self) -> list[CustomerDocumentBundle]:
        with open(self.settings.document_metadata_path, encoding="utf-8") as handle:
            payload = json.load(handle)
        return [CustomerDocumentBundle.model_validate(item) for item in payload]

    def _find_customer_context(self, customer_id: str) -> tuple[CustomerProfile, CustomerDocumentBundle]:
        profiles = {profile.customer_id: profile for profile in self._load_profiles()}
        bundles = {bundle.customer_id: bundle for bundle in self._load_document_bundles()}

        profile = profiles.get(customer_id)
        if profile is None:
            raise CustomerNotFoundError(f"Customer '{customer_id}' was not found in customers_profile.json.")

        document_bundle = bundles.get(customer_id)
        if document_bundle is None:
            document_bundle = CustomerDocumentBundle(customer_id=customer_id, documents=[])

        return profile, document_bundle

    def _load_context(self, state: ReviewState) -> ReviewState:
        profile, document_bundle = self._find_customer_context(state["customer_id"])
        return {"profile": profile, "document_bundle": document_bundle}

    def _evaluate_rules(self, state: ReviewState) -> ReviewState:
        profile = state["profile"]
        document_bundle = state["document_bundle"]
        reference_date = self.settings.reference_date

        reasoning: list[str] = []
        missing_documents: list[str] = []
        risk_score = 0
        hard_reject = False
        review_required = False

        missing_fields = [field for field in self.settings.required_profile_fields if getattr(profile, field, None) in (None, "")]
        for field_name in missing_fields:
            reasoning.append(f"Missing required profile field: {field_name}.")
            risk_score += 12

        if len(missing_fields) >= 2:
            hard_reject = True

        documents_by_type = {document.document_type.strip().lower(): document for document in document_bundle.documents}
        identity_document = next((document for document in document_bundle.documents if document.document_type.strip().lower() in IDENTITY_DOCUMENT_TYPES), None)

        if identity_document is None:
            missing_documents.append("identity_document")
            reasoning.append("Missing required identity document for KYC verification.")
            risk_score += 45
            hard_reject = True

        if "proof_of_address" not in documents_by_type:
            missing_documents.append("proof_of_address")
            reasoning.append("Missing required document type: proof_of_address.")
            risk_score += 18
            review_required = True

        if identity_document is not None:
            similarity = _similarity_ratio(profile.full_name, identity_document.extracted_name)
            if similarity < 0.70:
                reasoning.append(
                    "Severe OCR name discrepancy detected between the profile name and identity document extraction."
                )
                risk_score += 35
                hard_reject = True
            elif similarity < 0.90:
                reasoning.append(
                    "Moderate OCR name discrepancy detected between the profile name and identity document extraction."
                )
                risk_score += 20
                review_required = True

            if identity_document.expiration_date and identity_document.expiration_date < reference_date:
                reasoning.append(
                    f"Identity document expired on {identity_document.expiration_date.isoformat()} relative to review date {reference_date.isoformat()}."
                )
                risk_score += 45
                hard_reject = True

        for document in document_bundle.documents:
            normalized_type = document.document_type.strip().lower()
            if normalized_type in IDENTITY_DOCUMENT_TYPES:
                continue
            if document.expiration_date and document.expiration_date < reference_date:
                reasoning.append(
                    f"Supporting document '{normalized_type}' expired on {document.expiration_date.isoformat()} relative to review date {reference_date.isoformat()}."
                )
                risk_score += 12
                review_required = True

        residence = (profile.country_of_residence or "").strip().lower()
        if residence in self.settings.high_risk_residence_countries:
            reasoning.append(
                f"Country of residence '{profile.country_of_residence}' matches the configured high-risk sanctions list."
            )
            risk_score += 30
            review_required = True

        if profile.pep_status is True:
            reasoning.append("PEP status is true and requires enhanced due diligence.")
            risk_score += 25
            review_required = True

        if profile.risk_watchlist_match is True:
            reasoning.append("Risk watchlist match is true and triggers hard rejection.")
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
            reasoning.append("All required profile and document checks passed without exceptions.")

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
        payload = {
            "profile": profile.model_dump(mode="json"),
            "documents": document_bundle.model_dump(mode="json"),
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
