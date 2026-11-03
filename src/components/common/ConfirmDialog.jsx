import Sheet from './Sheet.jsx';
import { btnDanger, btnPrimary, btnSecondary } from './ui.js';

export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} initialFocus="[data-cancel]">
      <div className="space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" data-cancel className={btnSecondary} onClick={onCancel}>Cancel</button>
        <button type="button" className={danger ? btnDanger : btnPrimary} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Sheet>
  );
}
