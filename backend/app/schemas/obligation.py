import math
import re
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator
from pydantic.alias_generators import to_camel

_CTRL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HTML_TAG_RE = re.compile(r"<[^>]*>")


def _sanitize_text(val: Optional[str], max_len: int = 2000) -> Optional[str]:
    if val is None:
        return None
    cleaned = _CTRL_CHARS_RE.sub("", val)
    cleaned = _HTML_TAG_RE.sub("", cleaned).strip()
    return cleaned[:max_len]


class ObligationBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    description: str = Field(..., min_length=1, max_length=2000)
    responsible_party: Optional[str] = Field(None, max_length=255)
    due_date: Optional[date] = None
    monetary_value: Optional[float] = Field(0.0, ge=0)
    currency: Optional[str] = Field("INR", max_length=10)
    late_penalty: Optional[str] = Field("None", max_length=1000)
    source_clause: Optional[str] = Field(None, max_length=4000)
    category: Optional[str] = Field("Deliverable", max_length=64)

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: str) -> str:
        cleaned = _sanitize_text(v, 2000)
        if not cleaned:
            raise ValueError("Description cannot be empty.")
        return cleaned

    @field_validator("responsible_party", "late_penalty", "category", "currency")
    @classmethod
    def clean_short_fields(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 500)

    @field_validator("source_clause")
    @classmethod
    def clean_source_clause(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 4000)

    @field_validator("monetary_value")
    @classmethod
    def validate_monetary_value(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return 0.0
        if math.isnan(v) or math.isinf(v) or v < 0:
            raise ValueError("Monetary value must be a non-negative finite number.")
        return round(v, 2)


class ObligationCreate(ObligationBase):
    contract_id: int = Field(..., gt=0)


class ObligationUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    responsible_party: Optional[str] = Field(None, max_length=255)
    due_date: Optional[date] = None
    monetary_value: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=10)
    late_penalty: Optional[str] = Field(None, max_length=1000)
    source_clause: Optional[str] = Field(None, max_length=4000)
    category: Optional[str] = Field(None, max_length=64)
    verification_status: Optional[Literal["PENDING", "VERIFIED", "UNVERIFIED"]] = None

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = _sanitize_text(v, 2000)
        if not cleaned:
            raise ValueError("Description cannot be empty.")
        return cleaned

    @field_validator("responsible_party", "late_penalty", "category", "currency")
    @classmethod
    def clean_short_fields(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 500)

    @field_validator("source_clause")
    @classmethod
    def clean_source_clause(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 4000)

    @field_validator("monetary_value")
    @classmethod
    def validate_monetary_value(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return None
        if math.isnan(v) or math.isinf(v) or v < 0:
            raise ValueError("Monetary value must be a non-negative finite number.")
        return round(v, 2)


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
