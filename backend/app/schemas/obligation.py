from pydantic import BaseModel, ConfigDict, computed_field
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import date, datetime

class ObligationBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    description: str
    responsible_party: Optional[str] = None
    due_date: Optional[date] = None
    monetary_value: Optional[float] = 0.0
    currency: Optional[str] = "INR"
    late_penalty: Optional[str] = "None"
    source_clause: Optional[str] = None
    category: Optional[str] = "Deliverable"

class ObligationCreate(ObligationBase):
    contract_id: int

class ObligationUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    description: Optional[str] = None
    responsible_party: Optional[str] = None
    due_date: Optional[date] = None
    monetary_value: Optional[float] = None
    currency: Optional[str] = None
    late_penalty: Optional[str] = None
    source_clause: Optional[str] = None
    category: Optional[str] = None
    verification_status: Optional[str] = None

class ObligationResponse(ObligationBase):
    obligation_id: int
    contract_id: int
    verification_status: str
    deadline_status: str
    risk_level: str
    created_at: datetime
    updated_at: datetime

    @computed_field
    def id(self) -> str:
        return f"ob-{self.obligation_id}"
