import { useCategoryColors } from '../../hooks/useTheme.jsx';

/**
 * The app's signature element: one bar for the whole month. Each category is a segment sized by
 * its budget; the solid part is how much of it has been spent, so every expense visibly drains
 * exactly one segment. Segments for exceeded categories get a red outline.
 */
export default function AllocationBar({ stats, fmt }) {
  const colors = useCategoryColors();
  const segments = stats.filter((c) => c.budget > 0);
  const total = segments.reduce((n, c) => n + c.budget, 0);

  const summary = segments.map((c) => `${c.name}: ${fmt(c.spent)} of ${fmt(c.budget)}`).join('; ');

  if (!total) return <div className="h-4 rounded-md bg-sunken" aria-hidden />;

  return (
    <div role="img" aria-label={`Budget by category. ${summary}`} className="flex h-4 gap-[3px]">
      {segments.map((c) => {
        const color = colors.get(c.id);
        const filled = Math.min(100, c.percent);
        return (
          <div
            key={c.id}
            title={`${c.name}: ${fmt(c.spent)} of ${fmt(c.budget)}`}
            className={`relative h-full min-w-[6px] overflow-hidden rounded-[5px] ${c.status === 'exceeded' ? 'outline-2 -outline-offset-2 outline-bad' : ''}`}
            style={{ flexGrow: c.budget, flexBasis: 0, backgroundColor: `${color}33` }}
          >
            <div className="bar-fill absolute inset-y-0 left-0" style={{ width: `${filled}%`, backgroundColor: color }} />
          </div>
        );
      })}
    </div>
  );
}
