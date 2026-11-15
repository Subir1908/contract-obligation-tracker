import re
from datetime import date, datetime
from typing import List, Optional, Tuple
from dateutil import parser as date_parser
try:
    from backend.nlp.schema import ExtractedObligationItem
except ImportError:
    from nlp.schema import ExtractedObligationItem

# Modal verbs and phrasing indicating contractual obligations
OBLIGATION_PATTERNS = [
    r"\b(?:shall|must|agrees to|is required to|undertakes to|covenants to|will)\b",
    r"\b(?:responsible for|obligated to|duty to)\b"
]

# Common contracting party descriptors
PARTY_KEYWORDS = [
    "Contractor", "Vendor", "Client", "Customer", "Company", "Service Provider",
    "Consultant", "Supplier", "Buyer", "Seller", "Licensee", "Licensor", "Party A", "Party B"
]

# Currency symbols and codes
CURRENCY_MAP = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₹": "INR",
    "USD": "USD",
    "EUR": "EUR",
    "GBP": "GBP",
    "INR": "INR",
    "RS.": "INR",
    "RS": "INR"
}

def extract_obligations(contract_text: str) -> List[ExtractedObligationItem]:
    """
    Open-source rule-based NLP extraction pipeline.
    Parses contract clauses to extract the 5 core parameters:
    1. Obligation description
    2. Responsible party
    3. Due date (normalized to YYYY-MM-DD)
    4. Monetary value and currency
    5. Late penalty details
    And links the exact verbatim source clause.
    """
    # 1. Clean and split into sentences / clauses
    sentences = _split_into_clauses(contract_text)
    
    extracted_items: List[ExtractedObligationItem] = []
    
    for sentence in sentences:
        sentence_clean = sentence.strip()
        if len(sentence_clean) < 20:
            continue
            
        # Check if sentence contains an obligation pattern
        is_obligation = any(re.search(pat, sentence_clean, re.IGNORECASE) for pat in OBLIGATION_PATTERNS)
        if not is_obligation:
            continue
            
        # Extract 5 parameters
        party = _extract_responsible_party(sentence_clean)
        due_date = _extract_due_date(sentence_clean)
        money, currency = _extract_monetary_value(sentence_clean)
        penalty = _extract_late_penalty(sentence_clean)
        description = _extract_description(sentence_clean)
        
        extracted_items.append(
            ExtractedObligationItem(
                description=description,
                responsible_party=party,
                due_date=due_date,
                monetary_value=money,
                currency=currency,
                late_penalty=penalty,
                source_clause=sentence_clean
            )
        )
        
    return extracted_items

def _split_into_clauses(text: str) -> List[str]:
    # Normalize newlines and whitespace
    text = re.sub(r"\r\n|\r", "\n", text)
    # Split by standard sentence terminators (. ! ?) followed by whitespace or numbered section patterns
    raw_sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(\[])", text)
    cleaned = []
    for s in raw_sentences:
        lines = [line.strip() for line in s.split("\n") if line.strip()]
        cleaned.append(" ".join(lines))
    return cleaned

def _extract_responsible_party(clause: str) -> Optional[str]:
    # Look for defined terms (e.g. Contractor, Vendor, Client)
    for party in PARTY_KEYWORDS:
        if re.search(rf"\b{re.escape(party)}\b", clause, re.IGNORECASE):
            return party
            
    # Check for subject preceding "shall / must"
    match = re.search(r"^([A-Z][a-zA-Z0-9\s,]+?)\s+(?:shall|must|agrees to|will)\b", clause)
    if match:
        subject = match.group(1).strip()
        if len(subject.split()) <= 4:
            return subject
    return "Contracting Party"

def _extract_due_date(clause: str) -> Optional[date]:
    # Look for common legal date patterns (e.g., "by December 31, 2026", "on or before 15/10/2025")
    date_regex = (
        r"\b(?:by|before|on or before|no later than|due on|within|deadline is)\s+"
        r"([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}/[0-9]{1,2}/[0-9]{4})"
    )
    match = re.search(date_regex, clause, re.IGNORECASE)
    if match:
        raw_date_str = match.group(1)
        # Remove ordinal suffixes like 1st, 2nd, 3rd
        clean_date_str = re.sub(r"(?<=\d)(st|nd|rd|th)", "", raw_date_str)
        try:
            parsed = date_parser.parse(clean_date_str, fuzzy=True)
            return parsed.date()
        except Exception:
            pass

    # Generic date fallback pattern: Month DD, YYYY or YYYY-MM-DD
    fallback_regex = r"\b([0-9]{4}-[0-9]{2}-[0-9]{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b"
    fallback_match = re.search(fallback_regex, clause, re.IGNORECASE)
    if fallback_match:
        try:
            parsed = date_parser.parse(fallback_match.group(1), fuzzy=True)
            return parsed.date()
        except Exception:
            pass
            
    return None

def _extract_monetary_value(clause: str) -> Tuple[Optional[float], Optional[str]]:
    # Regex for currency symbol followed by numbers or number followed by currency code
    pattern = r"(?:(\$|€|£|₹|USD|EUR|GBP|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)|([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*(USD|EUR|GBP|INR|dollars|rupees))"
    match = re.search(pattern, clause, re.IGNORECASE)
    if match:
        curr_raw = match.group(1) or match.group(4)
        amt_raw = match.group(2) or match.group(3)
        if amt_raw:
            amt_clean = amt_raw.replace(",", "")
            try:
                amt = float(amt_clean)
                currency_code = CURRENCY_MAP.get(curr_raw.upper().strip(), "USD") if curr_raw else "USD"
                return amt, currency_code
            except ValueError:
                pass
    return None, None

def _extract_late_penalty(clause: str) -> Optional[str]:
    # Look for penalty, liquidated damages, or delay interest
    penalty_patterns = [
        r"(\b(?:late fee|liquidated damages|penalty)\s+of\s+[^.;,]+)",
        r"(\b\d+(?:\.\d+)?%\s+(?:per\s+(?:day|week|month)|interest)\s+for\s+(?:delay|late)[^.;,]*)",
        r"(\bpenalty\s+incurred[^.;]*)",
        r"(\bsubject to a penalty\b[^.;]*)"
    ]
    for pat in penalty_patterns:
        match = re.search(pat, clause, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return None

def _extract_description(clause: str) -> str:
    # Summarize or extract the core actionable clause
    match = re.search(r"(?:shall|must|agrees to|is required to|will)\s+(.+)", clause, re.IGNORECASE)
    if match:
        desc = match.group(1).strip()
        # Truncate if excessively long
        if len(desc) > 300:
            desc = desc[:297] + "..."
        return desc
    return clause[:250]
