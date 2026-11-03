import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import AllocationSummary from '../components/budget/AllocationSummary.jsx';
import CategoryEditor from '../components/budget/CategoryEditor.jsx';
import MonthlyPlan from '../components/budget/MonthlyPlan.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { btnPrimary, btnSecondary } from '../components/common/ui.js';
import { useBudget } from '../hooks/useBudget.jsx';
import { monthLabel } from '../utils/dates.js';

export default function Budget() {
  const { month, monthKey, addCategory, loadSampleBudget } = useBudget();
  const toast = useToast();
  const [confirmSample, setConfirmSample] = useState(false);

  if (!month) return null;

  function add() {
    addCategory({ name: 'New category', budget: 0, icon: 'Tag' });
    // Focus the new row's name field once it has rendered.
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[id^="name-"]');
      const last = inputs[inputs.length - 1];
      last?.focus(); last?.select();
    }, 50);
  }

  function loadSample() {
    loadSampleBudget();
    setConfirmSample(false);
    toast('Sample ₹2,000 budget loaded. Your expenses are untouched.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-muted">Setup for {monthLabel(monthKey)}. Other months keep their own budgets.</p>
      </div>

      <section aria-labelledby="plan-h" className="space-y-3">
        <h2 id="plan-h" className="text-lg font-semibold tracking-tight">Monthly plan</h2>
        <MonthlyPlan />
      </section>

      <section aria-labelledby="cat-h" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="cat-h" className="text-lg font-semibold tracking-tight">Categories</h2>
        </div>
        <CategoryEditor />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className={btnPrimary} onClick={add}><Plus size={20} aria-hidden /> Add category</button>
          <button type="button" className={btnSecondary} onClick={() => (month.categories.length ? setConfirmSample(true) : loadSample())}>
            <Sparkles size={18} aria-hidden /> Load sample budget
          </button>
        </div>
      </section>

      <AllocationSummary />

      <ConfirmDialog open={confirmSample} title="Load the sample budget?" confirmLabel="Load sample" onCancel={() => setConfirmSample(false)} onConfirm={loadSample}>
        <p>This sets the spending budget to ₹2,000 and adds or resets Mobile Recharge (₹350), Travel (₹300), Essentials (₹200), Tea &amp; Snacks (₹600), Emergency Savings (₹500) and Extra Balance (₹50).</p>
        <p>Your recorded expenses are kept. Categories that already hold expenses are never removed.</p>
      </ConfirmDialog>
    </div>
  );
}
