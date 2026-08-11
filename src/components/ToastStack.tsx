import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

export type ToastItem = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast-item">
          <div className="toast-copy">
            <strong>{t.title}</strong>
            {t.body ? <span>{t.body}</span> : null}
            {t.link ? (
              <Link to={t.link} onClick={() => onDismiss(t.id)}>
                Open
              </Link>
            ) : null}
          </div>
          <button type="button" className="ghost btn-sm" onClick={() => onDismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToasts(max = 4) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (item: Omit<ToastItem, "id"> & { id?: string }) => {
      const id = item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [{ ...item, id }, ...prev].slice(0, max));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    [max],
  );

  return { toasts, pushToast, dismiss };
}
