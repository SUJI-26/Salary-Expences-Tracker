import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ChartColumn, CreditCard, LayoutDashboard, Plus, Settings, SlidersHorizontal, TriangleAlert, Wallet } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget.jsx';
import { ExpenseSheetProvider, useExpenseSheet } from '../expenses/ExpenseSheet.jsx';
import MonthSwitcher from './MonthSwitcher.jsx';
import NewMonthPrompt from './NewMonthPrompt.jsx';
import { btnPrimary } from './ui.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'Expenses', icon: CreditCard },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/budget', label: 'Budget', icon: SlidersHorizontal },
];

const linkBase = 'transition';

function Shell() {
  const { month, saveFailed } = useBudget();
  const { openAdd } = useExpenseSheet();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();

  // PWA shortcut "Add expense" opens the sheet straight away (/?add=1).
  useEffect(() => {
    if (params.get('add') && month?.categories.length) {
      openAdd();
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams, month, openAdd]);

  const needsSetup = !month && pathname !== '/settings';
  const canAdd = Boolean(month?.categories.length);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-ink"><Wallet size={19} aria-hidden /></span>
          <span className="text-[15px] font-semibold leading-tight">Smart Expense<br />Tracker</span>
        </div>
        <nav aria-label="Main" className="space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `${linkBase} flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${isActive ? 'bg-brand-soft text-ink' : 'text-muted hover:bg-sunken hover:text-ink'}`}>
              <Icon size={19} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6">
          <button type="button" className={`${btnPrimary} w-full`} disabled={!canAdd} onClick={() => openAdd()}>
            <Plus size={20} aria-hidden /> Add expense
          </button>
        </div>
        <NavLink to="/settings" className={({ isActive }) => `${linkBase} mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${isActive ? 'bg-brand-soft text-ink' : 'text-muted hover:bg-sunken hover:text-ink'}`}>
          <Settings size={19} aria-hidden /> Settings
        </NavLink>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-page/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-ink"><Wallet size={17} aria-hidden /></span>
              <span className="sr-only">Smart Expense Tracker</span>
            </div>
            <MonthSwitcher />
            <NavLink to="/settings" aria-label="Settings" className={({ isActive }) => `grid size-11 place-items-center rounded-xl lg:hidden ${isActive ? 'bg-brand-soft text-ink' : 'text-muted hover:bg-sunken'}`}>
              <Settings size={21} aria-hidden />
            </NavLink>
            <span className="hidden w-11 lg:block" />
          </div>
        </header>

        {saveFailed && (
          <div role="alert" className="mx-auto mt-3 flex max-w-5xl items-start gap-2 px-4 lg:px-8">
            <div className="flex w-full items-start gap-2 rounded-xl bg-bad-soft px-3.5 py-3 text-sm text-bad">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>Your latest changes could not be saved on this device (storage is full or blocked). Export a backup from Settings.</span>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 lg:px-8 lg:pb-12 lg:pt-6">
          {needsSetup ? <NewMonthPrompt /> : <Outlet />}
        </main>
      </div>

      {/* Mobile: floating add button + bottom navigation */}
      {canAdd && pathname !== '/settings' && (
        <button
          type="button"
          onClick={() => openAdd()}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-2xl bg-brand pl-4 pr-5 text-base font-semibold text-brand-ink shadow-lg shadow-black/20 transition active:scale-95 lg:hidden"
        >
          <Plus size={22} aria-hidden /> Add Expense
        </button>
      )}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition ${isActive ? 'text-brand' : 'text-muted'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-14 place-items-center rounded-full transition ${isActive ? 'bg-brand-soft' : ''}`}><Icon size={21} aria-hidden /></span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default function Layout() {
  return (
    <ExpenseSheetProvider>
      <Shell />
    </ExpenseSheetProvider>
  );
}
