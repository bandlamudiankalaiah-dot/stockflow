import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: "bi-check-circle-fill", className: "sf-toast-success" },
  danger: { icon: "bi-exclamation-triangle-fill", className: "sf-toast-danger" },
  warning: { icon: "bi-exclamation-circle-fill", className: "sf-toast-warning" },
  info: { icon: "bi-info-circle-fill", className: "sf-toast-info" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, variant = "success") => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-container position-fixed top-0 end-0 p-3 sf-toast-container"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const variant = VARIANTS[toast.variant] || VARIANTS.info;
          return (
            <div key={toast.id} className={`sf-toast ${variant.className}`} role="status">
              <i className={`bi ${variant.icon} sf-toast-icon`} aria-hidden="true" />
              <div className="sf-toast-body">{toast.message}</div>
              <button
                type="button"
                className="btn-close ms-auto"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
