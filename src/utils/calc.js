// Pure calculation layer. Nothing here is stored: every figure on screen is derived
// from the month's `expenses` and `categories`, so it is correct by construction after
// add / edit / delete / budget change / month switch.
//
// Month shape:
//   { income, fixedExpenses: [{id,name,amount}], spendingBudget: number|null,
//     categories: [{id,name,budget,icon,isSavings}],
//     expenses:   [{id,name,amount,categoryId,date,notes}] }

import { round2, sumMoney } from './money.js';
import { daysInMonth } from './dates.js';

export const WARNING_THRESHOLD = 70; // % used
export const DANGER_THRESHOLD = 90; // % used

/** ok (<70%), warning (70–90%), danger (>90%), exceeded (>100%). */
export function budgetStatus(spent, budget) {
  if (spent > budget) return 'exceeded';
  if (budget <= 0) return 'ok';
  const pct = (spent / budget) * 100;
  if (pct > DANGER_THRESHOLD) return 'danger';
  if (pct >= WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

export function categoryStats(month) {
  const spentById = new Map();
  const countById = new Map();
  for (const e of month.expenses) {
    spentById.set(e.categoryId, [...(spentById.get(e.categoryId) ?? []), e.amount]);
    countById.set(e.categoryId, (countById.get(e.categoryId) ?? 0) + 1);
  }
  return month.categories.map((c) => {
    const spent = sumMoney(spentById.get(c.id) ?? []);
    const budget = round2(c.budget);
    const remaining = round2(budget - spent);
    const percent = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
    return {
      ...c,
      budget,
      spent,
      remaining,
      percent,
      status: budgetStatus(spent, budget),
      exceededBy: remaining < 0 ? Math.abs(remaining) : 0,
      count: countById.get(c.id) ?? 0,
    };
  });
}

export function monthTotals(month, stats = categoryStats(month)) {
  const income = round2(month.income ?? 0);
  const fixedTotal = sumMoney((month.fixedExpenses ?? []).map((f) => f.amount));
  const available = round2(income - fixedTotal);
  const spendingBudget =
    month.spendingBudget === null || month.spendingBudget === undefined
      ? available
      : round2(month.spendingBudget);
  const allocated = sumMoney(stats.map((c) => c.budget));
  const spent = sumMoney(month.expenses.map((e) => e.amount)); // all expenses, even orphaned
  const savings = stats.filter((c) => c.isSavings);
  const savingsBudget = sumMoney(savings.map((c) => c.budget));
  const savingsSpent = sumMoney(savings.map((c) => c.spent));
  return {
    income,
    fixedTotal,
    available,
    spendingBudget,
    allocated,
    unallocated: round2(spendingBudget - allocated),
    overAllocated: allocated > spendingBudget,
    spent,
    remaining: round2(allocated - spent),
    percentUsed: allocated > 0 ? (spent / allocated) * 100 : spent > 0 ? 100 : 0,
    status: budgetStatus(spent, allocated),
    savingsBudget,
    savingsSpent,
    savingsRemaining: round2(savingsBudget - savingsSpent),
    expenseCount: month.expenses.length,
  };
}

/** One entry per calendar day of the month (including zero days) for trend charts. */
export function dailySpending(month, monthKey) {
  const n = daysInMonth(monthKey);
  const buckets = Array.from({ length: n }, () => []);
  for (const e of month.expenses) {
    const day = Number(e.date.slice(8, 10));
    if (day >= 1 && day <= n) buckets[day - 1].push(e.amount);
  }
  let running = 0;
  return buckets.map((amounts, i) => {
    const amount = sumMoney(amounts);
    running = round2(running + amount);
    return { day: i + 1, date: `${monthKey}-${String(i + 1).padStart(2, '0')}`, amount, cumulative: running };
  });
}

export function topCategories(stats, limit = 5) {
  return stats
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit);
}

/** Expenses on a given date, newest-first by insertion (stable). */
export const expensesOn = (month, isoDate) => month.expenses.filter((e) => e.date === isoDate);

/**
 * Human-readable alerts. `fmt` formats money. Levels: danger | warning | good.
 * Ordered most severe first.
 */
export function buildAlerts(stats, totals, fmt) {
  const alerts = [];
  for (const c of stats) {
    if (c.status === 'exceeded') {
      alerts.push({
        level: 'danger',
        categoryId: c.id,
        text: `${c.name} budget has been exceeded by ${fmt(c.exceededBy)}.`,
      });
    } else if (c.status === 'danger' || c.status === 'warning') {
      alerts.push({
        level: 'warning',
        categoryId: c.id,
        text: `You have used ${Math.round(c.percent)}% of your ${c.name} budget.`,
      });
    }
  }
  if (totals.allocated > 0 || totals.spent > 0) {
    if (totals.remaining < 0) {
      alerts.push({ level: 'danger', text: `You are ${fmt(Math.abs(totals.remaining))} over your monthly budget.` });
    } else if (totals.remaining > 0) {
      alerts.push({ level: 'good', text: `Great! You still have ${fmt(totals.remaining)} remaining in your monthly budget.` });
    } else {
      alerts.push({ level: 'warning', text: 'You have used your entire monthly budget.' });
    }
  }
  const order = { danger: 0, warning: 1, good: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

/** Search / filter / sort used by the Expenses page. */
export function filterExpenses(expenses, { query = '', categoryId = 'all', date = '', sort = 'newest' } = {}) {
  const q = query.trim().toLowerCase();
  const list = expenses.filter((e) => {
    if (categoryId !== 'all' && e.categoryId !== categoryId) return false;
    if (date && e.date !== date) return false;
    if (q && !`${e.name} ${e.notes ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const cmp = {
    newest: (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
    oldest: (a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0),
    highest: (a, b) => b.amount - a.amount || b.date.localeCompare(a.date),
    lowest: (a, b) => a.amount - b.amount || b.date.localeCompare(a.date),
  }[sort] ?? (() => 0);
  return [...list].sort(cmp);
}
