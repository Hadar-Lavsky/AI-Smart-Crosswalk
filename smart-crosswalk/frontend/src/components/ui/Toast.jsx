import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../utils';

const ToastContext = createContext(null);

/**
 * ToastProvider — context provider that exposes `addToast` / `removeToast`.
 * Renders a fixed `ToastContainer` at the bottom-left of the viewport.
 * Must wrap any component that calls `useToast()`.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 *
 * @example
 * // In App.jsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * @param {object} props
 * @param {{ id: number, message: string, type: 'success'|'error'|'warning'|'info' }[]} props.toasts
 * @param {(id: number) => void} props.removeToast
 */
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

const toastStyles = {
  success: 'bg-success-50 text-success-800 border-success-200',
  error: 'bg-danger-50 text-danger-800 border-danger-200',
  warning: 'bg-warning-50 text-warning-800 border-warning-200',
  info: 'bg-primary-50 text-primary-800 border-primary-200'
};

const toastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

/**
 * @param {object} props
 * @param {string} props.message - Text content of the notification
 * @param {'success'|'error'|'warning'|'info'} [props.type='info'] - Colour / icon theme
 * @param {() => void} props.onClose - Called when the close button is clicked
 */
function Toast({ message, type = 'info', onClose }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'animate-slide-in-left',
        toastStyles[type]
      )}
      role="alert"
    >
      <span className="text-lg font-bold">{toastIcons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="text-current hover:opacity-70 transition-opacity"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}
