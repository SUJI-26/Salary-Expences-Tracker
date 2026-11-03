import { Link } from 'react-router-dom';
import { Coffee, Plus, SlidersHorizontal, Trophy } from 'lucide-react';
import AllocationBar from '../components/dashboard/AllocationBar.jsx';
import CategoryCard from '../components/dashboard/CategoryCard.jsx';
import InstallBanner from '../components/dashboard/InstallBanner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { StatusBadge } from '../components/common/ProgressBar.jsx';
import { useToast } from '../components/common/Toast.jsx';
import ExpenseRow from '../components/expenses/ExpenseRow.jsx';
import { useExpenseSheet } from '../components/expenses/ExpenseSheet.jsx';
import ReportButton from '../components/reports/ReportButton.jsx';
import { btnPrimary, card } from '../components/common/ui.js';
import { QUICK_ADD, QUICK_ADD_CATEGORY_ID } from '../data/defaults.js';
import { useBudget } from '../hooks/useBudget.jsx';
import { buildAlerts, expensesOn, topCategories } from '../utils/calc.js';
import { daysInMonth, monthLabel, todayISO } from '../utils/dates.js';
import { sumMoney, round2 } from '../utils/money.js';

function Stat({ label, value, hint, tone }) {
  return (
    <div className={`${card} min-w-0 p-3.5`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl ${tone ?? ''}`}>{value}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>
    </div>
  );
}

export default function Dashboard() {
  const { month, monthKey, stats, totals, fmt, isCurrentMonth, addExpense, deleteExpense, restoreExpense } = useBudget();
  const { openAdd, openEdit } = useExpenseSheet();
  const toast = useToast();

  if (!month || !totals) return null;

  if (!month.categories.length) {
    return (
      <EmptyState icon={SlidersHorizontal} title="No categories yet" action={<Link to="/budget" className={btnPrimary}>Set up your budget</Link>}>
        Create categories and give each a budget. Then every expense you add reduces just its own category.
      </EmptyState>
    );
  }

  const today = todayISO();
  const catById = new Map(month.categories.map((c) => [c.id, c]));
  const todays = isCurrentMonth ? expensesOn(month, today) : [];
  const todayTotal = sumMoney(todays.map((e) => e.amount));
  const latest = [...month.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);
  const listing = isCurrentMonth ? [...todays].sort((a, b) => b.createdAt - a.createdAt) : latest;

  const top = topCategories(stats, 1)[0];
  const alerts = buildAlerts(stats, totals, fmt).filter((a) => a.level !== 'good');
  const over = totals.remaining < 0;
  const dayOfMonth = Number(today.slice(8, 10));
  const daysLeft = daysInMonth(monthKey) - dayOfMonth + 1;
  const perDay = isCurrentMonth && totals.remaining > 0 ? round2(totals.remaining / daysLeft) : null;

  const quickCategory = isCurrentMonth ? catById.get(QUICK_ADD_CATEGORY_ID) : null;

  function quickAdd(item) {
    const e = addExpense({ ...item, categoryId: quickCategory.id, date: today, notes: '' });
    const left = round2((stats.find((s) => s.id === quickCategory.id)?.remaining ?? 0) - item.amount);
    toast(`${item.name} ${fmt(item.amount)} added · ${quickCategory.name}: ${left < 0 ? `${fmt(-left)} over budget` : `${fmt(left)} left`}`, {
      action: { label: 'Undo', onClick: () => deleteExpense(e.id, monthKey) },
    });
  }

  function removeExpense(e) {
    deleteExpense(e.id, monthKey);
    toast(`Deleted ${e.name}.`, { action: { label: 'Undo', onClick: () => restoreExpense(e) } });
  }

  const savingsLabel = totals.savingsBudget > 0 ? fmt(totals.savingsRemaining) : '—';

  return (
    <div className="space-y-5">
      <InstallBanner />

      {/* Hero: answers "how much do I have left?" at a glance */}
      <section className={`${card} p-5`} aria-labelledby="left-label">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 id="left-label" className="text-sm font-medium text-muted">{over ? 'Over budget this month' : 'Left to spend'} · {monthLabel(monthKey)}</h1>
            <p className={`mt-1 text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums ${over ? 'text-bad' : ''}`} data-testid="remaining-total">
              {fmt(over ? Math.abs(totals.remaining) : totals.remaining)}
            </p>
          </div>
          <StatusBadge status={totals.status} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {fmt(totals.spent)} spent of {fmt(totals.allocated)} budget
          {perDay !== null && ` · about ${fmt(perDay)} a day for the next ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}
        </p>
        <div className="mt-4"><AllocationBar stats={stats} fmt={fmt} /></div>
        {top && (
          <p className="mt-3 flex items-center gap-1.5 text-sm">
            <Trophy size={15} className="text-muted" aria-hidden />
            <span className="text-muted">Most spent on</span> <strong className="font-semibold">{top.name}</strong>
            <span className="tabular-nums text-muted">{fmt(top.spent)}</span>
          </p>
        )}
      </section>

      <section aria-label="Summary" className="grid grid-cols-3 gap-3">
        <Stat label="Monthly budget" value={fmt(totals.allocated)} hint={totals.overAllocated ? 'Above spending limit' : 'Allocated'} />
        <Stat label="Total spent" value={fmt(totals.spent)} hint={`${Math.round(totals.percentUsed)}% used`} />
        <Stat label="Savings fund" value={savingsLabel} hint={totals.savingsBudget > 0 ? `of ${fmt(totals.savingsBudget)} set aside` : 'Mark a category as savings'} />
      </section>

      {alerts.length > 0 && (
        <section aria-label="Budget alerts" className="space-y-2">
          {alerts.map((a, i) => (
            <p key={i} className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${a.level === 'danger' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn'}`}>
              {a.level === 'danger' ? '🚨' : '⚠'} {a.text}
            </p>
          ))}
        </section>
      )}

      {quickCategory && (
        <section aria-label="Quick add" className={`${card} p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Coffee size={16} aria-hidden /> Quick add to {quickCategory.name}</h2>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ADD.map((q) => (
              <button key={q.name} type="button" onClick={() => quickAdd(q)} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-line bg-page px-2 text-sm font-medium transition hover:bg-sunken active:scale-95">
                {q.name}
                <span className="tabular-nums text-muted">{fmt(q.amount)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-labelledby="cats-h" className="order-2 lg:order-1">
          <h2 id="cats-h" className="mb-3 text-lg font-semibold tracking-tight">Categories</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((c) => (
              <CategoryCard key={c.id} category={c} fmt={fmt} onAdd={() => openAdd({ categoryId: c.id })} />
            ))}
          </div>
        </section>

        <section aria-labelledby="today-h" className="order-1 lg:order-2">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 id="today-h" className="text-lg font-semibold tracking-tight">{isCurrentMonth ? 'Today' : 'Latest expenses'}</h2>
            {isCurrentMonth && todays.length > 0 && <span className="text-sm font-semibold tabular-nums">{fmt(todayTotal)}</span>}
          </div>
          <div className={`${card} px-4 py-1`}>
            {listing.length ? (
              <ul className="divide-y divide-line">
                {listing.map((e) => (
                  <ExpenseRow key={e.id} expense={e} category={catById.get(e.categoryId)} fmt={fmt} showDate={!isCurrentMonth} onEdit={openEdit} onDelete={removeExpense} />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted">{isCurrentMonth ? 'Nothing spent today yet.' : 'No expenses in this month.'}</p>
            )}
          </div>
          <div className="mt-3 hidden lg:block">
            <button type="button" className={`${btnPrimary} w-full`} onClick={() => openAdd()}><Plus size={20} aria-hidden /> Add expense</button>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Link to="/expenses" className="text-sm font-medium text-brand underline-offset-4 hover:underline">All expenses</Link>
        <ReportButton />
      </div>
    </div>
  );
}
