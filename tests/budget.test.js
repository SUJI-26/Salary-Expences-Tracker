import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_BUDGET, createSeedState, makeExpense } from '../src/data/defaults.js';
import { reducer, emptyState } from '../src/services/reducer.js';
import { sanitizeState } from '../src/services/storage.js';
import { categoryStats, monthTotals, filterExpenses, buildAlerts, budgetStatus } from '../src/utils/calc.js';
import { currentMonthKey, todayISO, shiftMonth } from '../src/utils/dates.js';
import { sumMoney, formatMoney } from '../src/utils/money.js';
import { pdfMoney, reportFilename } from '../src/services/pdfReport.js';

const KEY = '2026-11';
const date = (d) => `${KEY}-${String(d).padStart(2, '0')}`;

function freshMonthState() {
  let s = { ...emptyState(), activeMonth: KEY };
  s = reducer(s, { type: 'START_MONTH', month: KEY, mode: 'sample' });
  return s;
}
const add = (s, name, amount, categoryId, d = 2) => {
  const expense = makeExpense({ name, amount, categoryId, date: date(d) });
  return { s: reducer(s, { type: 'ADD_EXPENSE', month: KEY, expense }), expense };
};
const stat = (s, id) => categoryStats(s.months[KEY]).find((c) => c.id === id);

test('brief example: ₹25 on Tea & Snacks changes only that category', () => {
  let s = freshMonthState();
  const before = categoryStats(s.months[KEY]);
  ({ s } = add(s, 'Tea', 25, 'tea-snacks'));
  const after = categoryStats(s.months[KEY]);
  const tea = after.find((c) => c.id === 'tea-snacks');
  assert.deepEqual([tea.budget, tea.spent, tea.remaining], [600, 25, 575]);
  for (const c of after.filter((c) => c.id !== 'tea-snacks')) {
    const b = before.find((x) => x.id === c.id);
    assert.deepEqual([c.budget, c.spent, c.remaining], [b.budget, 0, b.budget]);
  }
  const t = monthTotals(s.months[KEY]);
  assert.deepEqual([t.allocated, t.spent, t.remaining], [2000, 25, 1975]);
});

test('UX flow: Tea ₹15 takes Tea & Snacks from ₹600 to ₹585', () => {
  let s = freshMonthState();
  ({ s } = add(s, 'Tea', 15, 'tea-snacks'));
  assert.equal(stat(s, 'tea-snacks').remaining, 585);
});

test('totals stay correct after edit, delete, budget change', () => {
  let s = freshMonthState();
  let a, b;
  ({ s, expense: a } = add(s, 'Tea', 15, 'tea-snacks'));
  ({ s, expense: b } = add(s, 'Bus', 120, 'travel'));
  assert.equal(monthTotals(s.months[KEY]).spent, 135);

  // edit amount + move category
  s = reducer(s, { type: 'UPDATE_EXPENSE', month: KEY, id: a.id, changes: { amount: 40, categoryId: 'essentials' } });
  assert.equal(stat(s, 'tea-snacks').spent, 0);
  assert.equal(stat(s, 'essentials').remaining, 160);
  assert.equal(monthTotals(s.months[KEY]).spent, 160);

  // delete
  s = reducer(s, { type: 'DELETE_EXPENSE', month: KEY, id: b.id });
  assert.equal(stat(s, 'travel').remaining, 300);
  assert.equal(monthTotals(s.months[KEY]).remaining, 1960);

  // change a budget: remaining follows, spent does not
  s = reducer(s, { type: 'UPDATE_CATEGORY', month: KEY, id: 'essentials', changes: { budget: 250 } });
  assert.equal(stat(s, 'essentials').remaining, 210);
  assert.equal(monthTotals(s.months[KEY]).allocated, 2050);
});

test('exceeding a budget is allowed and shows negative remaining', () => {
  let s = freshMonthState();
  ({ s } = add(s, 'Big recharge', 400, 'mobile-recharge'));
  const c = stat(s, 'mobile-recharge');
  assert.equal(c.remaining, -50);
  assert.equal(c.status, 'exceeded');
  assert.equal(c.exceededBy, 50);
  const alerts = buildAlerts(categoryStats(s.months[KEY]), monthTotals(s.months[KEY]), (n) => `₹${n}`);
  assert.match(alerts[0].text, /Mobile Recharge budget has been exceeded/);
});

test('status thresholds: <70 ok, 70–90 warning, >90 danger, >100 exceeded', () => {
  assert.equal(budgetStatus(69, 100), 'ok');
  assert.equal(budgetStatus(70, 100), 'warning');
  assert.equal(budgetStatus(90, 100), 'warning');
  assert.equal(budgetStatus(91, 100), 'danger');
  assert.equal(budgetStatus(100, 100), 'danger');
  assert.equal(budgetStatus(101, 100), 'exceeded');
});

test('money maths has no floating point drift', () => {
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
  let s = freshMonthState();
  for (let i = 0; i < 10; i++) ({ s } = add(s, 'x', 0.1, 'tea-snacks'));
  assert.equal(stat(s, 'tea-snacks').spent, 1);
  assert.equal(stat(s, 'tea-snacks').remaining, 599);
});

test('months are independent; copying a month keeps the budget but not the expenses', () => {
  let s = freshMonthState();
  ({ s } = add(s, 'Tea', 15, 'tea-snacks'));
  s = reducer(s, { type: 'START_MONTH', month: '2026-12', mode: 'copy' });
  assert.equal(s.months['2026-12'].expenses.length, 0);
  assert.equal(s.months['2026-12'].categories.length, 6);
  assert.equal(s.months['2026-12'].spendingBudget, 2000);
  assert.equal(s.months[KEY].expenses.length, 1, 'source month untouched');
  // spending in December leaves November alone
  const e = makeExpense({ name: 'Tea', amount: 10, categoryId: 'tea-snacks', date: '2026-12-03' });
  s = reducer(s, { type: 'ADD_EXPENSE', month: '2026-12', expense: e });
  assert.equal(monthTotals(s.months[KEY]).spent, 15);
  assert.equal(monthTotals(s.months['2026-12']).spent, 10);
});

test('an expense cannot be moved out of its month by an edit', () => {
  let s = freshMonthState();
  let e;
  ({ s, expense: e } = add(s, 'Tea', 15, 'tea-snacks', 5));
  s = reducer(s, { type: 'UPDATE_EXPENSE', month: KEY, id: e.id, changes: { date: '2026-12-01', amount: 20 } });
  const saved = s.months[KEY].expenses[0];
  assert.equal(saved.date, date(5));
  assert.equal(saved.amount, 20);
});

test('deleting a category moves or removes its expenses, never orphans them', () => {
  let s = freshMonthState();
  ({ s } = add(s, 'Tea', 15, 'tea-snacks'));
  const moved = reducer(s, { type: 'DELETE_CATEGORY', month: KEY, id: 'tea-snacks', moveTo: 'essentials' });
  assert.equal(stat(moved, 'essentials').spent, 15);
  assert.equal(monthTotals(moved.months[KEY]).spent, 15);
  const removed = reducer(s, { type: 'DELETE_CATEGORY', month: KEY, id: 'tea-snacks', moveTo: null });
  assert.equal(monthTotals(removed.months[KEY]).spent, 0);
});

test('allocation warning: categories above the spending budget', () => {
  let s = freshMonthState();
  assert.equal(monthTotals(s.months[KEY]).unallocated, 0);
  s = reducer(s, { type: 'UPDATE_CATEGORY', month: KEY, id: 'travel', changes: { budget: 400 } });
  const t = monthTotals(s.months[KEY]);
  assert.equal(t.overAllocated, true);
  assert.equal(t.unallocated, -100);
});

test('salary plan: ₹18,000 − ₹6,000 rent = ₹12,000 available', () => {
  let s = freshMonthState();
  s = reducer(s, { type: 'SET_INCOME', month: KEY, value: 18000 });
  s = reducer(s, { type: 'ADD_FIXED', month: KEY, item: { id: 'f1', name: 'PG Rent', amount: 6000 } });
  s = reducer(s, { type: 'SET_SPENDING_BUDGET', month: KEY, value: null });
  const t = monthTotals(s.months[KEY]);
  assert.equal(t.available, 12000);
  assert.equal(t.spendingBudget, 12000);
  assert.equal(t.unallocated, 10000);
});

test('savings fund is the sum of categories flagged as savings', () => {
  const s = freshMonthState();
  const t = monthTotals(s.months[KEY]);
  assert.equal(t.savingsBudget, 500);
  assert.equal(t.savingsRemaining, 500);
});

test('search, category filter, day filter and sorting', () => {
  let s = freshMonthState();
  ({ s } = add(s, 'Tea', 15, 'tea-snacks', 1));
  ({ s } = add(s, 'Samosa', 30, 'tea-snacks', 2));
  ({ s } = add(s, 'Bus pass', 120, 'travel', 2));
  const list = s.months[KEY].expenses;
  assert.deepEqual(filterExpenses(list, { query: 'sam' }).map((e) => e.name), ['Samosa']);
  assert.equal(filterExpenses(list, { categoryId: 'travel' }).length, 1);
  assert.equal(filterExpenses(list, { date: date(2) }).length, 2);
  assert.deepEqual(filterExpenses(list, { sort: 'highest' }).map((e) => e.amount), [120, 30, 15]);
  assert.deepEqual(filterExpenses(list, { sort: 'newest' }).map((e) => e.date), [date(2), date(2), date(1)]);
});

test('seed data: current + previous month, ₹2,000 sample, nothing in the future', () => {
  const s = createSeedState();
  const cur = s.months[currentMonthKey()];
  assert.equal(cur.spendingBudget, SAMPLE_BUDGET.spendingBudget);
  assert.equal(monthTotals(cur).allocated, 2000);
  assert.ok(cur.expenses.every((e) => e.date <= todayISO()));
  assert.ok(s.months[shiftMonth(currentMonthKey(), -1)].expenses.length > 5);
  assert.ok(monthTotals(cur).spent > 0);
});

test('import validation: rejects junk, repairs partial data, drops bad records', () => {
  assert.throws(() => sanitizeState({ hello: 1 }), /not a Smart Expense Tracker backup/);
  assert.throws(() => sanitizeState('x'), /not a Smart Expense Tracker backup/);
  const { state, dropped } = sanitizeState({
    settings: { theme: 'neon', currency: 'XXX' },
    months: {
      '2026-11': {
        income: '1000',
        categories: [{ id: 'a', name: 'A', budget: '50' }, { id: 'a', name: 'dup', budget: 1 }],
        expenses: [
          { id: '1', name: 'ok', amount: 5, categoryId: 'a', date: '2026-11-03' },
          { id: '2', name: 'negative', amount: -5, categoryId: 'a', date: '2026-11-03' },
          { id: '3', name: 'wrong month', amount: 5, categoryId: 'a', date: '2026-10-03' },
          { id: '4', name: 'bad date', amount: 5, categoryId: 'a', date: '2026-02-31' },
        ],
      },
      'not-a-month': {},
    },
  });
  assert.equal(dropped, 4);
  assert.equal(state.settings.theme, 'system');
  assert.equal(state.settings.currency, 'INR');
  assert.equal(state.months['2026-11'].categories.length, 1);
  assert.equal(state.months['2026-11'].expenses.length, 1);
  assert.equal(state.months['2026-11'].income, 1000);
  assert.equal(sanitizeState({ app: 'smart-expense-tracker', data: { months: {} } }).state.months.constructor, Object);
});

test('formatting: Indian grouping, paise only when needed, PDF-safe rupee', () => {
  assert.equal(formatMoney(1550), '₹1,550');
  assert.equal(formatMoney(125000), '₹1,25,000');
  assert.equal(formatMoney(15.5), '₹15.50');
  assert.equal(pdfMoney(1550, 'INR'), 'Rs. 1,550');
  assert.equal(pdfMoney(-25, 'INR'), '-Rs. 25');
  assert.equal(reportFilename('2026-11'), 'Expense_Report_November_2026.pdf');
});
