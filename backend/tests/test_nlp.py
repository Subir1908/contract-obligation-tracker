import sys
import os
import time
from datetime import date, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.nlp.extractor import extract_obligations
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


def test_filters_boilerplate_and_negations():
    sample_text = (
        "1.1 This Agreement shall be governed by and construed in accordance with the laws of India.\n"
        "1.2 The headings are for convenience only and shall not affect interpretation.\n"
        "1.3 The Receiving Party shall not disclose any Confidential Information to third parties.\n"
        "2.1 The Vendor shall deliver the compiled source code repository by December 15, 2026."
    )
    results = extract_obligations(sample_text)
    assert len(results) == 1
    assert results[0].responsible_party == "Vendor"
    assert results[0].due_date == date(2026, 12, 15)


def test_corporate_entity_and_indian_currency_extraction():
    sample_text = (
        "4.1 TechNova Solutions Pvt. Ltd. shall complete the cloud security audit within 15 days "
        "for ₹2,50,000, subject to a late penalty of 2% per week of delay.\n"
        "4.2 The Client agrees to pay 1.5 Lakhs INR on or before December 20, 2026."
    )
    results = extract_obligations(sample_text)
    assert len(results) == 2

    first = results[0]
    assert first.responsible_party == "TechNova Solutions Pvt. Ltd."
    assert first.due_date == date.today() + timedelta(days=15)
    assert first.monetary_value == 250000.0
    assert first.currency == "INR"
    assert first.late_penalty is not None
    assert "2% per week" in first.late_penalty

    second = results[1]
    assert second.responsible_party == "Client"
    assert second.due_date == date(2026, 12, 20)
    assert second.monetary_value == 150000.0
    assert second.currency == "INR"
    assert second.late_penalty is None


def test_usd_and_liquidated_damages_extraction():
    sample_text = (
        "7.2 Acme Systems Inc. must deploy the production database cluster no later than 2026-11-30 "
        "for $12,500.00, failing which liquidated damages of $500 per day shall apply."
    )
    results = extract_obligations(sample_text)
    assert len(results) == 1
    item = results[0]
    assert item.responsible_party == "Acme Systems Inc."
    assert item.due_date == date(2026, 11, 30)
    assert item.monetary_value == 12500.0
    assert item.currency == "USD"
    assert item.late_penalty is not None
    assert "liquidated damages of $500 per day" in item.late_penalty


def test_latency_requirement_under_1500ms_per_page():
    clause = (
        "3.1 The Service Provider shall submit the monthly SLA uptime report by December 31, 2026 "
        "for $5,000, subject to a penalty of 5% for late submission.\n"
    )
    one_page_contract = clause * 20

    start = time.perf_counter()
    results = extract_obligations(one_page_contract)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert len(results) == 20
    assert elapsed_ms < 1500, f"Expected less than 1500ms per page, took {elapsed_ms:.1f}ms"