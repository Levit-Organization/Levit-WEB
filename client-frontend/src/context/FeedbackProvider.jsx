import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedbackContext } from './feedbackContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { cn } from '../components/ui/cn';

const TOAST_STYLES = {
  success: { icon: 'check_circle', classes: 'text-success', duration: 4000 },
  error: { icon: 'error_outline', classes: 'text-danger', duration: 7000 },
  warning: { icon: 'warning_amber', classes: 'text-warning', duration: 6000 },
  info: { icon: 'info', classes: 'text-info', duration: 4000 },
};

const MAX_TOASTS = 4;

function Toast({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), style.duration);
    return () => clearTimeout(timer);
  }, [toast.id, style.duration, onDismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-divider bg-surface px-4 py-3 shadow-lg animate-rise"
    >
      <span className={cn('material-icons text-[20px] leading-5 shrink-0', style.classes)} aria-hidden="true">
        {style.icon}
      </span>
      <p className="min-w-0 flex-1 text-sm text-ink break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dispensar notificação"
        className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-light-text transition-colors hover:bg-background hover:text-ink"
      >
        <span className="material-icons text-[16px]" aria-hidden="true">close</span>
      </button>
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    if (!message) return;
    const id = ++nextId.current;
    setToasts((current) => {
      // Mensagem idêntica já na tela: não empilha duplicata.
      if (current.some((t) => t.type === type && t.message === message)) return current;
      return [...current, { id, type, message }].slice(-MAX_TOASTS);
    });
  }, []);

  const toast = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      warning: (message) => push('warning', message),
      info: (message) => push('info', message),
    }),
    [push]
  );

  // --- Confirmação ---
  const [dialog, setDialog] = useState({ open: false, options: {} });
  const resolver = useRef(null);

  const settle = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    // Mantém `options` para o conteúdo não sumir durante a animação de saída.
    setDialog((current) => ({ ...current, open: false }));
  }, []);

  const confirm = useCallback((options = {}) => {
    // Uma confirmação por vez: a anterior (se existir) é tratada como "não".
    resolver.current?.(false);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setDialog({ open: true, options });
    });
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const { options } = dialog;
  const perigo = options.variant === 'danger';

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-stretch gap-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>

      <Modal
        open={dialog.open}
        onClose={() => settle(false)}
        title={options.title || 'Confirmar ação'}
        maxWidth="sm"
        role="alertdialog"
        layer="z-[60]"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)} data-autofocus={perigo ? true : undefined}>
              {options.cancelLabel || 'Cancelar'}
            </Button>
            <Button
              variant={perigo ? 'danger' : 'primary'}
              onClick={() => settle(true)}
              data-autofocus={perigo ? undefined : true}
            >
              {options.confirmLabel || 'Confirmar'}
            </Button>
          </>
        }
      >
        {options.message && <p className="text-sm text-ink-soft leading-relaxed">{options.message}</p>}
      </Modal>
    </FeedbackContext.Provider>
  );
}
