import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import NumberField from '../common/NumberField.jsx';
import Sheet from '../common/Sheet.jsx';
import { card, iconBtn, input } from '../common/ui.js';
import { ICON_CHOICES } from '../../data/defaults.js';
import { useBudget } from '../../hooks/useBudget.jsx';
import { useCategoryColors } from '../../hooks/useTheme.jsx';
import { getIcon } from '../../utils/icons.js';

function IconPicker({ open, current, onPick, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Choose an icon">
      <div className="grid grid-cols-6 gap-2 pt-2" role="listbox" aria-label="Icons">
        {ICON_CHOICES.map((name) => {
          const Icon = getIcon(name);
          return (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={name === current}
              aria-label={name}
              onClick={() => onPick(name)}
              className={`grid aspect-square place-items-center rounded-xl border transition ${name === current ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line hover:bg-sunken'}`}
            >
              <Icon size={22} aria-hidden />
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function Row({ category: c, symbol, color, onIcon, onDelete }) {
  const { updateCategory } = useBudget();
  const Icon = getIcon(c.icon);
  return (
    <li className="space-y-3 py-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onIcon} aria-label={`Change icon for ${c.name}`} className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-line hover:bg-sunken">
          <Icon size={22} aria-hidden />
          <span className="absolute -right-1 -top-1 size-3 rounded-full ring-2 ring-card" style={{ backgroundColor: color }} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor={`name-${c.id}`} className="sr-only">Category name</label>
          <input id={`name-${c.id}`} className={input} value={c.name} maxLength={40} onChange={(e) => updateCategory(c.id, { name: e.target.value })} onBlur={(e) => { if (!e.target.value.trim()) updateCategory(c.id, { name: 'Untitled' }); }} />
        </div>
        <button type="button" className={iconBtn} onClick={onDelete} aria-label={`Delete ${c.name}`}><Trash2 size={19} aria-hidden /></button>
      </div>
      <div className="flex items-end gap-3 pl-14">
        <NumberField className="w-40" label={`Budget for ${c.name}`} hideLabel prefix={symbol} value={c.budget} onCommit={(n) => updateCategory(c.id, { budget: n })} />
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--brand)]" checked={c.isSavings} onChange={(e) => updateCategory(c.id, { isSavings: e.target.checked })} />
          Savings
        </label>
      </div>
    </li>
  );
}

export default function CategoryEditor() {
  const { month, stats, fmt, deleteCategory } = useBudget();
  const colors = useCategoryColors();
  const [iconFor, setIconFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [moveTo, setMoveTo] = useState('');
  const { updateCategory } = useBudget();
  const symbol = fmt(0).replace(/[\d.,\s]/g, '');

  const target = deleting ? stats.find((c) => c.id === deleting) : null;
  const others = month.categories.filter((c) => c.id !== deleting);

  function askDelete(id) {
    setDeleting(id);
    setMoveTo(month.categories.find((c) => c.id !== id)?.id ?? '');
  }

  function confirmDelete() {
    deleteCategory(deleting, target.count > 0 && moveTo ? moveTo : null);
    setDeleting(null);
  }

  const current = month.categories.find((c) => c.id === iconFor);

  return (
    <>
      {month.categories.length === 0 ? (
        <p className={`${card} p-5 text-center text-sm text-muted`}>No categories yet. Add one below or load the sample budget.</p>
      ) : (
        <ul className={`${card} divide-y divide-line px-4`}>
          {month.categories.map((c) => (
            <Row key={c.id} category={c} symbol={symbol} color={colors.get(c.id)} onIcon={() => setIconFor(c.id)} onDelete={() => askDelete(c.id)} />
          ))}
        </ul>
      )}

      <IconPicker open={Boolean(current)} current={current?.icon} onClose={() => setIconFor(null)} onPick={(name) => { updateCategory(iconFor, { icon: name }); setIconFor(null); }} />

      <ConfirmDialog open={Boolean(target)} danger title={`Delete ${target?.name ?? 'category'}?`} confirmLabel="Delete category" onCancel={() => setDeleting(null)} onConfirm={confirmDelete}>
        {target && target.count > 0 ? (
          <>
            <p>{target.name} has {target.count} {target.count === 1 ? 'expense' : 'expenses'} totalling {fmt(target.spent)} this month. Choose what happens to them.</p>
            <div>
              <label htmlFor="move-to" className="mb-1.5 block text-sm font-medium text-ink">Move expenses to</label>
              <select id="move-to" className={input} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="">Delete these expenses too</option>
              </select>
            </div>
          </>
        ) : (
          <p>This category has no expenses, so nothing else changes.</p>
        )}
      </ConfirmDialog>
    </>
  );
}
