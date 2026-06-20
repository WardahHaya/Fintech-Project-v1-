from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.compliance_agent import get_compliance_agent
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.compliance import ComplianceQuery
from app.models.user import User
from app.schemas.compliance import ComplianceQueryRecord, ComplianceQueryRequest, ComplianceQueryResponse


router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.post("/query", response_model=ComplianceQueryResponse)
async def query_compliance(
    payload: ComplianceQueryRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> ComplianceQueryResponse:
    agent = get_compliance_agent()
    execution = await agent.answer_query(payload.query, db)
    return execution.response


@router.get("/history", response_model=list[ComplianceQueryRecord])
def list_compliance_history(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[ComplianceQueryRecord]:
    statement = select(ComplianceQuery).order_by(ComplianceQuery.queried_at.desc())
    records = db.scalars(statement).all()
    return [ComplianceQueryRecord.model_validate(record) for record in records]
