from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


def _split_csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_reference_date(raw_value: str | None) -> date:
    if raw_value:
        return date.fromisoformat(raw_value)
    return date.today()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Tiqmo AI Intelligence Layer")
    environment: str = os.getenv("ENVIRONMENT", "development")
    api_v1_prefix: str = "/api/v1"
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_hours: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/tiqmo_kyc_reviews.db")
    admin_email: str | None = os.getenv("ADMIN_EMAIL")
    admin_password: str | None = os.getenv("ADMIN_PASSWORD")
    cors_origins: list[str] = None  # type: ignore[assignment]
    reference_date: date = None  # type: ignore[assignment]
    data_root: Path = ROOT_DIR / "data" / "kyc"
    kyc_dataset_path: Path = ROOT_DIR / "kyc_dataset.csv"
    merchant_dataset_path: Path = ROOT_DIR / "merchant_dataset.csv"
    frontend_dist_path: Path = ROOT_DIR / "frontend" / "dist"
    required_profile_fields: tuple[str, ...] = (
        "full_name",
        "date_of_birth",
        "country_of_residence",
        "nationality",
        "phone",
    )
    required_document_types: tuple[str, ...] = ("identity_document",)
    high_risk_residence_countries: tuple[str, ...] = ("iran", "north korea")
    high_risk_nationality_countries: tuple[str, ...] = ("yemen", "syria", "sudan", "iran", "north korea")

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "cors_origins",
            _split_csv(
                os.getenv("CORS_ORIGINS"),
                ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
            ),
        )
        object.__setattr__(self, "reference_date", _parse_reference_date(os.getenv("KYC_REFERENCE_DATE")))

    @property
    def groq_enabled(self) -> bool:
        return bool(self.groq_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
