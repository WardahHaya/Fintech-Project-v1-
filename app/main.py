from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.kyc import router as kyc_router
from app.api.v1.merchant import router as merchant_router
from app.core.config import get_settings
from app.core.database import init_database
from app.rag import bootstrap_compliance_retriever


settings = get_settings()
frontend_dist_path = settings.frontend_dist_path


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    bootstrap_compliance_retriever()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.(replit\.app|replit\.dev)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(kyc_router, prefix=settings.api_v1_prefix)
app.include_router(compliance_router, prefix=settings.api_v1_prefix)
app.include_router(merchant_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


def _resolve_frontend_asset(full_path: str) -> Path | None:
    if not frontend_dist_path.exists():
        return None

    candidate = (frontend_dist_path / full_path).resolve()
    try:
        candidate.relative_to(frontend_dist_path.resolve())
    except ValueError:
        return None

    if candidate.is_file():
        return candidate
    return None


def _frontend_index_response() -> FileResponse:
    index_path = frontend_dist_path / "index.html"
    if not index_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Frontend build not found. Build the React app before serving the full-stack bundle.",
        )
    return FileResponse(index_path)


@app.get("/", include_in_schema=False)
async def serve_frontend_root() -> FileResponse:
    return _frontend_index_response()


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend_app(full_path: str) -> FileResponse:
    if full_path.startswith("api/") or full_path == "health":
        raise HTTPException(status_code=404, detail="Not Found")

    asset_path = _resolve_frontend_asset(full_path)
    if asset_path is not None:
        return FileResponse(asset_path)

    return _frontend_index_response()
