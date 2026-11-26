/**
 * Input & Export Sanitization Helpers
 */

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const HTML_TAGS_RE = /<[^>]*>/g;
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Strips ASCII control characters and HTML tags from text.
 * Set `trim` to false for live keystroke handlers so trailing spaces remain typable.
 */
export function sanitizeText(
  value: string | null | undefined,
  maxLength: number = 2000,
  trim: boolean = true
): string {
  if (!value) return '';
  let cleaned = value.replace(CONTROL_CHARS_RE, '').replace(HTML_TAGS_RE, '');
  if (trim) cleaned = cleaned.trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitizes a numeric currency amount to a finite, non-negative value rounded to 2 decimals.
 */
export function sanitizeMonetaryValue(raw: string | number | null | undefined): number {
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Sanitizes phone numbers to digits, spaces, +, -, and parentheses.
 */
export function sanitizePhone(value: string, trim: boolean = true): string {
  const cleaned = value.replace(/[^\d+\-\s()]/g, '');
  return (trim ? cleaned.trim() : cleaned).slice(0, 30);
}

/**
 * Sanitizes OTP codes to digits only.
 */
export function sanitizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/**
 * Prevents spreadsheet formula injection (=, +, -, @, tab, CR) on exported string cells.
 */
export function sanitizeSpreadsheetCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }
  // eslint-disable-next-line no-control-regex
  const str = String(value).replace(/\x00/g, '');
  if (FORMULA_PREFIX_RE.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes RFC 5545 iCalendar special characters and strips newline/control injection.
 */
export function sanitizeIcsText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(CONTROL_CHARS_RE, '')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\\\\n/g, '\\n');
}
