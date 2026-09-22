import { useEffect } from 'react';

export default function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-primary-900/25" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface h-full shadow-drawer flex flex-col animate-slide-in">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-divider shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink truncate">{title}</h2>
            {subtitle && <p className="text-xs text-light-text mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-background hover:text-ink transition-colors shrink-0"
          >
            <span className="material-icons text-[20px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-divider bg-background/60 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
