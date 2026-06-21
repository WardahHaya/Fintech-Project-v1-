from __future__ import annotations

import ast
import csv
import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TypedDict

from groq import Groq
from langgraph.graph import END, START, StateGraph

from app.core.config import get_settings
from app.schemas.merchant import MerchantDecision, MerchantReviewResponse


MERCHANT_DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "merchant" / "merchant_dataset.csv"
MERCHANT_GROQ_MODEL = "llama-3.3-70b-versatile"
SYSTEM_PROMPT = (
    "You are a SAMA-compliant merchant onboarding officer for Tiqmo. "
    "Explain the application decision clearly and professionally. "
    "Name any missing documents explicitly. "
    "Do not mention internal scoring thresholds."
)
REQUIRED_DOCS = {
    "food": ["cr_certificate", "municipal_license", "health_certificate", "owner_id"],
    "retail": ["cr_certificate", "municipal_license", "owner_id"],
    "restaurants": ["cr_certificate", "municipal_license", "health_certificate", "owner_id"],
    "services": ["cr_certificate", "owner_id", "vat_certificate"],
    "electronics": ["cr_certificate", "owner_id", "vat_certificate"],
    "healthcare": ["cr_certificate", "moh_license", "owner_id", "vat_certificate"],
    "transport": ["cr_certificate", "transport_license", "owner_id"],
    "education": ["cr_certificate", "moe_license", "owner_id"],
}
FLAG_SUMMARIES = {
    "incomplete_documentation": "required onboarding documents are still missing",
    "high_avg_transaction": "the expected average transaction size is elevated",
    "high_monthly_volume": "the projected monthly payment volume is elevated",
    "high_risk_category": "the merchant operates in a category that needs closer review",
    "suspicious_micro_transactions": "the transaction pattern suggests unusually frequent low-value payments",
    "invalid_cr_format": "the commercial registration number format is invalid",
}


class MerchantNotFoundError(Exception):
    """Raised when the merchant ID is not present in the CSV dataset."""


@dataclass(frozen=True)
class MerchantReviewExecution:
    merchant_id: str
    business_name: str
    result: MerchantReviewResponse


@dataclass(frozen=True)
class MerchantDatasetRecord:
    merchant_id: str
    business_name: str
    category: str
    cr_number: str | None
    owner_name: str | None
    owner_national_id: str | None
    registration_date: str | None
    city: str | None
    monthly_transaction_vol: float
    avg_transaction_value: float
    num_transactions_monthly: int
    missing_docs: tuple[str, ...]


class MerchantState(TypedDict, total=False):
    merchant_id: str
    record: MerchantDatasetRecord
    flags: list[str]
    missing_documents: list[str]
    risk_level: str
    risk_score: int
    decision: str
    confidence: float
    reasoning: list[str]
    result: MerchantReviewResponse


def _clean_string(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _parse_float(value: str | None) -> float:
    normalized = _clean_string(value)
    if normalized is None:
        return 0.0
    return float(normalized)


def _parse_int(value: str | None) -> int:
    normalized = _clean_string(value)
    if normalized is None:
        return 0
    return int(float(normalized))


def _parse_list(value: str | None) -> tuple[str, ...]:
    normalized = _clean_string(value)
    if normalized is None:
        return tuple()
    try:
        parsed = ast.literal_eval(normalized)
    except (ValueError, SyntaxError):
        return tuple()
    if not isinstance(parsed, list):
        return tuple()
    return tuple(str(item).strip().lower() for item in parsed if str(item).strip())


def _normalize_reasoning_content(content: str) -> list[str]:
    stripped = content.strip()
    if stripped.startswith("```") and stripped.endswith("```"):
        stripped = stripped.strip("`").strip()
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()

    while stripped.startswith(("* ", "- ", "• ")):
        stripped = stripped[2:].strip()

    if not stripped:
        return []

    if stripped.startswith("[") and stripped.endswith("]"):
        body = stripped[1:-1].strip()
        if body.startswith('"') and body.endswith('"'):
            normalized = body[1:-1].encode("utf-8").decode("unicode_escape").strip()
            return [normalized] if normalized else []

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        try:
            parsed = ast.literal_eval(stripped)
        except (ValueError, SyntaxError):
            return [stripped]

    if isinstance(parsed, str):
        return [parsed.strip()] if parsed.strip() else []
    if isinstance(parsed, list):
        normalized = [str(item).strip() for item in parsed if str(item).strip()]
        return normalized

    return [stripped]


@lru_cache
def _load_merchant_dataset(dataset_path: str) -> dict[str, MerchantDatasetRecord]:
    records: dict[str, MerchantDatasetRecord] = {}
    with open(dataset_path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            merchant_id = (row.get("merchant_id") or "").strip()
            if not merchant_id:
                continue
            record = MerchantDatasetRecord(
                merchant_id=merchant_id,
                business_name=_clean_string(row.get("business_name_en")) or "Unknown Merchant",
                category=(_clean_string(row.get("category")) or "").lower(),
                cr_number=_clean_string(row.get("cr_number")),
                owner_name=_clean_string(row.get("owner_name")),
                owner_national_id=_clean_string(row.get("owner_national_id")),
                registration_date=_clean_string(row.get("registration_date")),
                city=_clean_string(row.get("city")),
                monthly_transaction_vol=_parse_float(row.get("monthly_transaction_vol")),
                avg_transaction_value=_parse_float(row.get("avg_transaction_value")),
                num_transactions_monthly=_parse_int(row.get("num_transactions_monthly")),
                missing_docs=_parse_list(row.get("missing_docs")),
            )
            records[merchant_id] = record
    return records


class MerchantOnboardingAgent:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = (
            Groq(api_key=self.settings.groq_api_key, timeout=20.0, max_retries=1)
            if self.settings.groq_enabled
            else None
        )
        self.graph = self._build_graph()

    def _load_record(self, state: MerchantState) -> MerchantState:
        records = _load_merchant_dataset(str(MERCHANT_DATASET_PATH))
        merchant_id = state["merchant_id"]
        record = records.get(merchant_id)
        if record is None:
            raise MerchantNotFoundError(
                f"Merchant '{merchant_id}' was not found in data/merchant/merchant_dataset.csv."
            )
        return {"record": record}

    def _evaluate_rules(self, state: MerchantState) -> MerchantState:
        record = state["record"]
        required_docs = REQUIRED_DOCS.get(record.category, [])
        missing_documents = [document for document in required_docs if document in set(record.missing_docs)]

        flags: list[str] = []
        if missing_documents:
            flags.append("incomplete_documentation")
        if record.avg_transaction_value > 5000:
            flags.append("high_avg_transaction")
        if record.monthly_transaction_vol > 100000:
            flags.append("high_monthly_volume")
        if record.category in {"transport", "services"}:
            flags.append("high_risk_category")
        if record.num_transactions_monthly > 300 and record.avg_transaction_value < 50:
            flags.append("suspicious_micro_transactions")
        if record.cr_number is None or re.fullmatch(r"\d{10}", record.cr_number) is None:
            flags.append("invalid_cr_format")

        if "incomplete_documentation" in flags or len(flags) >= 3:
            risk_level = "high"
        elif len(flags) >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"

        risk_score = max(0, 100 - (20 * len(flags)))

        if "incomplete_documentation" in flags or "invalid_cr_format" in flags:
            decision = MerchantDecision.REJECTED.value
        elif risk_level == "high" or (risk_level == "medium" and "high_risk_category" in flags):
            decision = MerchantDecision.ESCALATE.value
        else:
            decision = MerchantDecision.APPROVED.value

        if decision == MerchantDecision.REJECTED.value:
            confidence = 0.95
        elif decision == MerchantDecision.ESCALATE.value:
            confidence = 0.75
        else:
            confidence = min(1.0, 0.90 + (0.02 * (3 - len(flags))))

        return {
            "flags": flags,
            "missing_documents": missing_documents,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "decision": decision,
            "confidence": round(confidence, 2),
        }

    def _build_fallback_reasoning(self, state: MerchantState) -> list[str]:
        record = state["record"]
        decision = state["decision"]
        flags = state["flags"]
        missing_documents = state["missing_documents"]

        if decision == MerchantDecision.APPROVED.value:
            summary = (
                f"{record.business_name} can proceed because the submitted merchant profile did not trigger "
                "any onboarding concerns."
            )
            return [summary]

        status_text = {
            MerchantDecision.REJECTED.value: "cannot be approved yet",
            MerchantDecision.ESCALATE.value: "needs enhanced review before approval",
        }[decision]

        detail_parts = [FLAG_SUMMARIES[flag] for flag in flags if flag in FLAG_SUMMARIES and flag != "incomplete_documentation"]
        detail_sentence = ""
        if detail_parts:
            detail_sentence = " Additional review drivers include " + ", ".join(detail_parts) + "."

        missing_sentence = ""
        if missing_documents:
            missing_sentence = " Missing documents: " + ", ".join(missing_documents) + "."

        return [
            f"{record.business_name} {status_text} because {FLAG_SUMMARIES.get(flags[0], 'the submitted profile requires review')}."
            f"{missing_sentence}{detail_sentence}"
        ]

    def _generate_reasoning(self, state: MerchantState) -> MerchantState:
        record = state["record"]
        fallback_reasoning = self._build_fallback_reasoning(state)

        if self.client is None:
            return {"reasoning": fallback_reasoning}

        payload = {
            "merchant": {
                "merchant_id": record.merchant_id,
                "business_name": record.business_name,
                "category": record.category,
                "city": record.city,
                "cr_number": record.cr_number,
                "owner_name": record.owner_name,
                "owner_national_id": record.owner_national_id,
                "registration_date": record.registration_date,
                "monthly_transaction_vol": record.monthly_transaction_vol,
                "avg_transaction_value": record.avg_transaction_value,
                "num_transactions_monthly": record.num_transactions_monthly,
            },
            "decision": state["decision"],
            "risk_level": state["risk_level"],
            "flags": state["flags"],
            "missing_documents": state["missing_documents"],
        }

        try:
            response = self.client.chat.completions.create(
                model=MERCHANT_GROQ_MODEL,
                temperature=0,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            "Write one professional explanation for the merchant onboarding decision. "
                            "The output will be stored as a single string in a list.\n\n"
                            + json.dumps(payload, ensure_ascii=False)
                        ),
                    },
                ],
            )
            content = (response.choices[0].message.content or "").strip()
            normalized_reasoning = _normalize_reasoning_content(content)
            if normalized_reasoning:
                return {"reasoning": normalized_reasoning}
        except Exception:
            pass

        return {"reasoning": fallback_reasoning}

    def _finalize(self, state: MerchantState) -> MerchantState:
        result = MerchantReviewResponse(
            decision=state["decision"],
            risk_score=state["risk_score"],
            confidence=state["confidence"],
            reasoning=state["reasoning"],
            missing_documents=state["missing_documents"],
        )
        return {"result": result}

    def _build_graph(self):
        graph = StateGraph(MerchantState)
        graph.add_node("load_record", self._load_record)
        graph.add_node("evaluate_rules", self._evaluate_rules)
        graph.add_node("generate_reasoning", self._generate_reasoning)
        graph.add_node("finalize", self._finalize)
        graph.add_edge(START, "load_record")
        graph.add_edge("load_record", "evaluate_rules")
        graph.add_edge("evaluate_rules", "generate_reasoning")
        graph.add_edge("generate_reasoning", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    async def review_merchant(self, merchant_id: str) -> MerchantReviewExecution:
        result = await self.graph.ainvoke({"merchant_id": merchant_id})
        record = result["record"]
        return MerchantReviewExecution(
            merchant_id=record.merchant_id,
            business_name=record.business_name,
            result=result["result"],
        )


@lru_cache
def get_merchant_review_agent() -> MerchantOnboardingAgent:
    return MerchantOnboardingAgent()
