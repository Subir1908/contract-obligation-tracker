import re
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator
from pydantic.alias_generators import to_camel

_CTRL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HTML_TAG_RE = re.compile(r"<[^>]*>")


def _clean_str(val: Optional[str], max_len: int = 255) -> Optional[str]:
    if val is None:
        return None
    cleaned = _CTRL_CHARS_RE.sub("", val)
    cleaned = _HTML_TAG_RE.sub("", cleaned).strip()
    return cleaned[:max_len]


class UserRegister(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$", max_length=255, description="User email address")
    phone: Optional[str] = Field(None, max_length=30, description="Optional phone number for OTP recovery")
    password: str = Field(..., min_length=4, max_length=128, description="User password (min 4 chars)")
    name: Optional[str] = Field("User", max_length=150)
    organization: Optional[str] = Field("Tezpur University Legal Cell", max_length=200)
    role: Optional[Literal["ADMIN_LEGAL_OFFICER", "DEPARTMENT_MANAGER", "ACADEMIC_EVALUATOR"]] = "ADMIN_LEGAL_OFFICER"

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return (_clean_str(str(v), 255) or "").lower()

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"[^\d+\-\s()]", "", v).strip()
        return cleaned[:30] if cleaned else None

    @field_validator("name", "organization")
    @classmethod
    def clean_profile_text(cls, v: Optional[str]) -> Optional[str]:
        return _clean_str(v, 200)


class UserLogin(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return (_clean_str(str(v), 255) or "").lower()


class ForgotPasswordOtpRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=255, description="Registered email address or phone number")

    @field_validator("identifier")
    @classmethod
    def clean_identifier(cls, v: str) -> str:
        cleaned = _clean_str(v, 255)
        if not cleaned or len(cleaned) < 3:
            raise ValueError("Valid email address or phone number is required.")
        return cleaned


class ForgotPasswordVerifyOtpRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=255, description="Registered email address or phone number")
    otp: str = Field(..., min_length=4, max_length=8, description="6-digit OTP code")

    @field_validator("identifier")
    @classmethod
    def clean_identifier(cls, v: str) -> str:
        return _clean_str(v, 255) or ""

    @field_validator("otp")
    @classmethod
    def clean_otp(cls, v: str) -> str:
        return re.sub(r"\D", "", v)[:8]


class ForgotPasswordResetRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    identifier: str = Field(..., min_length=3, max_length=255, description="Registered email address or phone number")
    otp: str = Field(..., min_length=4, max_length=8, description="6-digit OTP code")
    new_password: str = Field(..., min_length=4, max_length=128, description="New password (min 4 chars)")

    @field_validator("identifier")
    @classmethod
    def clean_identifier(cls, v: str) -> str:
        return _clean_str(v, 255) or ""

    @field_validator("otp")
    @classmethod
    def clean_otp(cls, v: str) -> str:
        return re.sub(r"\D", "", v)[:8]


class Token(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    access_token: str
    token_type: str = "bearer"
    user_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    token_expires_at: Optional[int] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    user_id: int
    email: str
    phone: Optional[str] = None
    name: Optional[str] = ""
    organization: Optional[str] = "Tezpur University Legal Cell"
    role: Optional[str] = "ADMIN_LEGAL_OFFICER"
    created_at: datetime

    @computed_field
    def userId(self) -> str:
        return f"usr-{self.user_id}"
