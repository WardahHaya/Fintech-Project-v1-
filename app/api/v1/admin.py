from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, require_admin
from app.models.user import User
from app.schemas.user import StaffCreateRequest, StaffUpdateRequest, UserProfile, UserRole


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[UserProfile])
def list_users(db: Session = Depends(get_db)) -> list[UserProfile]:
    statement = select(User).order_by(User.created_at.desc())
    users = db.scalars(statement).all()
    return [UserProfile.model_validate(user) for user in users]


@router.post("/users", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def create_user(payload: StaffCreateRequest, db: Session = Depends(get_db)) -> UserProfile:
    normalized_email = payload.email.strip().lower()
    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user = User(
        email=normalized_email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role.value,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfile.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserProfile)
def update_user(user_id: str, payload: StaffUpdateRequest, db: Session = Depends(get_db)) -> UserProfile:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    demotes_admin = (
        user.role == UserRole.ADMIN.value
        and payload.role is not None
        and payload.role != UserRole.ADMIN
    )
    deactivates_admin = (
        user.role == UserRole.ADMIN.value
        and user.is_active
        and payload.is_active is False
    )
    if demotes_admin or deactivates_admin:
        locked_admins = db.scalars(
            select(User)
            .where(User.role == UserRole.ADMIN.value, User.is_active.is_(True))
            .with_for_update()
        ).all()
        if len(locked_admins) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last active admin account.",
            )

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.role is not None:
        user.role = payload.role.value
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfile.model_validate(user)
