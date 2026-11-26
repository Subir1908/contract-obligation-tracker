import csv
import io
import re
from datetime import datetime, timezone
from typing import Any, List
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.models.obligation import Obligation

_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _sanitize_spreadsheet_cell(val: Any) -> Any:
    """Prevent CSV/Excel formula injection on string values."""
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        return val
    text = str(val).replace("\x00", "")
    if text.startswith(_FORMULA_PREFIXES):
        return f"'{text}"
    return text


def _escape_ics_text(val: str) -> str:
    """Escape RFC 5545 special characters and strip control/newline injection."""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", val or "")
    cleaned = cleaned.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\n")
    cleaned = cleaned.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
    # Restore literal \n escapes after backslash escaping
    cleaned = cleaned.replace("\\\\n", "\\n")
    return cleaned


def export_to_csv(obligations: List[Obligation]) -> str:
    """
    Generates standard RFC 4180 CSV string with all obligation columns.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Obligation ID",
        "Description",
        "Responsible Party",
        "Due Date",
        "Monetary Value",
        "Currency",
        "Late Penalty",
        "Deadline Status",
        "Risk Level",
        "Verification Status",
        "Source Clause"
    ])

    for ob in obligations:
        writer.writerow([
            ob.obligation_id,
            _sanitize_spreadsheet_cell(ob.description),
            _sanitize_spreadsheet_cell(ob.responsible_party or "N/A"),
            ob.due_date.isoformat() if ob.due_date else "N/A",
            ob.monetary_value if ob.monetary_value is not None else 0.0,
            _sanitize_spreadsheet_cell(ob.currency or "INR"),
            _sanitize_spreadsheet_cell(ob.late_penalty or "None"),
            _sanitize_spreadsheet_cell(ob.deadline_status),
            _sanitize_spreadsheet_cell(ob.risk_level),
            _sanitize_spreadsheet_cell(ob.verification_status),
            _sanitize_spreadsheet_cell(ob.source_clause or "")
        ])

    return output.getvalue()


def export_to_xlsx(obligations: List[Obligation]) -> bytes:
    """
    Generates formatted Excel workbook using openpyxl.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Obligations"

    headers = [
        "ID", "Description", "Responsible Party", "Due Date",
        "Amount", "Currency", "Late Penalty", "Status",
        "Risk Level", "Verified", "Source Clause"
    ]
    ws.append(headers)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = alignment

    thin_border = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9")
    )

    for row_idx, ob in enumerate(obligations, start=2):
        row_data = [
            ob.obligation_id,
            _sanitize_spreadsheet_cell(ob.description),
            _sanitize_spreadsheet_cell(ob.responsible_party or "N/A"),
            ob.due_date.isoformat() if ob.due_date else "N/A",
            ob.monetary_value if ob.monetary_value is not None else 0.0,
            _sanitize_spreadsheet_cell(ob.currency or "INR"),
            _sanitize_spreadsheet_cell(ob.late_penalty or "None"),
            _sanitize_spreadsheet_cell(ob.deadline_status),
            _sanitize_spreadsheet_cell(ob.risk_level),
            _sanitize_spreadsheet_cell(ob.verification_status),
            _sanitize_spreadsheet_cell(ob.source_clause or "")
        ]
        ws.append(row_data)
        for col_num in range(1, len(row_data) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.border = thin_border

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def export_to_ics(obligations: List[Obligation], contract_filename: str = "Contract") -> str:
    """
    Generates standard RFC 5545 iCalendar (.ics) string for upcoming deadlines.
    """
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Contract Obligation Tracker//COT v1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]

    now_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_uid_host = re.sub(r"[^a-zA-Z0-9._-]", "_", contract_filename or "contract")[:64]

    for ob in obligations:
        if not ob.due_date:
            continue

        dt_start = ob.due_date.strftime("%Y%m%d")
        summary = _escape_ics_text(f"Deadline: {(ob.description or '')[:60]}")
        desc = _escape_ics_text(
            f"Responsible: {ob.responsible_party or 'N/A'}\n"
            f"Amount: {ob.monetary_value or 0} {ob.currency or ''}\n"
            f"Penalty: {ob.late_penalty or 'None'}\n"
            f"Contract: {contract_filename}"
        )

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:cot-ob-{ob.obligation_id}@{safe_uid_host}",
            f"DTSTAMP:{now_str}",
            f"DTSTART;VALUE=DATE:{dt_start}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{desc}",
            "STATUS:CONFIRMED",
            "BEGIN:VALARM",
            "TRIGGER:-P1D",
            "ACTION:DISPLAY",
            "DESCRIPTION:Reminder: Contract Obligation Due Tomorrow",
            "END:VALARM",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
