import { CalendarPlus, Copy, FileText, Sparkles } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget.jsx';
import { previousMonthKey } from '../../services/reducer.js';
import { monthLabel } from '../../utils/dates.js';
import { card } from './ui.js';

function Option({ icon: Icon, title, text, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${primary ? 'border-brand bg-brand-soft' : 'border-line bg-card hover:bg-sunken'}`}
    >
      <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${primary ? 'bg-brand text-brand-ink' : 'bg-sunken text-muted'}`}><Icon size={20} aria-hidden /></span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{text}</span>
      </span>
    </button>
  );
}

/** Shown instead of a page when the selected month has no budget yet. */
export default function NewMonthPrompt() {
  const { state, monthKey, startMonth } = useBudget();
  const prev = previousMonthKey(state.months, monthKey);

  return (
    <section className={`${card} mx-auto mt-6 max-w-xl p-5 sm:p-7`} aria-labelledby="new-month-title">
      <div className="mb-1 flex items-center gap-2 text-brand"><CalendarPlus size={20} aria-hidden /></div>
      <h1 id="new-month-title" className="text-xl font-semibold tracking-tight">Set up {monthLabel(monthKey)}</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Each month has its own budget, expenses and report. {prev ? `${monthLabel(prev)} stays exactly as it is.` : 'Choose how to begin.'}
      </p>
      <div className="mt-5 space-y-3">
        {prev && (
          <Option primary icon={Copy} title={`Copy ${monthLabel(prev)} budget`} text="Same categories, amounts and income. Expense history starts empty." onClick={() => startMonth(monthKey, 'copy', prev)} />
        )}
        <Option icon={Sparkles} title="Use the sample ₹2,000 budget" text="Mobile, Travel, Essentials, Tea & Snacks, Emergency Savings and Extra Balance." onClick={() => startMonth(monthKey, 'sample')} />
        <Option icon={FileText} title="Start blank" text="Add your own income and categories on the Budget page." onClick={() => startMonth(monthKey, 'blank')} />
      </div>
    </section>
  );
}
