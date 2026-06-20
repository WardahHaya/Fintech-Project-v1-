from __future__ import annotations

from pydantic import EmailStr, Field

from app.schemas.kyc import SchemaModel
from app.schemas.user import UserRole


class LoginRequest(SchemaModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponse(SchemaModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str
