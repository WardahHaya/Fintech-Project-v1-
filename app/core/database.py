from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def _ensure_sqlite_directory(database_url: str) -> None:
    if not database_url.startswith("sqlite:///"):
        return
    raw_path = database_url.replace("sqlite:///", "", 1)
    database_path = Path(raw_path)
    if not database_path.is_absolute():
        database_path = Path.cwd() / database_path
    database_path.parent.mkdir(parents=True, exist_ok=True)


class Base(DeclarativeBase):
    pass


settings = get_settings()
normalized_database_url = _normalize_database_url(settings.database_url)
_ensure_sqlite_directory(normalized_database_url)

engine = create_engine(
    normalized_database_url,
    connect_args={"check_same_thread": False} if normalized_database_url.startswith("sqlite") else {},
    pool_pre_ping=not normalized_database_url.startswith("sqlite"),
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    init_database()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_database() -> None:
    from app.models.kyc import KYCReview

    Base.metadata.create_all(bind=engine)
