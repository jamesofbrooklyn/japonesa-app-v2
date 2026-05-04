"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  info: "border-sky-300 bg-sky-50 text-sky-900",
};

const KIND_ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed top-16 md:top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded border px-3 py-2 shadow-md text-sm flex items-start gap-2 max-w-sm animate-[slideIn_0.2s_ease-out] ${KIND_STYLES[t.kind]}`}
          >
            <span
              className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-xs ${
                t.kind === "success"
                  ? "bg-emerald-200 text-emerald-900"
                  : t.kind === "error"
                  ? "bg-red-200 text-red-900"
                  : "bg-sky-200 text-sky-900"
              }`}
            >
              {KIND_ICONS[t.kind]}
            </span>
            <div className="flex-1">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-stone-500 hover:text-stone-800 leading-none ml-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/**
 * Returns toast helpers. Throws if used outside <ToastProvider>; that's
 * intentional — the dashboard layout always wraps with the provider so any
 * "missing provider" error is a setup bug worth surfacing fast.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return {
    success: (message: string) => ctx.show("success", message),
    error: (message: string) => ctx.show("error", message),
    info: (message: string) => ctx.show("info", message),
  };
}
