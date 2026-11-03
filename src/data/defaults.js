// Default / demo data. Seed data is generated relative to *today*, so the demo month
// is always the current month and never looks stale.

import { addDays, currentMonthKey, shiftMonth, todayISO, firstDayOf, daysInMonth } from '../utils/dates.js';

export const STORAGE_VERSION = 1;

/** The ₹2,000 sample budget from the brief. Also used by "Load sample budget". */
export const SAMPLE_BUDGET = {
  spendingBudget: 2000,
  categories: [
    { id: 'mobile-recharge', name: 'Mobile Recharge', budget: 350, icon: 'Smartphone', isSavings: false },
    { id: 'travel', name: 'Travel', budget: 300, icon: 'Bus', isSavings: false },
    { id: 'essentials', name: 'Essentials', budget: 200, icon: 'ShoppingBasket', isSavings: false },
    { id: 'tea-snacks', name: 'Tea & Snacks', budget: 600, icon: 'Coffee', isSavings: false },
    { id: 'emergency-savings', name: 'Emergency Savings', budget: 500, icon: 'PiggyBank', isSavings: true },
    { id: 'extra-balance', name: 'Extra Balance', budget: 50, icon: 'Wallet', isSavings: false },
  ],
};

export const DEFAULT_SETTINGS = { theme: 'system', currency: 'INR' };

/** One-tap entries for the frequent Tea & Snacks category (shown on the dashboard). */
export const QUICK_ADD_CATEGORY_ID = 'tea-snacks';
export const QUICK_ADD = [
  { name: 'Tea', amount: 15 },
  { name: 'Snack', amount: 30 },
  { name: 'Coffee', amount: 20 },
];

let seq = 0;
export function newId(prefix = 'id') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}-${(seq++).toString(36)}`;
}

export function makeExpense({ name, amount, categoryId, date, notes = '' }) {
  return { id: newId('exp'), name: name.trim(), amount, categoryId, date, notes: notes.trim(), createdAt: Date.now() + seq };
}

export function blankMonth() {
  return { income: 0, fixedExpenses: [], spendingBudget: null, categories: [], expenses: [] };
}

function demoMonth(monthKey, expenseRows) {
  const last = daysInMonth(monthKey);
  const today = todayISO();
  return {
    income: 2000,
    fixedExpenses: [],
    spendingBudget: SAMPLE_BUDGET.spendingBudget,
    categories: SAMPLE_BUDGET.categories.map((c) => ({ ...c })),
    expenses: expenseRows
      .map(([name, amount, categoryId, day, notes = '']) => {
        const date = monthKey === currentMonthKey() ? addDays(firstDayOf(monthKey), day - 1) : `${monthKey}-${String(Math.min(day, last)).padStart(2, '0')}`;
        return { name, amount, categoryId, date, notes };
      })
      // Never seed expenses in the future of the current month.
      .filter((e) => monthKey !== currentMonthKey() || e.date <= today)
      .map(makeExpense),
  };
}

export function createSeedState() {
  const thisMonth = currentMonthKey();
  const lastMonth = shiftMonth(thisMonth, -1);
  const today = todayISO();
  const dayOfMonth = Number(today.slice(8, 10));

  const current = demoMonth(thisMonth, [
    ['Tea', 15, 'tea-snacks', 1],
    ['Samosa', 30, 'tea-snacks', 1],
    ['Bus pass top-up', 120, 'travel', 1, 'Weekly commute'],
    ['Soap & shampoo', 85, 'essentials', 1],
    ['Coffee', 20, 'tea-snacks', Math.min(2, dayOfMonth)],
    ['Tea', 15, 'tea-snacks', Math.min(2, dayOfMonth)],
    ['Jio recharge', 349, 'mobile-recharge', Math.min(2, dayOfMonth), '28-day plan'],
  ]);

  const previous = demoMonth(lastMonth, [
    ['Tea', 15, 'tea-snacks', 2],
    ['Snacks', 45, 'tea-snacks', 4],
    ['Bus pass', 120, 'travel', 5],
    ['Coffee', 20, 'tea-snacks', 8],
    ['Jio recharge', 349, 'mobile-recharge', 9],
    ['Toothpaste', 60, 'essentials', 11],
    ['Auto fare', 180, 'travel', 14],
    ['Tea', 15, 'tea-snacks', 16],
    ['Biscuits', 30, 'tea-snacks', 16],
    ['Notebook', 90, 'essentials', 19],
    ['Tea & vada', 40, 'tea-snacks', 22],
    ['Bus pass', 120, 'travel', 26],
    ['Coffee', 20, 'tea-snacks', 28],
  ]);

  return {
    version: STORAGE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    activeMonth: thisMonth,
    months: { [lastMonth]: previous, [thisMonth]: current },
  };
}

/** Icons users can pick for categories. Names must exist in lucide-react (see iconMap). */
export const ICON_CHOICES = [
  'Coffee', 'Smartphone', 'Bus', 'ShoppingBasket', 'PiggyBank', 'Wallet', 'Utensils',
  'HeartPulse', 'House', 'Shirt', 'Gift', 'Film', 'BookOpen', 'Fuel', 'Zap', 'ShieldCheck',
  'Sparkles', 'Tag', 'Plane', 'Car', 'GraduationCap', 'Dumbbell', 'Gamepad2', 'Landmark',
  'Receipt', 'Banknote', 'Bike', 'Train', 'Lightbulb', 'Pill', 'Music', 'Briefcase', 'Laptop', 'Scissors',
];
