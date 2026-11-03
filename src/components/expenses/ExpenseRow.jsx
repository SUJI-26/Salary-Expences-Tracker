import { Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dates.js';
import { getIcon } from '../../utils/icons.js';
import { iconBtn } from '../common/ui.js';

/** One expense. `category` may be undefined for orphaned records (category was removed in an older backup). */
export default function ExpenseRow({ expense: e, category, fmt, onEdit, onDelete, showDate = false }) {
  const Icon = getIcon(category?.icon);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink"><Icon size={19} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{e.name}</p>
        <p className="truncate text-sm text-muted">
          {category?.name ?? 'Uncategorised'}
          {showDate && ` · ${formatDate(e.date, { withYear: true })}`}
          {e.notes && ` · ${e.notes}`}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-semibold tabular-nums">{fmt(e.amount)}</p>
      {onEdit && <button type="button" className={`${iconBtn} -mr-1`} onClick={() => onEdit(e)} aria-label={`Edit ${e.name}`}><Pencil size={17} aria-hidden /></button>}
      {onDelete && <button type="button" className={`${iconBtn} -mr-2`} onClick={() => onDelete(e)} aria-label={`Delete ${e.name}`}><Trash2 size={17} aria-hidden /></button>}
    </li>
  );
}
