from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import ConfigDict, EmailStr, Field

from app.schemas.kyc import SchemaModel


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserProfile(SchemaModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class StaffCreateRequest(SchemaModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole


class StaffUpdateRequest(SchemaModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
