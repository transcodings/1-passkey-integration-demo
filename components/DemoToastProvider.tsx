'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type DemoToastKind = 'info' | 'success' | 'error';

type DemoToastItem = {
  id: string;
  message: string;
  kind: DemoToastKind;
};

type DemoToastContextValue = {
  showToast: (message: string, kind?: DemoToastKind) => void;
};

const DemoToastCtx = createContext<DemoToastContextValue | null>(null);

const TOAST_TTL_MS = 4500;

const kindStyles: Record<DemoToastKind, string> = {
  info: 'border-zinc-300 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100',
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100',
  error:
    'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/90 dark:text-red-100',
};

export function DemoToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<DemoToastItem[]>([]);

  const showToast = useCallback((message: string, kind: DemoToastKind = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <DemoToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${kindStyles[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </DemoToastCtx.Provider>
  );
}

export function useDemoToast(): DemoToastContextValue {
  const ctx = useContext(DemoToastCtx);
  if (!ctx) {
    throw new Error('useDemoToast must be used within DemoToastProvider');
  }
  return ctx;
}
