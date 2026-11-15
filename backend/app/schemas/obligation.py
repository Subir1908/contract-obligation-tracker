from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ObligationBase(BaseModel):
    description: str
    responsible_party: Optional[str] = None
    due_date: Optional[date] = None
    monetary_value: Optional[float] = None
    currency: Optional[str] = None
    late_penalty: Optional[str] = None
    source_clause: Optional[str] = None

class ObligationCreate(ObligationBase):
    contract_id: int

class ObligationUpdate(BaseModel):
    description: Optional[str] = None
    responsible_party: Optional[str] = None
    due_date: Optional[date] = None
    monetary_value: Optional[float] = None
    currency: Optional[str] = None
    late_penalty: Optional[str] = None
    source_clause: Optional[str] = None
    verification_status: Optional[str] = None

class ObligationResponse(ObligationBase):
    obligation_id: int
    contract_id: int
    verification_status: str
    deadline_status: str
    risk_level: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
