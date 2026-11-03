import { useEffect, useMemo, useState } from 'react';
import { Receipt, Search, X } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { card, iconBtn, input } from '../components/common/ui.js';
import ExpenseRow from '../components/expenses/ExpenseRow.jsx';
import { useExpenseSheet } from '../components/expenses/ExpenseSheet.jsx';
import { useBudget } from '../hooks/useBudget.jsx';
import { filterExpenses } from '../utils/calc.js';
import { firstDayOf, formatDayHeading, lastDayOf, monthLabel } from '../utils/dates.js';
import { sumMoney } from '../utils/money.js';

const SORTS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['highest', 'Highest amount'],
  ['lowest', 'Lowest amount'],
];

export default function Expenses() {
  const { state, month, monthKey, fmt, deleteExpense, restoreExpense } = useBudget();
  const { openEdit } = useExpenseSheet();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [scope, setScope] = useState('month'); // 'month' | 'all'

  // A day picked in one month makes no sense in another; category ids may not exist either.
  useEffect(() => { setDate(''); }, [monthKey, scope]);

  const categoryOptions = useMemo(() => {
    const map = new Map();
    const months = scope === 'all' ? Object.values(state.months) : [month];
    months.filter(Boolean).forEach((m) => m.categories.forEach((c) => map.set(c.id, c.name)));
    return [...map.entries()];
  }, [state.months, month, scope]);

  useEffect(() => {
    if (categoryId !== 'all' && !categoryOptions.some(([id]) => id === categoryId)) setCategoryId('all');
  }, [categoryOptions, categoryId]);

  // Flatten to {…expense, month} so rows from any month can be edited with the right context.
  const all = useMemo(() => {
    const entries = scope === 'all' ? Object.entries(state.months) : [[monthKey, month]];
    return entries.flatMap(([key, m]) => (m ? m.expenses.map((e) => ({ ...e, month: key })) : []));
  }, [state.months, month, monthKey, scope]);

  const catLookup = (e) => state.months[e.month]?.categories.find((c) => c.id === e.categoryId);
  const rows = useMemo(() => filterExpenses(all, { query, categoryId, date, sort }), [all, query, categoryId, date, sort]);
  const total = sumMoney(rows.map((r) => r.amount));
  const filtering = query || categoryId !== 'all' || date;

  const groups = useMemo(() => {
    if (sort !== 'newest' && sort !== 'oldest') return null;
    const map = new Map();
    rows.forEach((r) => map.set(r.date, [...(map.get(r.date) ?? []), r]));
    return [...map.entries()];
  }, [rows, sort]);

  function remove(e) {
    deleteExpense(e.id, e.month);
    const { month: _m, ...original } = e;
    toast(`Deleted ${e.name}.`, { action: { label: 'Undo', onClick: () => restoreExpense(original) } });
  }

  function clear() { setQuery(''); setCategoryId('all'); setDate(''); }

  const renderRow = (e) => (
    <ExpenseRow key={e.id} expense={e} category={catLookup(e)} fmt={fmt} showDate={!groups} onEdit={() => openEdit(e)} onDelete={() => remove(e)} />
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted">{scope === 'all' ? 'Every month' : monthLabel(monthKey)}</p>
      </div>

      <section aria-label="Filters" className={`${card} space-y-3 p-3`}>
        <div className="relative">
          <label htmlFor="exp-search" className="sr-only">Search expenses</label>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input id="exp-search" type="search" className={`${input} pl-10 pr-11`} placeholder="Search name or notes" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className={`${iconBtn} absolute right-0.5 top-0.5 size-11`}><X size={16} aria-hidden /></button>}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div>
            <label htmlFor="f-cat" className="sr-only">Category</label>
            <select id="f-cat" className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-sort" className="sr-only">Sort</label>
            <select id="f-sort" className={input} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-scope" className="sr-only">Month range</label>
            <select id="f-scope" className={input} value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="month">{monthLabel(monthKey)}</option>
              <option value="all">All months</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-date" className="sr-only">Day</label>
            <input id="f-date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} min={scope === 'month' ? firstDayOf(monthKey) : undefined} max={scope === 'month' ? lastDayOf(monthKey) : undefined} />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted" aria-live="polite">{rows.length} {rows.length === 1 ? 'expense' : 'expenses'} · <strong className="font-semibold text-ink tabular-nums">{fmt(total)}</strong></span>
          {filtering && <button type="button" onClick={clear} className="min-h-11 px-2 font-medium text-brand">Clear filters</button>}
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title={filtering ? 'No matching expenses' : 'No expenses yet'}>
          {filtering ? 'Try a different search or clear the filters.' : 'Tap Add Expense to record your first one.'}
        </EmptyState>
      ) : groups ? (
        <div className="space-y-4">
          {groups.map(([day, items]) => (
            <section key={day} aria-label={formatDayHeading(day)}>
              <div className="mb-1 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{formatDayHeading(day)}{scope === 'all' && <span className="font-normal text-muted"> · {monthLabel(day.slice(0, 7))}</span>}</h2>
                <span className="text-sm tabular-nums text-muted">{fmt(sumMoney(items.map((i) => i.amount)))}</span>
              </div>
              <ul className={`${card} divide-y divide-line px-4`}>{items.map(renderRow)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className={`${card} divide-y divide-line px-4`}>{rows.map(renderRow)}</ul>
      )}
    </div>
  );
}
