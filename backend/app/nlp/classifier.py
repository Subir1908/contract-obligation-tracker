import re
from typing import List
import spacy

# Load spaCy model with parser & NER enabled
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = spacy.blank("en")
    nlp.add_pipe("sentencizer")

# Positive obligation triggers (Deontic modals & active legal verbs)
OBLIGATION_TRIGGERS = [
    r"\b(?:shall|must|agrees?\s+to|undertakes?\s+to|covenants?\s+to|is\s+obligated\s+to|is\s+required\s+to|warrants?\s+that)\b",
    r"\b(?:responsible\s+for\s+(?:delivering|paying|submitting|maintaining|providing|completing))\b",
    r"\b(?:will\s+(?:deliver|pay|submit|provide|complete|reimburse|indemnify|maintain|perform))\b",
]

# Negative / prohibitive patterns (e.g., "shall not", "must not", "is not required to")
NEGATION_PATTERNS = [
    r"\b(?:shall|must|will)\s+(?:not|never)\b",
    r"\b(?:is|are)\s+not\s+(?:obligated|required|responsible|liable)\b",
    r"\bno\s+obligation\s+to\b",
]

# Standard non-actionable legal boilerplate (Governing law, entire agreement, severability)
BOILERPLATE_PATTERNS = [
    r"\bgoverned\s+by\s+and\s+construed\s+in\s+accordance\s+with\b",
    r"\bentire\s+agreement\s+between\s+the\s+parties\b",
    r"\bshall\s+be\s+deemed\s+severable\b",
    r"\bheadings\s+are\s+for\s+convenience\s+only\b",
    r"\bin\s+witness\s+whereof\b",
    r"\bforce\s+majeure\b",
    r"\bthis\s+agreement\s+shall\s+(?:commence|take\s+effect)\b",
]


# Common corporate & legal abbreviations whose periods should never trigger a sentence break
ABBREVIATIONS = [
    "Pvt", "Ltd", "Inc", "Corp", "Co", "LLC", "LLP",
    "Rs", "No", "Nos", "Sec", "Art", "Cl", "Vol", "Fig",
    "Dr", "Mr", "Mrs", "Ms", "Prof", "St", "vs", "v", "etc", "e.g", "i.e"
]
_ABBR_REGEX = re.compile(
    r"\b(" + "|".join(re.escape(a) for a in ABBREVIATIONS) + r")\.",
    re.IGNORECASE
)


def _protect_abbreviations(text: str) -> str:
    return _ABBR_REGEX.sub(r"\1<DOT>", text)


def _restore_abbreviations(text: str) -> str:
    return text.replace("<DOT>", ".")


def segment_and_classify_clauses(contract_text: str) -> List[str]:
    """
    1. Protects common legal abbreviations (Rs., Pvt., Ltd., Inc., Sec.) so sentence splitting doesn't break.
    2. Splits text into discrete clauses using spaCy + numbered list boundaries.
    3. Filters out non-obligations, negations ('shall not'), and legal boilerplate.
    """
    if not contract_text or not contract_text.strip():
        return []

    # Normalize line breaks
    text = re.sub(r"\r\n|\r", "\n", contract_text)

    # Insert explicit breaks before numbered sections (e.g., "1.1 ", "4.2. ", "(a) ")
    text = re.sub(r"\n(?=\s*(?:\d+(?:\.\d+)*\.?|\([a-zA-Z0-9]+\))\s+)", "\n||CLAUSE_SPLIT||\n", text)

    raw_blocks = [b.strip() for b in text.split("||CLAUSE_SPLIT||") if b.strip()]

    candidate_clauses: List[str] = []
    for block in raw_blocks:
        clean_block = re.sub(r"\s*\n\s*", " ", block)
        protected_block = _protect_abbreviations(clean_block)
        doc = nlp(protected_block)
        for sent in doc.sents:
            s_text = _restore_abbreviations(sent.text).strip()
            if len(s_text) >= 25:
                candidate_clauses.append(s_text)

    actionable_clauses: List[str] = []
    for clause in candidate_clauses:
        if is_actionable_obligation(clause):
            actionable_clauses.append(clause)

    return actionable_clauses

def is_actionable_obligation(clause: str) -> bool:
    """Returns True if the clause is a positive binding obligation and not boilerplate."""
    # 1. Must match at least one obligation trigger
    has_trigger = any(re.search(pat, clause, re.IGNORECASE) for pat in OBLIGATION_TRIGGERS)
    if not has_trigger:
        return False

    # 2. Reject boilerplate clauses
    is_boilerplate = any(re.search(pat, clause, re.IGNORECASE) for pat in BOILERPLATE_PATTERNS)
    if is_boilerplate:
        return False

    # 3. Reject purely prohibitive/negative clauses ("shall not disclose") UNLESS they contain a monetary penalty/fee
    has_negation = any(re.search(pat, clause, re.IGNORECASE) for pat in NEGATION_PATTERNS)
    has_positive_modal = bool(re.search(r"\b(?:shall|must|agrees\s+to)\s+(?!not\b|never\b)[a-z]+", clause, re.IGNORECASE))
    if has_negation and not has_positive_modal:
        return False

    return True