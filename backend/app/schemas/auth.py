from pydantic import BaseModel, Field, ConfigDict, computed_field
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$", description="User email address")
    phone: Optional[str] = Field(None, description="Optional phone number for OTP recovery")
    password: str = Field(..., min_length=4, description="User password (min 4 chars)")
    name: Optional[str] = "User"
    organization: Optional[str] = "Tezpur University Legal Cell"
    role: Optional[str] = "ADMIN_LEGAL_OFFICER"

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordOtpRequest(BaseModel):
    identifier: str = Field(..., min_length=3, description="Registered email address or phone number")

class ForgotPasswordVerifyOtpRequest(BaseModel):
    identifier: str = Field(..., min_length=3, description="Registered email address or phone number")
    otp: str = Field(..., min_length=4, max_length=8, description="6-digit OTP code")

class ForgotPasswordResetRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    identifier: str = Field(..., min_length=3, description="Registered email address or phone number")
    otp: str = Field(..., min_length=4, max_length=8, description="6-digit OTP code")
    new_password: str = Field(..., min_length=4, description="New password (min 4 chars)")

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
