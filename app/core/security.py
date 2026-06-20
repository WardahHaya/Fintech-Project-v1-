from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(*, user: User) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.access_token_expire_hours)
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Authentication credentials were not provided.")

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise _unauthorized("Invalid or expired access token.") from exc

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise _unauthorized("Invalid or expired access token.")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("The authenticated account is inactive or unavailable.")

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required for this operation.",
        )
    return current_user
