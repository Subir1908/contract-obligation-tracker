import sys
import os
from datetime import date, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.nlp.extractor import extract_obligations
except ImportError:
    from nlp.extractor import extract_obligations
from app.services.deadline_tracker import calculate_deadline_status
from app.services.risk_scorer import calculate_risk_level

def test_extract_obligations_basic():
    clause = (
        "The Contractor shall deliver the final software build on or before December 31, 2026. "
        "The Client will pay a milestone fee of $15,000 within 30 days. "
        "Any delay will incur a penalty of 1% per day of delay."
    )
    items = extract_obligations(clause)
    assert len(items) >= 1
    
    # Check contractor obligation
    contractor_item = next((item for item in items if "Contractor" in (item.responsible_party or "")), None)
    assert contractor_item is not None
    assert contractor_item.due_date == date(2026, 12, 31)

def test_extract_monetary_and_penalty():
    clause = "The Vendor must complete server migration by 2026-10-15 and shall receive €50,000, subject to a penalty of $500 per day for delay."
    items = extract_obligations(clause)
    assert len(items) >= 1
    item = items[0]
    assert item.monetary_value == 50000.0
    assert item.currency == "EUR"
    assert item.late_penalty is not None
    assert "penalty" in item.late_penalty.lower()

def test_deadline_status():
    today = date.today()
    past = today - timedelta(days=5)
    future = today + timedelta(days=5)
    
    assert calculate_deadline_status(past) == "OVERDUE"
    assert calculate_deadline_status(today) == "DUE_TODAY"
    assert calculate_deadline_status(future) == "UPCOMING"
    assert calculate_deadline_status(None) == "NONE"

def test_risk_scorer():
    assert calculate_risk_level(20000.0, "penalty of $500/day", "UPCOMING") == "HIGH"
    assert calculate_risk_level(500.0, None, "OVERDUE") == "MEDIUM"
    assert calculate_risk_level(200.0, None, "UPCOMING") == "LOW"
