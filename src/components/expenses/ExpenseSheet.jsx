import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Sheet from '../common/Sheet.jsx';
import { useToast } from '../common/Toast.jsx';
import { useBudget } from '../../hooks/useBudget.jsx';
import { categoryStats } from '../../utils/calc.js';
import { clampToMonth, firstDayOf, lastDayOf, monthLabel, todayISO } from '../../utils/dates.js';
import { getIcon } from '../../utils/icons.js';
import { parseAmount, round2 } from '../../utils/money.js';
import { btnDanger, btnPrimary, input, label } from '../common/ui.js';

const SheetContext = createContext({ openAdd: () => {}, openEdit: () => {} });
export const useExpenseSheet = () => useContext(SheetContext);

let lastCategoryId = null; // remembered for the session so repeat entries are one tap faster

export function ExpenseSheetProvider({ children }) {
  const [sheet, setSheet] = useState({ open: false, mode: 'add', expense: null, categoryId: null, seq: 0 });
  const openAdd = useCallback((opts = {}) => setSheet((s) => ({ open: true, mode: 'add', expense: null, categoryId: opts.categoryId ?? null, seq: s.seq + 1 })), []);
  const openEdit = useCallback((expense) => setSheet((s) => ({ open: true, mode: 'edit', expense, categoryId: null, seq: s.seq + 1 })), []);
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);
  const api = useMemo(() => ({ openAdd, openEdit }), [openAdd, openEdit]);

  return (
    <SheetContext.Provider value={api}>
      {children}
      <Sheet open={sheet.open} onClose={close} title={sheet.mode === 'edit' ? 'Edit expense' : 'Add expense'} initialFocus="[data-autofocus]">
        {sheet.open && <ExpenseForm key={sheet.seq} {...sheet} onDone={close} />}
      </Sheet>
    </SheetContext.Provider>
  );
}

function ExpenseForm({ mode, expense, categoryId: presetCategory, onDone }) {
  const { state, monthKey, fmt, addExpense, updateExpense, deleteExpense, restoreExpense, settings } = useBudget();
  const toast = useToast();
  const editing = mode === 'edit';
  const formMonth = editing ? expense.date.slice(0, 7) : monthKey; // an expense never moves between months
  const month = state.months[formMonth];
  const categories = month?.categories ?? [];
  const stats = useMemo(() => (month ? categoryStats(month) : []), [month]);

  const initialCategory = editing
    ? expense.categoryId
    : [presetCategory, lastCategoryId].find((id) => id && categories.some((c) => c.id === id)) ?? categories[0]?.id ?? '';

  const [name, setName] = useState(editing ? expense.name : '');
  const [amount, setAmount] = useState(editing ? String(expense.amount) : '');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [date, setDate] = useState(editing ? expense.date : clampToMonth(todayISO(), formMonth));
  const [notes, setNotes] = useState(editing ? expense.notes ?? '' : '');
  const [errors, setErrors] = useState({});

  const symbol = fmt(0).replace(/[\d.,\s]/g, '');
  const parsed = parseAmount(amount);
  const stat = stats.find((s) => s.id === categoryId);
  const suggestions = useMemo(
    () => [...new Set((month?.expenses ?? []).filter((e) => e.categoryId === categoryId).map((e) => e.name))].slice(0, 20),
    [month, categoryId],
  );

  // Heads-up (never a block) when this entry pushes the category over its budget.
  const priorAmount = editing && expense.categoryId === categoryId ? expense.amount : 0;
  const projected = stat && Number.isFinite(parsed) && parsed > 0 ? round2(stat.remaining + priorAmount - parsed) : null;

  function validate() {
    const next = {};
    if (!name.trim()) next.name = 'Enter what you spent on.';
    if (amount.trim() === '' || Number.isNaN(parsed)) next.amount = 'Enter an amount like 15 or 15.50.';
    else if (parsed <= 0) next.amount = 'Amount must be more than 0.';
    if (!categoryId) next.category = 'Choose a category.';
    if (!date || date < firstDayOf(formMonth) || date > lastDayOf(formMonth)) next.date = `Pick a date in ${monthLabel(formMonth)}.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    const data = { name, amount: round2(parsed), categoryId, date, notes };
    lastCategoryId = categoryId;
    if (editing) {
      updateExpense(expense.id, formMonth, { name: data.name.trim(), amount: data.amount, categoryId, date, notes: notes.trim() });
      toast('Expense updated.');
    } else {
      addExpense(data);
      const left = stat ? round2(stat.remaining - data.amount) : null;
      toast(`${data.name.trim()} ${fmt(data.amount)} added${stat ? ` · ${stat.name}: ${left < 0 ? `${fmt(-left)} over budget` : `${fmt(left)} left`}` : ''}`);
    }
    onDone();
  }

  function remove() {
    deleteExpense(expense.id, formMonth);
    toast(`Deleted ${expense.name}.`, { action: { label: 'Undo', onClick: () => restoreExpense(expense) } });
    onDone();
  }

  if (!categories.length) {
    return <p className="pb-4 text-sm text-muted">Add at least one category on the Budget page before recording expenses.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 pt-2">
      <div>
        <label htmlFor="exp-name" className={label}>Expense name</label>
        <input id="exp-name" data-autofocus list="exp-suggestions" className={`${input} ${errors.name ? 'border-bad' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tea" maxLength={80} autoComplete="off" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} />
        <datalist id="exp-suggestions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        {errors.name && <p id="err-name" className="mt-1 text-sm text-bad">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="exp-amount" className={label}>Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted" aria-hidden>{symbol}</span>
          <input id="exp-amount" inputMode="decimal" autoComplete="off" className={`${input} pl-9 text-lg font-semibold tabular-nums ${errors.amount ? 'border-bad' : ''}`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15" aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'err-amount' : undefined} />
        </div>
        {errors.amount && <p id="err-amount" className="mt-1 text-sm text-bad">{errors.amount}</p>}
      </div>

      <fieldset>
        <legend className={label}>Category</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Category">
          {categories.map((c) => {
            const Icon = getIcon(c.icon);
            const selected = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategoryId(c.id)}
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${selected ? 'border-brand bg-brand-soft text-ink ring-1 ring-brand' : 'border-line bg-card text-ink hover:bg-sunken'}`}
              >
                <Icon size={18} className="shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
        {errors.category && <p className="mt-1 text-sm text-bad">{errors.category}</p>}
      </fieldset>

      {projected !== null && projected < 0 && (
        <p role="status" className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          This puts {stat.name} {fmt(-projected)} over budget. You can still save it.
        </p>
      )}

      <div>
        <label htmlFor="exp-date" className={label}>Date</label>
        <input id="exp-date" type="date" className={`${input} ${errors.date ? 'border-bad' : ''}`} value={date} min={firstDayOf(formMonth)} max={lastDayOf(formMonth)} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
        {errors.date && <p className="mt-1 text-sm text-bad">{errors.date}</p>}
      </div>

      <div>
        <label htmlFor="exp-notes" className={label}>Notes <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="exp-notes" rows={2} maxLength={200} className={`${input} h-auto py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className={`grid gap-3 pt-1 ${editing ? 'grid-cols-[auto_1fr]' : ''}`}>
        {editing && (
          <button type="button" className={btnDanger} onClick={remove} aria-label="Delete expense"><Trash2 size={18} aria-hidden /></button>
        )}
        <button type="submit" className={btnPrimary}>{editing ? 'Save changes' : 'Add expense'}</button>
      </div>
      <span className="sr-only">{settings.currency}</span>
    </form>
  );
}
