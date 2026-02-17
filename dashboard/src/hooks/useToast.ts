import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ToastItem, ToastVariant } from '../components/ui/Toast';

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4000;

// ---- Context ----------------------------------------------------------------

export interface ToastContextValue {
  items: ToastItem[];
  dismiss: (id: string) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

export const ToastContext = createContext<ToastContextValue | null>(null);

// ---- Hook -------------------------------------------------------------------

export function useToastState(): ToastContextValue {
  const [items, setItems] = useState<ToastItem[]>([]);
  // Track active timers so we can cancel them on dismiss
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (variant: ToastVariant, message: string, duration = DEFAULT_DURATION) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = { id, variant, message, duration };

      setItems((prev) => {
        const next = [...prev, item];
        // Keep only the last MAX_TOASTS items
        if (next.length > MAX_TOASTS) {
          const removed = next.splice(0, next.length - MAX_TOASTS);
          // Cancel timers for removed items
          removed.forEach((t) => {
            const timer = timers.current.get(t.id);
            if (timer !== undefined) {
              clearTimeout(timer);
              timers.current.delete(t.id);
            }
          });
        }
        return next;
      });

      // Auto-dismiss
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const toast = {
    success: (message: string, duration?: number) => add('success', message, duration),
    error: (message: string, duration?: number) => add('error', message, duration),
    warning: (message: string, duration?: number) => add('warning', message, duration),
    info: (message: string, duration?: number) => add('info', message, duration),
  };

  return { items, dismiss, toast };
}

// ---- Consumer hook ----------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
