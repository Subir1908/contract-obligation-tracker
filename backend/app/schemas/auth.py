from pydantic import BaseModel, Field
from datetime import datetime

class UserRegister(BaseModel):
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$", description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    user_id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
