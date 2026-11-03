import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget.jsx';
import { sumMoney, round2 } from '../../utils/money.js';
import { card } from '../common/ui.js';

function Line({ label, value, sign, strong, tone }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? 'border-t border-line pt-3 text-base font-semibold' : 'text-[15px]'}`}>
      <dt className={strong ? '' : 'text-muted'}>{sign && <span className="mr-2 inline-block w-3 text-center" aria-hidden>{sign}</span>}{label}</dt>
      <dd className={`tabular-nums ${tone ?? ''}`}>{value}</dd>
    </div>
  );
}

/** Income − fixed − allocations = unallocated, with an unmissable warning when it goes negative. */
export default function AllocationSummary() {
  const { month, totals, fmt } = useBudget();
  const outside = round2(totals.available - totals.spendingBudget); // kept out of the spending budget on purpose
  const over = totals.overAllocated;
  const aboveAvailable = totals.spendingBudget > totals.available;
  const fixedTotal = sumMoney(month.fixedExpenses.map((f) => f.amount));

  return (
    <section className={`${card} p-4 sm:p-5`} aria-labelledby="calc-h">
      <h3 id="calc-h" className="mb-1 text-sm font-medium text-muted">Where the money goes</h3>
      <dl>
        <Line label="Income" value={fmt(totals.income)} />
        <Line sign="−" label="Fixed expenses" value={fmt(fixedTotal)} />
        {outside > 0 && <Line sign="−" label="Kept outside spending budget" value={fmt(outside)} />}
        <Line sign="−" label="Category allocations" value={fmt(totals.allocated)} />
        <Line sign="=" strong label="Unallocated" value={fmt(totals.unallocated)} tone={over ? 'text-bad' : ''} />
      </dl>

      {over && (
        <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          Categories add up to {fmt(totals.allocated)}, which is {fmt(Math.abs(totals.unallocated))} more than your {fmt(totals.spendingBudget)} spending budget. Lower a category or raise the budget.
        </p>
      )}
      {!over && aboveAvailable && (
        <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-warn-soft px-3.5 py-3 text-sm font-medium text-warn">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          Your spending budget is {fmt(totals.spendingBudget - totals.available)} more than what is left after fixed expenses ({fmt(totals.available)}).
        </p>
      )}
      {!over && !aboveAvailable && totals.allocated > 0 && (
        <p className="mt-3 flex gap-2 rounded-xl bg-brand-soft px-3.5 py-3 text-sm font-medium">
          <CircleCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          {totals.unallocated === 0 ? 'Every rupee is allocated.' : `${fmt(totals.unallocated)} is still unallocated.`}
        </p>
      )}
    </section>
  );
}
