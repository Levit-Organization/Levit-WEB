import { useEffect } from 'react';
import { cn } from './cn';

const MAX_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export default function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-primary-900/25" onClick={onClose} />
      <div
        className={cn(
          'relative bg-surface rounded-xl shadow-lg w-full flex flex-col max-h-[90vh] animate-rise',
          MAX_WIDTHS[maxWidth] || MAX_WIDTHS.md
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-divider shrink-0">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-ink truncate">{title}</h3>
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
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-divider bg-background/60 rounded-b-xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
