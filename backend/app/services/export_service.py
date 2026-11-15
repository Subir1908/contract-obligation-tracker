import csv
import io
from datetime import datetime, timezone
from typing import List
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.models.obligation import Obligation

def export_to_csv(obligations: List[Obligation]) -> str:
    """
    Generates standard RFC 4180 CSV string with all obligation columns.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
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
            ob.description,
            ob.responsible_party or "N/A",
            ob.due_date.isoformat() if ob.due_date else "N/A",
            ob.monetary_value if ob.monetary_value is not None else 0.0,
            ob.currency or "USD",
            ob.late_penalty or "None",
            ob.deadline_status,
            ob.risk_level,
            ob.verification_status,
            ob.source_clause or ""
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

    # Style header row
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
            ob.description,
            ob.responsible_party or "N/A",
            ob.due_date.isoformat() if ob.due_date else "N/A",
            ob.monetary_value if ob.monetary_value is not None else 0.0,
            ob.currency or "USD",
            ob.late_penalty or "None",
            ob.deadline_status,
            ob.risk_level,
            ob.verification_status,
            ob.source_clause or ""
        ]
        ws.append(row_data)
        for col_num in range(1, len(row_data) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.border = thin_border

    # Adjust column widths
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

    for ob in obligations:
        if not ob.due_date:
            continue
            
        dt_start = ob.due_date.strftime("%Y%m%d")
        summary = f"Deadline: {ob.description[:60]}"
        desc = (
            f"Responsible: {ob.responsible_party or 'N/A'}\\n"
            f"Amount: {ob.monetary_value or 0} {ob.currency or ''}\\n"
            f"Penalty: {ob.late_penalty or 'None'}\\n"
            f"Contract: {contract_filename}"
        )
        
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:cot-ob-{ob.obligation_id}@{contract_filename.replace(' ', '_')}",
            f"DTSTAMP:{now_str}",
            f"DTSTART;VALUE=DATE:{dt_start}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{desc}",
            f"STATUS:CONFIRMED",
            "BEGIN:VALARM",
            "TRIGGER:-P1D",
            "ACTION:DISPLAY",
            "DESCRIPTION:Reminder: Contract Obligation Due Tomorrow",
            "END:VALARM",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
