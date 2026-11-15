from typing import Optional

def calculate_risk_level(monetary_value: Optional[float], late_penalty: Optional[str], deadline_status: str = "UPCOMING") -> str:
    """
    Computes an automated risk severity tag (Low, Medium, High)
    based on monetary exposure and presence of late penalty clauses.
    """
    has_penalty = bool(late_penalty and late_penalty.strip())
    amount = monetary_value if monetary_value is not None else 0.0

    # High Risk conditions:
    # 1. Overdue with late penalty or high amount
    # 2. Strict late penalty clause AND substantial amount (>= $5,000 / Rs. 250,000)
    # 3. High financial exposure (>= $10,000 / Rs. 500,000)
    if deadline_status == "OVERDUE" and (has_penalty or amount > 1000):
        return "HIGH"
    if has_penalty and amount >= 5000:
        return "HIGH"
    if amount >= 10000:
        return "HIGH"

    # Medium Risk conditions:
    # 1. Has late penalty clause
    # 2. Moderate monetary exposure ($1,000 - $10,000)
    # 3. Overdue even without penalty
    if has_penalty or (amount >= 1000) or deadline_status == "OVERDUE":
        return "MEDIUM"

    # Low Risk: Standard operational tasks with low/no monetary penalty
    return "LOW"
