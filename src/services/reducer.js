// Pure state transitions for the whole app. No derived numbers are stored here:
// spent / remaining are always computed from `expenses` (see utils/calc.js).

import {
  DEFAULT_SETTINGS,
  SAMPLE_BUDGET,
  STORAGE_VERSION,
  blankMonth,
  createSeedState,
  newId,
} from '../data/defaults.js';
import { currentMonthKey } from '../utils/dates.js';
import { round2 } from '../utils/money.js';

export function makeCategory({ name, budget = 0, icon = 'Tag', isSavings = false }) {
  return { id: newId('cat'), name: name.trim(), budget: round2(budget), icon, isSavings };
}

export function makeFixedExpense({ name, amount }) {
  return { id: newId('fix'), name: name.trim(), amount: round2(amount) };
}

export function emptyState() {
  const key = currentMonthKey();
  return { version: STORAGE_VERSION, settings: { ...DEFAULT_SETTINGS }, activeMonth: key, months: {} };
}

const patchMonth = (state, key, fn) => {
  const m = state.months[key];
  if (!m) return state;
  return { ...state, months: { ...state.months, [key]: fn(m) } };
};

const mapById = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x));

/** Latest month before `key` that has data, or null. */
export function previousMonthKey(months, key) {
  return Object.keys(months).filter((k) => k < key).sort().pop() ?? null;
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_MONTH':
      return { ...state, activeMonth: action.month };

    case 'ADD_EXPENSE':
      return patchMonth(state, action.month, (m) =>
        m.expenses.some((e) => e.id === action.expense.id) ? m : { ...m, expenses: [...m.expenses, action.expense] },
      );

    case 'UPDATE_EXPENSE':
      return patchMonth(state, action.month, (m) => {
        const changes = { ...action.changes };
        // An expense never leaves its month: months are separate ledgers.
        if (changes.date && changes.date.slice(0, 7) !== action.month) delete changes.date;
        return { ...m, expenses: mapById(m.expenses, action.id, (e) => ({ ...e, ...changes })) };
      });

    case 'DELETE_EXPENSE':
      return patchMonth(state, action.month, (m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== action.id) }));

    case 'SET_INCOME':
      return patchMonth(state, action.month, (m) => ({ ...m, income: Math.max(0, round2(action.value)) }));

    case 'SET_SPENDING_BUDGET':
      return patchMonth(state, action.month, (m) => ({
        ...m,
        spendingBudget: action.value === null ? null : Math.max(0, round2(action.value)),
      }));

    case 'ADD_FIXED':
      return patchMonth(state, action.month, (m) => ({ ...m, fixedExpenses: [...m.fixedExpenses, action.item] }));
    case 'UPDATE_FIXED':
      return patchMonth(state, action.month, (m) => ({
        ...m,
        fixedExpenses: mapById(m.fixedExpenses, action.id, (f) => ({ ...f, ...action.changes })),
      }));
    case 'DELETE_FIXED':
      return patchMonth(state, action.month, (m) => ({
        ...m,
        fixedExpenses: m.fixedExpenses.filter((f) => f.id !== action.id),
      }));

    case 'ADD_CATEGORY':
      return patchMonth(state, action.month, (m) => ({ ...m, categories: [...m.categories, action.category] }));
    case 'UPDATE_CATEGORY':
      return patchMonth(state, action.month, (m) => ({
        ...m,
        categories: mapById(m.categories, action.id, (c) => ({ ...c, ...action.changes })),
      }));
    case 'DELETE_CATEGORY':
      // moveTo: another category id to receive the expenses, or null to delete them too.
      return patchMonth(state, action.month, (m) => ({
        ...m,
        categories: m.categories.filter((c) => c.id !== action.id),
        expenses:
          action.moveTo
            ? m.expenses.map((e) => (e.categoryId === action.id ? { ...e, categoryId: action.moveTo } : e))
            : m.expenses.filter((e) => e.categoryId !== action.id),
      }));

    case 'LOAD_SAMPLE_BUDGET':
      // Upsert the sample categories. Categories that hold expenses are never dropped.
      return patchMonth(state, action.month, (m) => {
        const sampleIds = new Set(SAMPLE_BUDGET.categories.map((c) => c.id));
        const used = new Set(m.expenses.map((e) => e.categoryId));
        const kept = m.categories.filter((c) => !sampleIds.has(c.id) && used.has(c.id));
        return {
          ...m,
          spendingBudget: SAMPLE_BUDGET.spendingBudget,
          income: m.income > 0 ? m.income : SAMPLE_BUDGET.spendingBudget,
          categories: [...SAMPLE_BUDGET.categories.map((c) => ({ ...c })), ...kept],
        };
      });

    case 'START_MONTH': {
      if (state.months[action.month]) return { ...state, activeMonth: action.month };
      let month = blankMonth();
      if (action.mode === 'sample') {
        month = {
          ...month,
          income: SAMPLE_BUDGET.spendingBudget,
          spendingBudget: SAMPLE_BUDGET.spendingBudget,
          categories: SAMPLE_BUDGET.categories.map((c) => ({ ...c })),
        };
      } else if (action.mode === 'copy') {
        const src = state.months[action.from ?? previousMonthKey(state.months, action.month)];
        if (src) {
          month = {
            income: src.income,
            spendingBudget: src.spendingBudget,
            fixedExpenses: src.fixedExpenses.map((f) => ({ ...f, id: newId('fix') })),
            categories: src.categories.map((c) => ({ ...c })), // same ids keep quick-add & colours stable
            expenses: [], // expense history always starts fresh; the source month is untouched
          };
        }
      }
      return { ...state, activeMonth: action.month, months: { ...state.months, [action.month]: month } };
    }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.changes } };

    case 'REPLACE_STATE':
      return { ...action.state, activeMonth: currentMonthKey() };
    case 'RESET_DEMO':
      return createSeedState();
    case 'CLEAR_ALL':
      return { ...emptyState(), settings: state.settings };

    default:
      return state;
  }
}
