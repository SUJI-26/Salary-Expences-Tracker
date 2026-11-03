// Money helpers. Amounts are stored as plain numbers (rupees, up to 2 decimals).
// All summing goes through integer paise to avoid floating point drift
// (e.g. 0.1 + 0.2 !== 0.3), so totals stay exact after any number of edits.

export const toPaise = (n) => Math.round((Number(n) || 0) * 100);
export const fromPaise = (p) => p / 100;
export const round2 = (n) => fromPaise(toPaise(n));

export const sumMoney = (values) => fromPaise(values.reduce((acc, v) => acc + toPaise(v), 0));

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'Indian Rupee (₹)' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', label: 'US Dollar ($)' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', label: 'Euro (€)' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'British Pound (£)' },
};

const formatterCache = new Map();

/** Format a number as currency. Whole amounts show no decimals; paise show 2. */
export function formatMoney(amount, currency = 'INR') {
  const cfg = CURRENCIES[currency] ?? CURRENCIES.INR;
  const value = Number(amount) || 0;
  const hasFraction = toPaise(value) % 100 !== 0;
  const key = `${cfg.code}:${hasFraction}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    });
    formatterCache.set(key, fmt);
  }
  return fmt.format(value);
}

/** Compact form for chart axes: 1.2k, 15k … */
export function formatCompact(amount) {
  const v = Number(amount) || 0;
  if (Math.abs(v) >= 100000) return `${+(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

/** Parse user input like "1,250.50" → number, or NaN when invalid. */
export function parseAmount(input) {
  if (typeof input === 'number') return input;
  const cleaned = String(input ?? '').replace(/,/g, '').trim();
  if (cleaned === '' || !/^\d*\.?\d{0,2}$/.test(cleaned)) return NaN;
  return Number(cleaned);
}
