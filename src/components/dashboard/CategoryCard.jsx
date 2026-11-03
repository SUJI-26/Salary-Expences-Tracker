import { useCategoryColors } from '../../hooks/useTheme.jsx';
import { getIcon } from '../../utils/icons.js';
import ProgressBar, { StatusBadge } from '../common/ProgressBar.jsx';
import { card } from '../common/ui.js';

function Figure({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`truncate text-[15px] font-semibold tabular-nums ${tone ?? ''}`}>{value}</dd>
    </div>
  );
}

export default function CategoryCard({ category: c, fmt, onAdd }) {
  const Icon = getIcon(c.icon);
  const color = useCategoryColors().get(c.id);
  const over = c.remaining < 0;

  return (
    <article className={`${card} p-4`} aria-label={c.name}>
      <header className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${color}2e` }}>
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-base font-semibold leading-tight">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <span className="min-w-0 break-words">{c.name}</span>
          </h3>
          <div className="mt-0.5 min-h-5"><StatusBadge status={c.status} /></div>
        </div>
        <button type="button" onClick={onAdd} aria-label={`Add expense to ${c.name}`} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-lg font-semibold text-ink transition hover:bg-line active:scale-95">+</button>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Figure label="Budget" value={fmt(c.budget)} />
        <Figure label="Spent" value={fmt(c.spent)} />
        <Figure label={over ? 'Over by' : 'Remaining'} value={fmt(over ? c.exceededBy : c.remaining)} tone={over ? 'text-bad' : ''} />
      </dl>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar percent={c.percent} status={c.status} label={`${c.name} budget used`} className="flex-1" />
        <span className="w-10 text-right text-xs font-medium tabular-nums text-muted">{Math.round(c.percent)}%</span>
      </div>
    </article>
  );
}
