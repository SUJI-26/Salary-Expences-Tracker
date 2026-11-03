import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import NumberField from '../common/NumberField.jsx';
import { btnSmall, card, iconBtn, input } from '../common/ui.js';
import { useBudget } from '../../hooks/useBudget.jsx';

export default function MonthlyPlan() {
  const { month, totals, fmt, setIncome, setSpendingBudget, addFixed, updateFixed, deleteFixed } = useBudget();
  const symbol = fmt(0).replace(/[\d.,\s]/g, '');
  const [fixedName, setFixedName] = useState('');
  const customLimit = month.spendingBudget !== null;

  function add(e) {
    e.preventDefault();
    addFixed({ name: fixedName.trim() || 'Fixed expense', amount: 0 });
    setFixedName('');
  }

  return (
    <div className={`${card} space-y-5 p-4 sm:p-5`}>
      <NumberField label="Monthly income / salary" prefix={symbol} value={month.income} onCommit={setIncome} />

      <div>
        <h3 className="mb-1 text-sm font-medium">Fixed expenses</h3>
        <p className="mb-3 text-sm text-muted">Costs that come out first, like PG rent.</p>
        {month.fixedExpenses.length > 0 && (
          <ul className="mb-3 space-y-3">
            {month.fixedExpenses.map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`fx-${f.id}`} className="sr-only">Fixed expense name</label>
                  <input id={`fx-${f.id}`} className={input} value={f.name} maxLength={40} onChange={(e) => updateFixed(f.id, { name: e.target.value })} />
                </div>
                <NumberField className="w-32 shrink-0" label={`${f.name} amount`} hideLabel prefix={symbol} value={f.amount} onCommit={(n) => updateFixed(f.id, { amount: n })} />
                <button type="button" className={iconBtn} onClick={() => deleteFixed(f.id)} aria-label={`Delete ${f.name}`}><Trash2 size={18} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="fx-new" className="sr-only">New fixed expense name</label>
            <input id="fx-new" className={input} placeholder="e.g. PG rent" value={fixedName} maxLength={40} onChange={(e) => setFixedName(e.target.value)} />
          </div>
          <button type="submit" className={`${btnSmall} h-12`}><Plus size={16} aria-hidden /> Add</button>
        </form>
      </div>

      <div>
        <NumberField
          label="Spending budget for the month"
          prefix={symbol}
          value={customLimit ? month.spendingBudget : totals.available}
          onCommit={(n) => setSpendingBudget(n)}
          aria-describedby="spend-help"
        />
        <p id="spend-help" className="mt-1.5 text-sm text-muted">
          {customLimit ? 'The most you plan to spend across all categories.' : 'Currently everything left after fixed expenses.'}
          {customLimit && (
            <button type="button" className="ml-1 min-h-11 font-medium text-brand underline-offset-2 hover:underline" onClick={() => setSpendingBudget(null)}>
              Use full amount ({fmt(totals.available)})
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
