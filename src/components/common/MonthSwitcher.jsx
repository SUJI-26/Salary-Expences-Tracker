import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget.jsx';
import { currentMonthKey, monthLabel, shiftMonth } from '../../utils/dates.js';
import { iconBtn } from './ui.js';

/** Prev / next arrows around a native select, so any month (even one not yet set up) is two taps away. */
export default function MonthSwitcher() {
  const { state, monthKey, setActiveMonth } = useBudget();

  const options = useMemo(() => {
    const keys = Object.keys(state.months).sort();
    const cur = currentMonthKey();
    const first = [keys[0] ?? cur, cur].sort()[0];
    const last = shiftMonth([keys[keys.length - 1] ?? cur, cur].sort().pop(), 1); // one month ahead to plan in advance
    const list = [];
    for (let k = first; k <= last; k = shiftMonth(k, 1)) list.push(k);
    if (!list.includes(monthKey)) list.push(monthKey);
    return list.sort();
  }, [state.months, monthKey]);

  const idx = options.indexOf(monthKey);
  const prev = options[idx - 1];
  const next = options[idx + 1];

  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={iconBtn} disabled={!prev} onClick={() => setActiveMonth(prev)} aria-label="Previous month">
        <ChevronLeft size={20} aria-hidden />
      </button>
      <div className="relative">
        <label htmlFor="month-select" className="sr-only">Month</label>
        <select
          id="month-select"
          value={monthKey}
          onChange={(e) => setActiveMonth(e.target.value)}
          className="h-11 cursor-pointer appearance-none rounded-xl bg-transparent px-2 text-center text-[15px] font-semibold hover:bg-sunken"
        >
          {[...options].reverse().map((k) => (
            <option key={k} value={k}>{monthLabel(k)}{state.months[k] ? '' : ' (not set up)'}</option>
          ))}
        </select>
      </div>
      <button type="button" className={iconBtn} disabled={!next} onClick={() => setActiveMonth(next)} aria-label="Next month">
        <ChevronRight size={20} aria-hidden />
      </button>
    </div>
  );
}
