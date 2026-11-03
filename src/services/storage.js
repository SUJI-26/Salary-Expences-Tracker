// Persistence (localStorage) plus validation of anything coming from outside
// (stored JSON from an older build, or a backup file the user imports).

import { DEFAULT_SETTINGS, STORAGE_VERSION } from '../data/defaults.js';
import { currentMonthKey, isValidISODate, todayISO } from '../utils/dates.js';
import { CURRENCIES, round2 } from '../utils/money.js';

export const STORAGE_KEY = 'smart-expense-tracker:v1';
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const THEMES = ['system', 'light', 'dark'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
const str = (v, fallback = '') => (typeof v === 'string' ? v.slice(0, 120) : fallback);

/**
 * Validate and normalise a state object. Never trusts its input.
 * Returns { state, dropped } where `dropped` counts records that were unusable.
 * Throws an Error with a user-readable message if the data is not a budget backup at all.
 */
export function sanitizeState(raw) {
  const data = isObj(raw) && isObj(raw.data) && raw.app ? raw.data : raw; // accept wrapped export or bare state
  if (!isObj(data) || !isObj(data.months)) throw new Error('This file is not a Smart Expense Tracker backup.');

  let dropped = 0;
  const months = {};

  for (const [key, m] of Object.entries(data.months)) {
    if (!MONTH_RE.test(key) || !isObj(m)) { dropped++; continue; }

    const seen = new Set();
    const unique = (id) => (seen.has(id) ? false : (seen.add(id), true));

    const categories = (Array.isArray(m.categories) ? m.categories : [])
      .filter((c) => isObj(c) && typeof c.id === 'string' && c.id && unique(`c:${c.id}`))
      .map((c) => ({
        id: c.id,
        name: str(c.name, 'Category') || 'Category',
        budget: Math.max(0, round2(num(c.budget))),
        icon: str(c.icon, 'Tag') || 'Tag',
        isSavings: Boolean(c.isSavings),
      }));

    const fixedExpenses = (Array.isArray(m.fixedExpenses) ? m.fixedExpenses : [])
      .filter((f) => isObj(f) && typeof f.id === 'string' && unique(`f:${f.id}`))
      .map((f) => ({ id: f.id, name: str(f.name, 'Fixed expense'), amount: Math.max(0, round2(num(f.amount))) }));

    const expenses = [];
    for (const e of Array.isArray(m.expenses) ? m.expenses : []) {
      const ok =
        isObj(e) && typeof e.id === 'string' && e.id && unique(`e:${e.id}`) &&
        Number.isFinite(Number(e.amount)) && Number(e.amount) > 0 &&
        typeof e.categoryId === 'string' &&
        isValidISODate(e.date) && e.date.slice(0, 7) === key;
      if (!ok) { dropped++; continue; }
      expenses.push({
        id: e.id,
        name: str(e.name, 'Expense') || 'Expense',
        amount: round2(Number(e.amount)),
        categoryId: e.categoryId,
        date: e.date,
        notes: str(e.notes),
        createdAt: num(e.createdAt, 0),
      });
    }

    months[key] = {
      income: Math.max(0, round2(num(m.income))),
      fixedExpenses,
      spendingBudget: m.spendingBudget === null || m.spendingBudget === undefined ? null : Math.max(0, round2(num(m.spendingBudget))),
      categories,
      expenses,
    };
  }

  const s = isObj(data.settings) ? data.settings : {};
  const settings = {
    theme: THEMES.includes(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    currency: CURRENCIES[s.currency] ? s.currency : DEFAULT_SETTINGS.currency,
  };

  return {
    state: {
      version: STORAGE_VERSION,
      settings,
      activeMonth: MONTH_RE.test(data.activeMonth ?? '') ? data.activeMonth : currentMonthKey(),
      months,
    },
    dropped,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { state } = sanitizeState(JSON.parse(raw));
    return { ...state, activeMonth: currentMonthKey() }; // always open on the current month
  } catch {
    return null;
  }
}

/** @returns {boolean} false when the browser refused the write (quota / private mode). */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportPayload(state) {
  return { app: 'smart-expense-tracker', version: STORAGE_VERSION, exportedAt: new Date().toISOString(), data: state };
}

export function backupFilename() {
  return `smart-expense-tracker-backup-${todayISO()}.json`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function countStats(state) {
  const months = Object.values(state.months);
  return { months: months.length, expenses: months.reduce((n, m) => n + m.expenses.length, 0) };
}
