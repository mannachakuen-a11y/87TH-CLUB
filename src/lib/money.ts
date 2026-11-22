export const CURRENCY = (process.env.STORE_CURRENCY || process.env.NEXT_PUBLIC_STORE_CURRENCY || 'KES').toUpperCase();

/** Format integer minor units in the store currency. */
export function formatMoney(minor: number | null | undefined, currency = CURRENCY): string {
  if (minor === null || minor === undefined) return '—';
  const digits = currencyDigits(currency);
  const value = minor / 10 ** digits;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: value % 1 === 0 ? 0 : digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return `${currency} ${value.toFixed(digits)}`;
  }
}

export function currencyDigits(currency = CURRENCY): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/**
 * Parse a human price ("$1,250.00", "KES 3500", "3 500") into minor units without rounding the value.
 * Returns null when no unambiguous number is present.
 */
export function parsePriceToMinor(input: unknown, currency = CURRENCY): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 10 ** currencyDigits(currency)) : null;
  const raw = String(input).trim();
  if (!raw) return null;
  const nums = raw.match(/\d[\d,\s]*(?:\.\d+)?/g);
  if (!nums || nums.length !== 1) return null; // ambiguous ("$20-$30") or none
  const cleaned = nums[0].replace(/[,\s]/g, '');
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10 ** currencyDigits(currency));
}

/** Convert a decimal string from an admin form ("3500" or "3500.50") to minor units. */
export function decimalToMinor(input: string | null | undefined, currency = CURRENCY): number | null {
  if (input === null || input === undefined || String(input).trim() === '') return null;
  const n = Number(String(input).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 10 ** currencyDigits(currency));
}

export function minorToDecimal(minor: number | null | undefined, currency = CURRENCY): string {
  if (minor === null || minor === undefined) return '';
  const d = currencyDigits(currency);
  return (minor / 10 ** d).toFixed(d).replace(/\.0+$/, '');
}
