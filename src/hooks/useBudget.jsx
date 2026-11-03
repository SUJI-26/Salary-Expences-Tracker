import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { createSeedState, makeExpense } from '../data/defaults.js';
import { makeCategory, makeFixedExpense, reducer } from '../services/reducer.js';
import { loadState, saveState } from '../services/storage.js';
import { categoryStats, monthTotals } from '../utils/calc.js';
import { currentMonthKey } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';

const BudgetContext = createContext(null);

const init = () => loadState() ?? createSeedState();

export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(!saveState(state));
  }, [state]);

  // If the app stays open across midnight into a new month, nothing is deleted or switched;
  // the user simply sees the new month when they next open it.
  const monthKey = state.activeMonth;
  const month = state.months[monthKey] ?? null;
  const currency = state.settings.currency;

  const fmt = useCallback((n) => formatMoney(n, currency), [currency]);
  const stats = useMemo(() => (month ? categoryStats(month) : []), [month]);
  const totals = useMemo(() => (month ? monthTotals(month, stats) : null), [month, stats]);

  const actions = useMemo(
    () => ({
      setActiveMonth: (m) => dispatch({ type: 'SET_ACTIVE_MONTH', month: m }),
      startMonth: (m, mode, from) => dispatch({ type: 'START_MONTH', month: m, mode, from }),

      addExpense: (data) => {
        const expense = makeExpense(data);
        dispatch({ type: 'ADD_EXPENSE', month: expense.date.slice(0, 7), expense });
        return expense;
      },
      restoreExpense: (expense) => dispatch({ type: 'ADD_EXPENSE', month: expense.date.slice(0, 7), expense }),
      updateExpense: (id, month, changes) => dispatch({ type: 'UPDATE_EXPENSE', month, id, changes }),
      deleteExpense: (id, month) => dispatch({ type: 'DELETE_EXPENSE', month, id }),

      setIncome: (value) => dispatch({ type: 'SET_INCOME', month: monthKey, value }),
      setSpendingBudget: (value) => dispatch({ type: 'SET_SPENDING_BUDGET', month: monthKey, value }),
      addFixed: (item) => dispatch({ type: 'ADD_FIXED', month: monthKey, item: makeFixedExpense(item) }),
      updateFixed: (id, changes) => dispatch({ type: 'UPDATE_FIXED', month: monthKey, id, changes }),
      deleteFixed: (id) => dispatch({ type: 'DELETE_FIXED', month: monthKey, id }),

      addCategory: (data) => dispatch({ type: 'ADD_CATEGORY', month: monthKey, category: makeCategory(data) }),
      updateCategory: (id, changes) => dispatch({ type: 'UPDATE_CATEGORY', month: monthKey, id, changes }),
      deleteCategory: (id, moveTo) => dispatch({ type: 'DELETE_CATEGORY', month: monthKey, id, moveTo }),
      loadSampleBudget: () => dispatch({ type: 'LOAD_SAMPLE_BUDGET', month: monthKey }),

      setSettings: (changes) => dispatch({ type: 'SET_SETTINGS', changes }),
      replaceState: (next) => dispatch({ type: 'REPLACE_STATE', state: next }),
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
      clearAll: () => dispatch({ type: 'CLEAR_ALL' }),
    }),
    [monthKey],
  );

  const value = useMemo(
    () => ({
      state,
      settings: state.settings,
      monthKey,
      month,
      stats,
      totals,
      fmt,
      isCurrentMonth: monthKey === currentMonthKey(),
      saveFailed,
      ...actions,
    }),
    [state, monthKey, month, stats, totals, fmt, saveFailed, actions],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside <BudgetProvider>');
  return ctx;
}
