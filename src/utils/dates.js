// Date helpers. Dates are plain "YYYY-MM-DD" strings in the user's LOCAL time zone;
// months are "YYYY-MM" keys. We never use toISOString() for "today" because it is UTC
// and would show the wrong day late at night in IST.

const pad = (n) => String(n).padStart(2, '0');

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const monthKeyOf = (isoDate) => isoDate.slice(0, 7);
export const currentMonthKey = (now = new Date()) => monthKeyOf(todayISO(now));

export function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(key) {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** "November_2026" – used in the PDF filename. */
export const monthFileLabel = (key) => monthLabel(key).replace(' ', '_');

export function shiftMonth(key, delta) {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key) {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
}

export const firstDayOf = (key) => `${key}-01`;
export const lastDayOf = (key) => `${key}-${pad(daysInMonth(key))}`;

/** Keep a date inside the month (used for the date picker default). */
export function clampToMonth(isoDate, key) {
  const first = firstDayOf(key);
  const last = lastDayOf(key);
  if (isoDate < first) return first;
  if (isoDate > last) return last;
  return isoDate;
}

export function isValidISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function formatDate(isoDate, { withYear = false } = {}) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function formatDayHeading(isoDate, today = todayISO()) {
  if (isoDate === today) return 'Today';
  const [y, m, d] = isoDate.split('-').map(Number);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === todayISO(yesterday)) return 'Yesterday';
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function addDays(isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + delta));
}
