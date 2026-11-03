import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, { tone = 'success', action, duration = 4500 } = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone, action }]);
      if (duration) setTimeout(() => dismiss(id), action ? Math.max(duration, 6000) : duration);
      return id;
    },
    [dismiss],
  );

  // The service worker announces when the app is cached for offline use.
  useEffect(() => {
    const onReady = () => toast('Ready to work offline.', { tone: 'info', duration: 2500 });
    window.addEventListener('pwa-offline-ready', onReady);
    return () => window.removeEventListener('pwa-offline-ready', onReady);
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-md animate-pop items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-page shadow-lg"
          >
            {t.tone === 'error' ? <CircleAlert size={18} className="shrink-0" aria-hidden /> : <CircleCheck size={18} className="shrink-0" aria-hidden />}
            <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => { t.action.onClick(); dismiss(t.id); }}
                className="-my-2 min-h-11 shrink-0 rounded-lg px-2 font-semibold underline underline-offset-2"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-my-2 -mr-2 grid size-11 shrink-0 place-items-center opacity-70">
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
