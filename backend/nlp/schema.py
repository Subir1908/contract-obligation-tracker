from dataclasses import dataclass
from typing import Optional
from datetime import date

@dataclass
class ExtractedObligationItem:
    description: str
    responsible_party: Optional[str]
    due_date: Optional[date]
    monetary_value: Optional[float]
    currency: Optional[str]
    late_penalty: Optional[str]
    source_clause: str
