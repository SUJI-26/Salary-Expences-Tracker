import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';
import { btnPrimary, card } from '../common/ui.js';

const KEY = 'set:install-dismissed';
const wasDismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** Offers "install as an app" once the browser says it can. Dismissal is remembered. */
export default function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(wasDismissed);
  if (!canInstall || hidden) return null;

  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

  return (
    <div className={`${card} flex items-center gap-3 p-3 pl-4`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Download size={19} aria-hidden /></span>
      <p className="min-w-0 flex-1 text-sm leading-snug"><strong className="font-semibold">Install Expense Tracker</strong><br /><span className="text-muted">Opens like an app and works offline.</span></p>
      <button type="button" className={`${btnPrimary} h-11 px-4 text-sm`} onClick={install}>Install</button>
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken"><X size={18} aria-hidden /></button>
    </div>
  );
}
