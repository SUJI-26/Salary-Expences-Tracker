import { useEffect, useId, useState } from 'react';
import { parseAmount } from '../../utils/money.js';
import { input as inputCls } from './ui.js';

/**
 * Money input that keeps what the user is typing as text (so "12." and "" behave) and
 * reports a valid number upward on every keystroke. Resets to the stored value on blur.
 */
export default function NumberField({ value, onCommit, prefix, label, hideLabel = false, className = '', ...rest }) {
  const id = useId();
  const show = (v) => (v === null || v === undefined || v === 0 ? (v === 0 ? '0' : '') : String(v));
  const [draft, setDraft] = useState(show(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!focused) setDraft(show(value)); }, [value, focused]);

  const invalid = draft !== '' && Number.isNaN(parseAmount(draft));

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium'}>{label}</label>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden>{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          className={`${inputCls} tabular-nums ${prefix ? 'pl-9' : ''} ${invalid ? 'border-bad' : ''}`}
          value={draft}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          onBlur={() => { setFocused(false); setDraft(show(value)); }}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            const n = next.trim() === '' ? 0 : parseAmount(next);
            if (!Number.isNaN(n)) onCommit(n);
          }}
          {...rest}
        />
      </div>
    </div>
  );
}
