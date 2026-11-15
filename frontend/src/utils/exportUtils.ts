import * as XLSX from 'xlsx';
import type { ContractObligation, DocumentMetadata, CurrencyCode } from '../types/obligation';
import { calculateUrgency, formatCurrency } from './dateUtils';

/**
 * Exports obligations to a standardized RFC 4180 CSV file with UTF-8 BOM
 */
export function exportToCsv(
  obligations: ContractObligation[],
  metadata?: DocumentMetadata,
  referenceDate?: string,
  currency: CurrencyCode = 'INR',
  conversionMultiplier: number = 1
): void {
  const currencyLabel = currency === 'INR' ? 'INR (₹)' : 'USD ($)';
  const headers = [
    'Obligation ID',
    'Obligation / Deliverable Description',
    'Responsible Party',
    'Milestone Due Date (YYYY-MM-DD)',
    'Timeline Status',
    'Urgency Details',
    'Risk Severity Level',
    'Verification Status',
    `Monetary Value (${currencyLabel})`,
    'Late Penalty Clause',
    'Source Clause Snippet',
    'Category'
  ];

  const rows = obligations.map(ob => {
    const urgency = calculateUrgency(ob.dueDate, referenceDate);
    return [
      escapeCsvField(ob.id),
      escapeCsvField(ob.description),
      escapeCsvField(ob.responsibleParty),
      escapeCsvField(ob.dueDate),
      escapeCsvField(urgency.label),
      escapeCsvField(urgency.formattedDelta),
      escapeCsvField(ob.riskLevel || 'MEDIUM'),
      escapeCsvField(ob.verificationStatus || 'VERIFIED'),
      escapeCsvField((ob.monetaryValue * conversionMultiplier).toFixed(2)),
      escapeCsvField(ob.latePenalty),
      escapeCsvField(ob.sourceClause || ''),
      escapeCsvField(ob.category || 'Deliverable')
    ];
  });

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = getExportFilename(metadata?.contractTitle || 'Contract_Obligations', 'csv');
  downloadBlob(blob, filename);
}

/**
 * Exports obligations to an Excel .xlsx workbook with multiple structured sheets
 */
export function exportToExcel(
  obligations: ContractObligation[],
  metadata?: DocumentMetadata,
  referenceDate?: string,
  currency: CurrencyCode = 'INR',
  conversionMultiplier: number = 1
): void {
  const wb = XLSX.utils.book_new();
  const currencyCol = `Monetary Value (${currency === 'INR' ? 'INR ₹' : 'USD $'})`;

  // Sheet 1: Obligations Matrix
  const tableData = obligations.map(ob => {
    const urgency = calculateUrgency(ob.dueDate, referenceDate);
    return {
      'Obligation ID': ob.id,
      'Deliverable / Obligation Description': ob.description,
      'Responsible Party': ob.responsibleParty,
      'Milestone Due Date': ob.dueDate,
      'Timeline Urgency': urgency.label,
      'Urgency Details': urgency.formattedDelta,
      'Risk Severity Level': ob.riskLevel || 'MEDIUM',
      'Verification Status': ob.verificationStatus || 'VERIFIED',
      [currencyCol]: Number(((ob.monetaryValue || 0) * conversionMultiplier).toFixed(2)),
      'Late Penalty Clause': ob.latePenalty,
      'Source Clause Snippet': ob.sourceClause || 'Extracted Clause',
      'Category': ob.category || 'General'
    };
  });

  const ws = XLSX.utils.json_to_sheet(tableData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // ID
    { wch: 45 }, // Description
    { wch: 22 }, // Responsible Party
    { wch: 18 }, // Milestone Due Date
    { wch: 16 }, // Timeline Urgency
    { wch: 25 }, // Urgency Details
    { wch: 18 }, // Monetary Value
    { wch: 35 }, // Late Penalty
    { wch: 16 }, // Category
    { wch: 12 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Obligations Matrix');

  // Sheet 2: Executive Summary & Metadata
  const overdueCount = obligations.filter(o => calculateUrgency(o.dueDate, referenceDate).status === 'OVERDUE').length;
  const dueTodayCount = obligations.filter(o => calculateUrgency(o.dueDate, referenceDate).status === 'DUE_TODAY').length;
  const upcomingCount = obligations.filter(o => calculateUrgency(o.dueDate, referenceDate).status === 'UPCOMING').length;
  const totalValue = obligations.reduce((acc, o) => acc + (o.monetaryValue || 0), 0);

  const summaryData = [
    { 'Parameter': 'Contract Title', 'Value': metadata?.contractTitle || 'Commercial Contract Agreement' },
    { 'Parameter': 'Document Type', 'Value': metadata?.contractType || 'Master Services Agreement (MSA)' },
    { 'Parameter': 'Report Generation Date', 'Value': new Date().toLocaleString() },
    { 'Parameter': 'Evaluation Baseline Date', 'Value': referenceDate || 'Current System Date' },
    { 'Parameter': 'Total Contract Obligations', 'Value': obligations.length },
    { 'Parameter': `Total Tracked Monetary Value (${currency})`, 'Value': formatCurrency(totalValue, currency, conversionMultiplier) },
    { 'Parameter': 'Critical Overdue Obligations', 'Value': overdueCount },
    { 'Parameter': 'Due Today (Urgent Action)', 'Value': dueTodayCount },
    { 'Parameter': 'Upcoming Milestones', 'Value': upcomingCount },
    { 'Parameter': 'System Engine', 'Value': 'Contract Obligation Tracker (COT) v1.0.0' }
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Compliance Summary');

  const filename = getExportFilename(metadata?.contractTitle || 'Contract_Obligations', 'xlsx');
  XLSX.writeFile(wb, filename);
}

/**
 * Triggers the browser print dialog optimized via @media print stylesheet
 */
export function triggerPrintReport(): void {
  window.print();
}

/**
 * FR-6.4: Exports upcoming obligation milestones directly as an .ics (iCalendar) file
 * Compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
 */
export function exportToIcsCalendar(
  obligations: ContractObligation[],
  contractTitle: string = 'Contract Obligations'
): void {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const vEvents = obligations.map(ob => {
    // Due Date YYYY-MM-DD
    const dateClean = ob.dueDate ? ob.dueDate.replace(/-/g, '') : '';
    if (!dateClean || dateClean.length !== 8) return '';

    // End date is next day for all-day events
    const d = new Date(ob.dueDate);
    d.setDate(d.getDate() + 1);
    const endClean = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    const summary = `[COT] ${ob.responsibleParty ? ob.responsibleParty + ': ' : ''}${ob.description.slice(0, 70)}`;
    const description = `Obligation: ${ob.description}\\nParty: ${ob.responsibleParty}\\nDue Date: ${ob.dueDate}\\nLate Penalty: ${ob.latePenalty || 'None'}\\nSource Clause: ${ob.sourceClause || 'Extracted via COT'}`;

    return [
      'BEGIN:VEVENT',
      `UID:${ob.id}-${Date.now()}@cot.local`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dateClean}`,
      `DTEND;VALUE=DATE:${endClean}`,
      `SUMMARY:${summary.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${description.replace(/,/g, '\\,')}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    ].join('\r\n');
  }).filter(Boolean);

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Contract Obligation Tracker//COT Calendar Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${contractTitle} Deadlines`,
    ...vEvents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const filename = getExportFilename(contractTitle || 'Contract_Obligations', 'ics');
  downloadBlob(blob, filename);
}

/**
 * Escapes CSV special characters and wraps in quotes
 */
function escapeCsvField(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates a clean timestamped filename
 */
function getExportFilename(baseName: string, ext: string): string {
  const cleanBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 35);
  const now = new Date();
  const dateTag = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `${cleanBase || 'cot_obligations'}_${dateTag}.${ext}`;
}

/**
 * Helper to download Blob in browser
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
