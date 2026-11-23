from datetime import date
from typing import Optional

def calculate_deadline_status(due_date: Optional[date]) -> str:
    """
    Computes real-time timeline urgency:
    - OVERDUE: due_date < today
    - DUE_TODAY: due_date == today
    - UPCOMING: due_date > today
    - NONE: due_date is None
    """
    if not due_date:
        return "NONE"
    
    today = date.today()
    if due_date < today:
        return "OVERDUE"
    elif due_date == today:
        return "DUE_TODAY"
    else:
        return "UPCOMING"
