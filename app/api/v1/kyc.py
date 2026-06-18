from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.kyc_agent import CustomerNotFoundError, get_kyc_review_agent
from app.core.database import get_db
from app.models.kyc import KYCReview
from app.schemas.kyc import KYCReviewRecord, KYCReviewResponse


router = APIRouter(prefix="/kyc", tags=["kyc"])


@router.post("/review/{customer_id}", response_model=KYCReviewResponse)
async def review_customer_kyc(customer_id: str, db: Session = Depends(get_db)) -> KYCReviewResponse:
    agent = get_kyc_review_agent()

    try:
        execution = await agent.review_customer(customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Required KYC data file is missing: {exc.filename}",
        ) from exc

    review = KYCReview(
        customer_id=execution.customer_id,
        full_name=execution.full_name,
        risk_score=execution.result.risk_score,
        confidence_score=execution.result.confidence,
        decision=execution.result.decision.value,
        reasoning=execution.result.reasoning,
        missing_documents=execution.result.missing_documents,
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(review)
    db.commit()

    return execution.result


@router.get("/reviews", response_model=list[KYCReviewRecord])
def list_kyc_reviews(db: Session = Depends(get_db)) -> list[KYCReviewRecord]:
    statement = select(KYCReview).order_by(KYCReview.reviewed_at.desc())
    reviews = db.scalars(statement).all()
    return [KYCReviewRecord.model_validate(review) for review in reviews]
