"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastType = "default" | "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  visible: boolean;
}

const ToastContext = createContext<((message: string, type?: ToastType) => void) | null>(null);

const AUTO_DISMISS_MS = 3500;
const EXIT_MS = 200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  // `document` exists synchronously in the browser even during React's
  // first (hydration) render pass, so branching on `typeof document` at
  // render time renders the portal on the client's very first pass but
  // not the server's — a real server/client mismatch, not just an
  // SSR-safety guard. Mounting only after an effect keeps the first
  // client render identical to the server's (both skip the portal),
  // then adds it on the next pass, which is an ordinary update, not a
  // hydration error.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toast = useCallback((message: string, type: ToastType = "default") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, message, type, visible: false }]);

    // Next tick: flip to visible so the CSS transition actually runs.
    requestAnimationFrame(() => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)));
    });

    setTimeout(() => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, EXIT_MS);
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {mounted
        ? createPortal(
            <div className="admin-toast-stack" role="status" aria-live="polite">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={["admin-toast", item.visible && "is-visible", item.type !== "default" && `admin-toast--${item.type}`]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {item.message}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, type?: ToastType) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
