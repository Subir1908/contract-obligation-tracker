from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class ExtractedObligationItem(BaseModel):
    description: str = Field(..., description="Concise summary of the core action or deliverable required")
    responsible_party: str = Field(default="Unspecified Party", description="Entity or role bound by the obligation")
    due_date: Optional[date] = Field(default=None, description="Normalized Python date object (YYYY-MM-DD)")
    monetary_value: Optional[float] = Field(default=None, description="Numeric financial value if present")
    currency: Optional[str] = Field(default="USD", description="Currency code (USD, INR, EUR, GBP)")
    late_penalty: Optional[str] = Field(default=None, description="Extracted penalty, interest, or liquidated damages clause")
    source_clause: str = Field(..., description="Exact verbatim sentence/clause from the contract")