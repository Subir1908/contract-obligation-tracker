import re
from datetime import date, timedelta
from typing import List, Optional, Tuple
import dateparser
from dateutil import parser as date_parser

from app.nlp.schemas import ExtractedObligationItem
from app.nlp.classifier import nlp, segment_and_classify_clauses

# Known role descriptors in contracts
PARTY_ROLES = [
    "Service Provider", "Subcontractor", "Contractor", "Consultant",
    "Vendor", "Supplier", "Seller", "Client", "Customer", "Buyer",
    "Company", "Licensee", "Licensor", "Employer", "Employee",
    "Lessor", "Lessee", "Agency", "Partner", "Party A", "Party B"
]

CURRENCY_MAP = {
    "$": "USD", "USD": "USD", "DOLLARS": "USD", "DOLLAR": "USD",
    "₹": "INR", "INR": "INR", "RS.": "INR", "RS": "INR", "RUPEES": "INR",
    "€": "EUR", "EUR": "EUR", "EUROS": "EUR",
    "£": "GBP", "GBP": "GBP", "POUNDS": "GBP",
}

MULTIPLIERS = {
    "thousand": 1_000.0,
    "k": 1_000.0,
    "lakh": 100_000.0,
    "lakhs": 100_000.0,
    "lac": 100_000.0,
    "lacs": 100_000.0,
    "million": 1_000_000.0,
    "cr": 10_000_000.0,
    "crore": 10_000_000.0,
    "crores": 10_000_000.0,
    "billion": 1_000_000_000.0,
}


def extract_obligations(contract_text: str) -> List[ExtractedObligationItem]:
    """
    Hybrid spaCy + Rule-Based NLP Extraction Pipeline.
    Extracts the 5 core parameters for every actionable obligation clause:
      1. description
      2. responsible_party
      3. due_date
      4. monetary_value & currency
      5. late_penalty
      + source_clause
    """
    actionable_clauses = segment_and_classify_clauses(contract_text)
    extracted_items: List[ExtractedObligationItem] = []

    for clause in actionable_clauses:
        party = _extract_responsible_party(clause)
        due_date = _extract_due_date(clause)
        money, currency = _extract_monetary_value(clause)
        penalty = _extract_late_penalty(clause)
        description = _extract_description(clause)

        extracted_items.append(
            ExtractedObligationItem(
                description=description,
                responsible_party=party,
                due_date=due_date,
                monetary_value=money,
                currency=currency,
                late_penalty=penalty,
                source_clause=clause,
            )
        )

    return extracted_items


def _extract_responsible_party(clause: str) -> str:
    """
    4-tier extraction for Responsible Party:
    1. Corporate entity name in subject zone (e.g., 'TechNova Solutions Pvt. Ltd.', 'Acme Corp.').
    2. Explicit defined role keywords before the modal verb ('Vendor', 'Client', 'Contractor').
    3. spaCy dependency parsing (nominal subject 'nsubj') & ORG NER.
    4. Fallback role check anywhere in clause.
    """
    # Strip leading section numbers like "2.1 " or "(a) "
    cleaned = re.sub(r"^\s*(?:\d+(?:\.\d+)*\.?|\([a-zA-Z0-9]+\))\s+", "", clause)

    # Isolate the subject zone prior to the obligation modal verb
    modal_split = re.split(
        r"\b(?:shall|must|agrees?\s+to|undertakes?\s+to|is\s+required\s+to|is\s+obligated\s+to|covenants?\s+to|will)\b",
        cleaned,
        maxsplit=1,
        flags=re.IGNORECASE,
    )
    subject_zone = modal_split[0].strip() if len(modal_split) > 1 else cleaned

    # Tier 1: Corporate name pattern with legal suffix (Pvt. Ltd., Ltd., Inc., Corp., LLP, LLC)
    corp_match = re.search(
        r"\b([A-Z][A-Za-z0-9&,\s]{1,50}?\b(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|Ltd\.?|Limited|Inc\.?|Corp\.?|Corporation|LLC|LLP))(?=\s|$|,)",
        subject_zone,
    )
    if corp_match:
        return corp_match.group(1).strip()

    # Tier 2: Defined Role keyword in the subject zone
    for role in PARTY_ROLES:
        if re.search(rf"\b{re.escape(role)}\b", subject_zone, re.IGNORECASE):
            return role

    # Tier 3: spaCy ORG entity or clean subject phrase in subject_zone
    doc = nlp(subject_zone)
    for ent in doc.ents:
        if ent.label_ in ("ORG", "PERSON") and len(ent.text.strip()) > 2:
            return ent.text.strip()

    # If subject_zone itself is a short clean noun phrase (e.g. "The Service Provider", "Apex Systems")
    clean_subj = re.sub(r"^(?:The|Each|Both|Either)\s+", "", subject_zone, flags=re.IGNORECASE).strip(" ,.;:")
    if 2 < len(clean_subj) <= 45 and len(clean_subj.split()) <= 6:
        return clean_subj

    # Tier 4: Fallback role check anywhere in clause
    for role in PARTY_ROLES:
        if re.search(rf"\b{re.escape(role)}\b", cleaned, re.IGNORECASE):
            return role

    return "Contracting Party"


def _extract_due_date(clause: str) -> Optional[date]:
    """
    Extracts and normalizes both:
      1. Explicit calendar dates ('by December 31, 2026', '15/11/2026', '2026-12-01')
      2. Relative timeframes ('within 30 days', 'no later than 2 weeks', 'within 3 months')
    """
    today = date.today()

    # 1. Explicit date after deadline prepositions
    explicit_date_regex = (
        r"\b(?:by|before|on or before|no later than|due on|prior to|on|effective)\s+"
        r"("
        r"\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}"
        r"|[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}"
        r"|\d{4}-\d{2}-\d{2}"
        r"|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
        r")"
    )
    match = re.search(explicit_date_regex, clause, re.IGNORECASE)
    if match:
        parsed = _safe_parse_date(match.group(1))
        if parsed:
            return parsed

    # 2. Standalone explicit calendar date anywhere in the clause
    standalone_regex = (
        r"\b("
        r"\d{4}-\d{2}-\d{2}"
        r"|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}"
        r"|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4}"
        r"|\d{1,2}[/-]\d{1,2}[/-]\d{4}"
        r")\b"
    )
    s_match = re.search(standalone_regex, clause, re.IGNORECASE)
    if s_match:
        parsed = _safe_parse_date(s_match.group(1))
        if parsed:
            return parsed

    # 3. Relative durations ("within 15 days", "within thirty (30) business days", "within 2 months")
    rel_regex = (
        r"\b(?:within|no later than|after|in)\s+"
        r"(?:[a-zA-Z-]+\s*\(\s*(\d+)\s*\)|(\d+))\s+"
        r"(?:business\s+|calendar\s+|working\s+)?"
        r"(days?|weeks?|months?)\b"
    )
    rel_match = re.search(rel_regex, clause, re.IGNORECASE)
    if rel_match:
        num_str = rel_match.group(1) or rel_match.group(2)
        unit = rel_match.group(3).lower()
        try:
            count = int(num_str)
            if "day" in unit:
                return today + timedelta(days=count)
            elif "week" in unit:
                return today + timedelta(weeks=count)
            elif "month" in unit:
                return today + timedelta(days=count * 30)
        except ValueError:
            pass

    return None


def _safe_parse_date(raw_str: str) -> Optional[date]:
    clean_str = re.sub(r"(?<=\d)(st|nd|rd|th)\b", "", raw_str.strip(), flags=re.IGNORECASE)
    try:
        dt = dateparser.parse(clean_str, settings={"DATE_ORDER": "DMY"})
        if dt:
            return dt.date()
    except Exception:
        pass
    try:
        return date_parser.parse(clean_str, fuzzy=True).date()
    except Exception:
        return None


def _extract_monetary_value(clause: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Supports standard commas ($150,000), Indian numbering (₹1,50,000 / Rs. 2,50,000),
    unformatted numbers (INR 50000), and multipliers (Lakhs, Crores, Million).
    """
    num_pat = r"(\d+(?:,\d{2,3})*(?:\.\d+)?)"
    mult_pat = r"(?:\s*(thousand|lakh|lakhs|lac|lacs|million|cr|crore|crores|billion))?"

    # Pattern A: Currency prefix (e.g., "Rs. 1,50,000", "$50,000", "INR 2.5 Lakhs")
    prefix_regex = rf"(?:\b(USD|EUR|GBP|INR|Rs\.?)|(\$|€|£|₹))\s*{num_pat}{mult_pat}"
    match_a = re.search(prefix_regex, clause, re.IGNORECASE)
    if match_a:
        curr_token = (match_a.group(1) or match_a.group(2)).upper().strip()
        amt_str = match_a.group(3)
        mult_str = match_a.group(4)
        return _compute_currency_amount(amt_str, curr_token, mult_str)

    # Pattern B: Currency suffix (e.g., "50,000 USD", "1.5 Lakhs INR", "5000 rupees")
    suffix_regex = rf"\b{num_pat}{mult_pat}\s*(USD|EUR|GBP|INR|dollars?|rupees?|euros?|pounds?)\b"
    match_b = re.search(suffix_regex, clause, re.IGNORECASE)
    if match_b:
        amt_str = match_b.group(1)
        mult_str = match_b.group(2)
        curr_token = match_b.group(3).upper().strip()
        return _compute_currency_amount(amt_str, curr_token, mult_str)

    return None, None


def _compute_currency_amount(
    amt_str: str, curr_token: str, mult_str: Optional[str]
) -> Tuple[Optional[float], Optional[str]]:
    try:
        base_val = float(amt_str.replace(",", ""))
        if mult_str:
            base_val *= MULTIPLIERS.get(mult_str.lower(), 1.0)
        currency = CURRENCY_MAP.get(curr_token, "USD")
        return round(base_val, 2), currency
    except ValueError:
        return None, None


def _extract_late_penalty(clause: str) -> Optional[str]:
    """
    Captures late fees, percentage delay interest, liquidated damages, and service credits.
    """
    penalty_patterns = [
        r"(\b(?:subject to|incur|pay)\s+a?\s*(?:late\s+fee|penalty|liquidated\s+damages|service\s+credit)[^.;]+)",
        r"(\b(?:late\s+fee|liquidated\s+damages|late\s+penalty|delay\s+penalty)\s+(?:of|equal\s+to|at)\s+[^.;]+)",
        r"(\b\d+(?:\.\d+)?%\s*(?:per\s+(?:day|week|month|annum)|interest)\s+(?:for|on|of)\s+[^.;]+)",
        r"(\binterest\s+at\s+(?:the\s+rate\s+of\s+)?\d+(?:\.\d+)?%[^.;]+)",
        r"(\bpenalty\s+of\s+[^.;]+)",
    ]
    for pat in penalty_patterns:
        match = re.search(pat, clause, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _extract_description(clause: str) -> str:
    """
    Extracts a clean, human-readable summary of the required action.
    """
    # Strip leading clause number (e.g., "4.1 ", "(b) ")
    cleaned = re.sub(r"^\s*(?:\d+(?:\.\d+)*\.?|\([a-zA-Z0-9]+\))\s+", "", clause)

    match = re.search(
        r"\b(?:shall|must|agrees?\s+to|undertakes?\s+to|is\s+required\s+to|is\s+obligated\s+to|will)\s+(.+)",
        cleaned,
        re.IGNORECASE,
    )
    if match:
        desc = match.group(1).strip()
        # Clean trailing period and capitalize first letter
        if desc:
            desc = desc[0].upper() + desc[1:]
        if len(desc) > 280:
            desc = desc[:277] + "..."
        return desc

    return cleaned[:280]