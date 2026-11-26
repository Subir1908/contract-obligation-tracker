import type { UrgencyInfo, CurrencyCode } from '../types/obligation';

/**
 * Returns today's date in YYYY-MM-DD format based on local calendar time
 */
export function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes a date string or timestamp into YYYY-MM-DD format
 */
export function normalizeDateString(dateInput: string): string {
  if (!dateInput) return '';
  const trimmed = dateInput.trim();
  
  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY (e.g. 25/12/2026 or 25-12-2026)
  const dmyMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    // If p1 > 12, p1 is definitely day and p2 is month
    if (p1 > 12 && p2 <= 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Default standard for DD/MM/YYYY
    return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }
  
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return trimmed;
}

/**
 * Calculates deadline urgency dynamically against a reference date (defaults to today)
 */
export function calculateUrgency(
  dueDateStr: string,
  referenceDateStr: string = getTodayIsoString()
): UrgencyInfo {
  if (!dueDateStr) {
    return {
      status: 'UPCOMING',
      daysDiff: 0,
      label: 'Date Unspecified',
      formattedDelta: 'No date set',
    };
  }

  // Parse YYYY-MM-DD parts to eliminate timezone hour skew
  const [dueYear, dueMonth, dueDay] = dueDateStr.split('-').map(Number);
  const [refYear, refMonth, refDay] = referenceDateStr.split('-').map(Number);

  if (!dueYear || !dueMonth || !dueDay || isNaN(dueYear)) {
    return {
      status: 'UPCOMING',
      daysDiff: 0,
      label: 'Invalid Date',
      formattedDelta: 'Format error',
    };
  }

  const dueUtc = Date.UTC(dueYear, dueMonth - 1, dueDay);
  const refUtc = Date.UTC(refYear, refMonth - 1, refDay);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((dueUtc - refUtc) / msPerDay);

  if (daysDiff < 0) {
    const absDays = Math.abs(daysDiff);
    return {
      status: 'OVERDUE',
      daysDiff,
      label: 'Overdue',
      formattedDelta: absDays === 1 ? 'Overdue by 1 day' : `Overdue by ${absDays} days`,
    };
  }

  if (daysDiff === 0) {
    return {
      status: 'DUE_TODAY',
      daysDiff: 0,
      label: 'Due Today',
      formattedDelta: 'Due Today (Action required)',
    };
  }

  if (daysDiff === 1) {
    return {
      status: 'UPCOMING',
      daysDiff: 1,
      label: 'Upcoming',
      formattedDelta: 'Due Tomorrow',
    };
  }

  return {
    status: 'UPCOMING',
    daysDiff,
    label: 'Upcoming',
    formattedDelta: `Due in ${daysDiff} days`,
  };
}

/**
 * Formats YYYY-MM-DD to friendly human display like "Sep 15, 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a number to currency string:
 * - INR: "₹1,50,000" using Indian numbering format (Lakhs/Crores grouping)
 * - USD: "$150,000.00" using US format
 */
export const USD_TO_INR_RATE = 86.5;

export function formatCurrency(
  value: number, 
  currency: CurrencyCode = 'INR', 
  multiplier: number = 1
): string {
  const computedValue = (value || 0) * multiplier;
  if (isNaN(computedValue)) return currency === 'INR' ? '₹0' : '$0';

  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(computedValue);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(computedValue);
}

export function convertUsdToInr(usdAmount: number, rate: number = USD_TO_INR_RATE): number {
  return (usdAmount || 0) * rate;
}

export function convertInrToUsd(inrAmount: number, rate: number = USD_TO_INR_RATE): number {
  return rate > 0 ? (inrAmount || 0) / rate : 0;
}

/**
 * FR-7: Calculates automated Risk Severity (Low, Medium, High) based on monetary exposure and penalty clauses
 */
export function calculateRisk(
  monetaryValue: number = 0,
  latePenalty: string = '',
  status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING'
): { level: 'LOW' | 'MEDIUM' | 'HIGH'; score: number; label: string; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Monetary exposure weighting
  if (monetaryValue >= 5000000 || monetaryValue >= 100000) { // e.g. >= 50 Lakhs INR or >= $100k USD
    score += 40;
    reasons.push('High financial obligation value');
  } else if (monetaryValue >= 1000000 || monetaryValue >= 25000) {
    score += 20;
    reasons.push('Moderate financial obligation value');
  } else {
    score += 5;
  }

  // Late penalty severity weighting
  const penalty = (latePenalty || '').toLowerCase();
  if (
    penalty.includes('termination') || 
    penalty.includes('liquidated damages') || 
    penalty.includes('indemnity') || 
    penalty.includes('forfeiture') || 
    penalty.includes('per day') ||
    penalty.includes('/day') ||
    penalty.includes('breach')
  ) {
    score += 35;
    reasons.push('Stringent punitive damages / liquidated penalty terms');
  } else if (penalty.trim().length > 0 && !penalty.includes('none') && !penalty.includes('n/a')) {
    score += 15;
    reasons.push('Late penalty clauses apply');
  }

  // Timeline Urgency modifier
  if (status === 'OVERDUE') {
    score += 30;
    reasons.push('Milestone is actively Overdue');
  } else if (status === 'DUE_TODAY') {
    score += 20;
    reasons.push('Milestone is Due Today');
  }

  if (score >= 50) {
    return { level: 'HIGH', score, label: 'High Risk', reasons };
  } else if (score >= 25) {
    return { level: 'MEDIUM', score, label: 'Medium Risk', reasons };
  }
  return { level: 'LOW', score, label: 'Low Risk', reasons };
}

/**
 * Format Indian currency with Lakhs and Crores text descriptor for badges or metrics
 * e.g., 1500000 -> ₹15 L, 12000000 -> ₹1.2 Cr
 */
export function formatIndianCompactNotation(value: number, multiplier: number = 1): string {
  const val = (value || 0) * multiplier;
  if (isNaN(val) || val === 0) return '₹0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')} k`;
  }
  return `${sign}₹${abs}`;
}

/**
 * Parses user typed currency into numeric value, cleaning symbols like ₹, $, Rs, commas
 */
export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const clean = String(value).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
