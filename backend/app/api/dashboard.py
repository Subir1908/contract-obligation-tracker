from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.contract import Contract
from app.models.obligation import Obligation
from app.schemas.dashboard import DashboardSummary, DeadlineStats, RiskStats

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-5.3 & FR-7.2: Real-time dashboard summaries for deadlines, risk distributions,
    and financial exposure.
    """
    contracts = db.query(Contract).filter(Contract.user_id == current_user.user_id).all()
    contract_ids = [c.contract_id for c in contracts]

    if not contract_ids:
        return DashboardSummary(
            total_contracts=0,
            total_obligations=0,
            deadline_stats=DeadlineStats(),
            risk_stats=RiskStats(),
            total_exposure_by_currency={},
            urgent_obligations=[]
        )

    obligations = db.query(Obligation).filter(Obligation.contract_id.in_(contract_ids)).all()

    dl_counts = {"UPCOMING": 0, "DUE_TODAY": 0, "OVERDUE": 0}
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    exposure = defaultdict(float)

    urgent_items = []

    for ob in obligations:
        if ob.deadline_status in dl_counts:
            dl_counts[ob.deadline_status] += 1
        if ob.risk_level in risk_counts:
            risk_counts[ob.risk_level] += 1
            
        if ob.monetary_value:
            curr = (ob.currency or "USD").upper()
            exposure[curr] += ob.monetary_value

        if ob.deadline_status == "OVERDUE" or ob.risk_level == "HIGH":
            urgent_items.append(ob)

    # Sort urgent items: overdue first, then by due date
    urgent_items.sort(key=lambda x: (0 if x.deadline_status == "OVERDUE" else 1, x.due_date or x.created_at.date()))

    return DashboardSummary(
        total_contracts=len(contracts),
        total_obligations=len(obligations),
        deadline_stats=DeadlineStats(
            upcoming=dl_counts["UPCOMING"],
            due_today=dl_counts["DUE_TODAY"],
            overdue=dl_counts["OVERDUE"]
        ),
        risk_stats=RiskStats(
            low=risk_counts["LOW"],
            medium=risk_counts["MEDIUM"],
            high=risk_counts["HIGH"]
        ),
        total_exposure_by_currency=dict(exposure),
        urgent_obligations=urgent_items[:10]  # top 10 urgent
    )
