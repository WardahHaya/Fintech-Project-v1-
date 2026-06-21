from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.compliance_agent import get_compliance_agent
from app.core.database import get_db
from app.core.security import require_admin
from app.models.compliance import ComplianceQuery
from app.models.user import User
from app.rag import get_compliance_bootstrap_error, is_compliance_ready
from app.schemas.compliance import ComplianceQueryRecord, ComplianceQueryRequest, ComplianceQueryResponse


router = APIRouter(prefix="/compliance", tags=["compliance"])


def require_compliance_ready() -> None:
    if is_compliance_ready():
        return

    bootstrap_error = get_compliance_bootstrap_error()
    if bootstrap_error:
        detail = f"Compliance engine failed to initialize: {bootstrap_error}"
    else:
        detail = "Compliance engine is still initializing. Please retry in a moment."

    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


@router.post("/query", response_model=ComplianceQueryResponse)
async def query_compliance(
    payload: ComplianceQueryRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
    _ready: None = Depends(require_compliance_ready),
) -> ComplianceQueryResponse:
    agent = get_compliance_agent()
    execution = await agent.answer_query(payload.query, db)
    return execution.response


@router.get("/history", response_model=list[ComplianceQueryRecord])
def list_compliance_history(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
    _ready: None = Depends(require_compliance_ready),
) -> list[ComplianceQueryRecord]:
    statement = select(ComplianceQuery).order_by(ComplianceQuery.queried_at.desc())
    records = db.scalars(statement).all()
    return [ComplianceQueryRecord.model_validate(record) for record in records]
