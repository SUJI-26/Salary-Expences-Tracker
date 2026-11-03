// Shared class strings. Kept as full literals so Tailwind can see them.
export const card = 'rounded-2xl border border-line bg-card shadow-card';

export const input =
  'h-12 w-full rounded-xl border border-line bg-card px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

export const label = 'mb-1.5 block text-sm font-medium text-ink';

const btn =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';
export const btnPrimary = `${btn} bg-brand text-brand-ink hover:brightness-110`;
export const btnSecondary = `${btn} border border-line bg-card text-ink hover:bg-sunken`;
export const btnDanger = `${btn} bg-bad text-page hover:brightness-110`;
export const btnSmall =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink transition hover:bg-sunken active:scale-[0.98] disabled:opacity-50';
export const iconBtn =
  'grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-sunken hover:text-ink active:scale-95';
