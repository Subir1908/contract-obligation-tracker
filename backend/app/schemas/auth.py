from pydantic import BaseModel, Field, ConfigDict, computed_field
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$", description="User email address")
    password: str = Field(..., min_length=4, description="User password (min 4 chars)")
    name: Optional[str] = "User"
    organization: Optional[str] = "Tezpur University Legal Cell"
    role: Optional[str] = "ADMIN_LEGAL_OFFICER"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    access_token: str
    token_type: str = "bearer"
    user_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    token_expires_at: Optional[int] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    user_id: int
    email: str
    name: Optional[str] = ""
    organization: Optional[str] = "Tezpur University Legal Cell"
    role: Optional[str] = "ADMIN_LEGAL_OFFICER"
    created_at: datetime

    @computed_field
    def userId(self) -> str:
        return f"usr-{self.user_id}"
