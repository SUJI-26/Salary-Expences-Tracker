import { useState } from 'react';
import { FileDown, LoaderCircle } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget.jsx';
import { useToast } from '../common/Toast.jsx';
import { btnSecondary } from '../common/ui.js';

export default function ReportButton({ className = '' }) {
  const { month, monthKey, settings } = useBudget();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!month || busy) return;
    setBusy(true);
    try {
      // Loaded on demand: the PDF library is only fetched when someone asks for a report.
      const { downloadMonthlyReport } = await import('../../services/pdfReport.js');
      const filename = await downloadMonthlyReport({ monthKey, month, currency: settings.currency });
      toast(`Saved ${filename}`);
    } catch (err) {
      console.error(err);
      toast('Could not create the report. Please try again.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={`${btnSecondary} ${className}`} onClick={download} disabled={!month || busy} aria-busy={busy}>
      {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <FileDown size={18} aria-hidden />}
      {busy ? 'Preparing…' : 'Download Monthly Report'}
    </button>
  );
}
