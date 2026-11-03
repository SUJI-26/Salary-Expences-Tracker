import { useRef, useState } from 'react';
import { Download, Monitor, Moon, RotateCcw, Sun, Trash2, Upload } from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { btnSecondary, card, input } from '../components/common/ui.js';
import { useBudget } from '../hooks/useBudget.jsx';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { backupFilename, countStats, downloadBlob, exportPayload, sanitizeState } from '../services/storage.js';
import { CURRENCIES } from '../utils/money.js';

const THEMES = [
  ['system', 'System', Monitor],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
];

function Group({ title, children, id }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className={`${card} divide-y divide-line px-4`}>{children}</div>
    </section>
  );
}

const Item = ({ children }) => <div className="py-4">{children}</div>;

export default function Settings() {
  const { state, settings, setSettings, replaceState, resetDemo, clearAll } = useBudget();
  const toast = useToast();
  const { canInstall, installed, ios, install } = useInstallPrompt();
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // validated import waiting for confirmation
  const [importError, setImportError] = useState('');
  const [confirm, setConfirm] = useState(null); // 'clear' | 'demo'

  const counts = countStats(state);

  function exportData() {
    const blob = new Blob([JSON.stringify(exportPayload(state), null, 2)], { type: 'application/json' });
    downloadBlob(blob, backupFilename());
    toast('Backup downloaded.');
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('That file is too large to be a backup.');
      const { state: next, dropped } = sanitizeState(JSON.parse(await file.text()));
      setPending({ next, dropped, name: file.name });
    } catch (err) {
      setImportError(err instanceof SyntaxError ? 'That file is not valid JSON.' : err.message);
    }
  }

  const pendingCounts = pending ? countStats(pending.next) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Group title="Appearance" id="appearance-h">
        <Item>
          <p className="mb-2 text-sm font-medium" id="theme-label">Theme</p>
          <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-2">
            {THEMES.map(([value, name, Icon]) => (
              <button key={value} type="button" role="radio" aria-checked={settings.theme === value} onClick={() => setSettings({ theme: value })}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${settings.theme === value ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line hover:bg-sunken'}`}>
                <Icon size={17} aria-hidden /> {name}
              </button>
            ))}
          </div>
        </Item>
        <Item>
          <label htmlFor="currency" className="mb-1.5 block text-sm font-medium">Currency</label>
          <select id="currency" className={input} value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
            {Object.values(CURRENCIES).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <p className="mt-1.5 text-sm text-muted">Changes the symbol only. Amounts are not converted.</p>
        </Item>
      </Group>

      <Group title="App" id="app-h">
        <Item>
          <p className="text-sm font-medium">Install on your phone</p>
          {installed ? (
            <p className="mt-1 text-sm text-muted">Installed. You are using the app version.</p>
          ) : canInstall ? (
            <button type="button" className={`${btnSecondary} mt-2`} onClick={install}><Download size={18} aria-hidden /> Install app</button>
          ) : ios ? (
            <p className="mt-1 text-sm text-muted">In Safari, tap Share, then Add to Home Screen.</p>
          ) : (
            <p className="mt-1 text-sm text-muted">On Android Chrome, open the browser menu and choose Install app (or Add to Home screen).</p>
          )}
        </Item>
      </Group>

      <Group title="Your data" id="data-h">
        <Item>
          <p className="text-sm text-muted">
            Everything is stored on this device only: {counts.months} {counts.months === 1 ? 'month' : 'months'}, {counts.expenses} {counts.expenses === 1 ? 'expense' : 'expenses'}.
            Clearing your browser data or changing phones will erase it, so export a backup now and then.
          </p>
        </Item>
        <Item>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className={btnSecondary} onClick={exportData}><Download size={18} aria-hidden /> Export data</button>
            <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}><Upload size={18} aria-hidden /> Import backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-label="Choose backup file" />
          </div>
          {importError && <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{importError}</p>}
        </Item>
        <Item>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className={btnSecondary} onClick={() => setConfirm('demo')}><RotateCcw size={18} aria-hidden /> Reset to demo data</button>
            <button type="button" className={`${btnSecondary} border-bad/40 text-bad hover:bg-bad-soft`} onClick={() => setConfirm('clear')}><Trash2 size={18} aria-hidden /> Clear all data</button>
          </div>
        </Item>
      </Group>

      <ConfirmDialog open={Boolean(pending)} title="Replace your data with this backup?" confirmLabel="Replace data" danger onCancel={() => setPending(null)}
        onConfirm={() => { replaceState(pending.next); setPending(null); toast('Backup imported.'); }}>
        {pending && (
          <>
            <p>{pending.name} contains {pendingCounts.months} {pendingCounts.months === 1 ? 'month' : 'months'} and {pendingCounts.expenses} {pendingCounts.expenses === 1 ? 'expense' : 'expenses'}.</p>
            <p>Your current data ({counts.months} months, {counts.expenses} expenses) will be replaced. Export it first if you want to keep it.</p>
            {pending.dropped > 0 && <p className="text-warn">{pending.dropped} unusable {pending.dropped === 1 ? 'record was' : 'records were'} skipped.</p>}
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog open={confirm === 'clear'} danger title="Clear all data?" confirmLabel="Delete everything" onCancel={() => setConfirm(null)}
        onConfirm={() => { clearAll(); setConfirm(null); toast('All data cleared.'); }}>
        <p>This permanently deletes every month, budget and expense stored on this device ({counts.expenses} expenses). It cannot be undone.</p>
        <p>Tip: use Export data first if you may want it back.</p>
      </ConfirmDialog>

      <ConfirmDialog open={confirm === 'demo'} danger title="Reset to demo data?" confirmLabel="Reset" onCancel={() => setConfirm(null)}
        onConfirm={() => { resetDemo(); setConfirm(null); toast('Demo data restored.'); }}>
        <p>Your current data will be replaced with the sample ₹2,000 budget and example expenses.</p>
      </ConfirmDialog>
    </div>
  );
}
