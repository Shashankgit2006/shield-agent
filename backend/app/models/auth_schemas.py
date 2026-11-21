"""
Pydantic Request and Response Schemas for Authentication.
Enforces strict input validation on passwords, emails, and tokens.
"""

from typing import Optional
from datetime import datetime
import re
from pydantic import BaseModel, Field, field_validator, ConfigDict

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_str(v: str) -> str:
    clean = v.strip().lower()
    if not EMAIL_REGEX.match(clean):
        raise ValueError("Invalid email address format.")
    return clean

class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: str = Field(..., description="Valid corporate or personal email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password minimum 8 characters")
    confirm_password: str = Field(..., description="Confirmation matching password")

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str):
        return validate_email_str(v)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match.")
        return v

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class UserLoginRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str):
        return validate_email_str(v)


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str):
        return validate_email_str(v)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Password reset verification token")
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match.")
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    created_at: datetime
    is_active: bool


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    status: str
    message: str
    dev_reset_token: Optional[str] = None
