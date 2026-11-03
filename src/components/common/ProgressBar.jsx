import { CircleAlert, TriangleAlert } from 'lucide-react';

// Status colours: normal < 70%, warning 70–90%, danger > 90%, exceeded > 100%.
const FILL = { ok: 'bg-brand', warning: 'bg-[#d98a0b] dark:bg-warn', danger: 'bg-bad', exceeded: 'bg-bad' };

export const STATUS_LABEL = {
  ok: null,
  warning: 'Near limit',
  danger: 'Almost used up',
  exceeded: 'Budget exceeded',
};

export function StatusBadge({ status }) {
  const text = STATUS_LABEL[status];
  if (!text) return null;
  const bad = status === 'danger' || status === 'exceeded';
  const Icon = bad ? CircleAlert : TriangleAlert;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${bad ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn'}`}>
      <Icon size={12} aria-hidden /> {text}
    </span>
  );
}

export default function ProgressBar({ percent, status = 'ok', label, className = '' }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(percent, 100))}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-sunken ${className}`}
    >
      <div className={`bar-fill h-full rounded-full ${FILL[status]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
