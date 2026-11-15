from pydantic import BaseModel
from typing import List, Dict
from app.schemas.obligation import ObligationResponse

class DeadlineStats(BaseModel):
    upcoming: int = 0
    due_today: int = 0
    overdue: int = 0

class RiskStats(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0

class DashboardSummary(BaseModel):
    total_contracts: int
    total_obligations: int
    deadline_stats: DeadlineStats
    risk_stats: RiskStats
    total_exposure_by_currency: Dict[str, float]
    urgent_obligations: List[ObligationResponse]
