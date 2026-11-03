import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPie } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';
import ProgressBar, { StatusBadge } from '../components/common/ProgressBar.jsx';
import { card } from '../components/common/ui.js';
import ReportButton from '../components/reports/ReportButton.jsx';
import { useBudget } from '../hooks/useBudget.jsx';
import { useCategoryColors, useResolvedTheme } from '../hooks/useTheme.jsx';
import { buildAlerts, dailySpending, topCategories } from '../utils/calc.js';
import { CHART_INK } from '../utils/colors.js';
import { daysInMonth, formatDate, monthLabel, todayISO } from '../utils/dates.js';
import { formatCompact, round2 } from '../utils/money.js';

function Section({ title, children, id }) {
  return (
    <section aria-labelledby={id} className={`${card} p-4 sm:p-5`}>
      <h2 id={id} className="mb-3 text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function TooltipBox({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-lg">{render(payload[0])}</div>;
}

export default function Analytics() {
  const { month, monthKey, stats, totals, fmt, isCurrentMonth } = useBudget();
  const theme = useResolvedTheme();
  const colors = useCategoryColors();
  const ink = CHART_INK[theme];

  if (!month || !totals) return null;

  const spentStats = stats.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const top = topCategories(stats, 5);
  const daily = dailySpending(month, monthKey);
  const alerts = buildAlerts(stats, totals, fmt);
  const dayOfMonth = Number(todayISO().slice(8, 10));
  const total = daysInMonth(monthKey);
  const daysLeft = total - dayOfMonth + 1;
  const elapsed = isCurrentMonth ? dayOfMonth : total;
  const avg = round2(totals.spent / elapsed);
  const safePerDay = isCurrentMonth && totals.remaining > 0 ? round2(totals.remaining / daysLeft) : null;
  const busiest = daily.reduce((best, d) => (d.amount > best.amount ? d : best), { amount: 0 });
  const hasData = totals.spent > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted">{monthLabel(monthKey)}</p>
        </div>
        <ReportButton />
      </div>

      <Section id="progress-h" title="Monthly budget progress">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-2xl font-semibold tabular-nums">{fmt(totals.spent)} <span className="text-base font-normal text-muted">of {fmt(totals.allocated)}</span></p>
          <StatusBadge status={totals.status} />
        </div>
        <ProgressBar percent={totals.percentUsed} status={totals.status} label="Monthly budget used" className="mt-3" />
        <p className="mt-2 text-sm text-muted">
          {totals.remaining >= 0 ? `${fmt(totals.remaining)} remaining` : `${fmt(-totals.remaining)} over budget`} · {Math.round(totals.percentUsed)}% used
        </p>
        {(avg > 0 || safePerDay) && (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Average per day</dt><dd className="font-semibold tabular-nums">{fmt(avg)}</dd></div>
            {safePerDay && <div><dt className="text-muted">Safe to spend per day</dt><dd className="font-semibold tabular-nums">{fmt(safePerDay)}</dd></div>}
          </dl>
        )}
      </Section>

      <Section id="alerts-h" title="Budget alerts">
        {alerts.length ? (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${a.level === 'danger' ? 'bg-bad-soft text-bad' : a.level === 'warning' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-ink'}`}>
                {a.level === 'danger' ? '🚨' : a.level === 'warning' ? '⚠' : '💰'} {a.text}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Set a budget to see alerts.</p>}
      </Section>

      {!hasData ? (
        <EmptyState icon={ChartPie} title="No spending to chart yet">Add an expense and your category breakdown and daily trend will appear here.</EmptyState>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section id="donut-h" title="Spending by category">
              <div className="relative mx-auto h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={spentStats} dataKey="spent" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke={ink.surface} strokeWidth={2} isAnimationActive={false}>
                      {spentStats.map((c) => <Cell key={c.id} fill={colors.get(c.id)} />)}
                    </Pie>
                    <Tooltip content={<TooltipBox render={(p) => <><strong>{p.name}</strong><br />{fmt(p.value)}</>} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><p className="text-xs text-muted">Total spent</p><p className="text-lg font-semibold tabular-nums">{fmt(totals.spent)}</p></div>
                </div>
              </div>
              <ul className="mt-4 divide-y divide-line">
                {spentStats.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: colors.get(c.id) }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-muted">{Math.round((c.spent / totals.spent) * 100)}%</span>
                    <span className="w-20 text-right font-semibold tabular-nums">{fmt(c.spent)}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="top-h" title="Top spending categories">
              <ol className="space-y-4">
                {top.map((c, i) => (
                  <li key={c.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{i + 1}. {c.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{fmt(c.spent)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                      <div className="bar-fill h-full rounded-full" style={{ width: `${(c.spent / top[0].spent) * 100}%`, backgroundColor: colors.get(c.id) }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{c.count} {c.count === 1 ? 'expense' : 'expenses'} · {Math.round((c.spent / totals.spent) * 100)}% of spending</p>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <Section id="trend-h" title="Daily spending">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={ink.grid} />
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: ink.grid }} tick={{ fill: ink.tick, fontSize: 11 }} interval="preserveStartEnd" minTickGap={14} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: ink.tick, fontSize: 11 }} tickFormatter={formatCompact} width={42} />
                  <Tooltip cursor={{ fill: ink.grid, opacity: 0.4 }} content={<TooltipBox render={(p) => <><strong>{formatDate(p.payload.date)}</strong><br />{fmt(p.value)}</>} />} />
                  <Bar dataKey="amount" fill={theme === 'dark' ? '#3987e5' : '#2a78d6'} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-muted">{busiest.amount > 0 && <>Highest day: <strong className="font-semibold text-ink">{formatDate(busiest.date)}</strong> ({fmt(busiest.amount)})</>}</p>
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer py-2.5 font-medium text-brand">View as table</summary>
              <table className="mt-1 w-full text-left">
                <thead className="text-muted"><tr><th className="py-1.5 font-medium">Date</th><th className="py-1.5 text-right font-medium">Spent</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {daily.filter((d) => d.amount > 0).map((d) => (
                    <tr key={d.date}><td className="py-1.5">{formatDate(d.date)}</td><td className="py-1.5 text-right tabular-nums">{fmt(d.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Section>
        </>
      )}
    </div>
  );
}
