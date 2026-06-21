from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.merchant_agent import MerchantNotFoundError, get_merchant_review_agent
from app.core.database import get_db
from app.core.security import require_admin
from app.models.merchant import MerchantReview
from app.models.user import User
from app.schemas.merchant import MerchantReviewRecord, MerchantReviewResponse


router = APIRouter(prefix="/merchant", tags=["merchant"])


@router.post("/review/{merchant_id}", response_model=MerchantReviewResponse)
async def review_merchant(
    merchant_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
) -> MerchantReviewResponse:
    agent = get_merchant_review_agent()

    try:
        execution = await agent.review_merchant(merchant_id)
    except MerchantNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Required merchant data file is missing: {exc.filename}",
        ) from exc

    review = MerchantReview(
        merchant_id=execution.merchant_id,
        business_name=execution.business_name,
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


@router.get("/reviews", response_model=list[MerchantReviewRecord])
def list_merchant_reviews(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
) -> list[MerchantReviewRecord]:
    statement = select(MerchantReview).order_by(MerchantReview.reviewed_at.desc())
    reviews = db.scalars(statement).all()
    return [MerchantReviewRecord.model_validate(review) for review in reviews]
