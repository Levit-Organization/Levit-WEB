import { cn } from './cn';
import { useDialog } from './useDialog';

/** Painel lateral. `dirty`: pede confirmação antes de fechar com alterações não salvas. */
export default function Drawer({ open, onClose, title, subtitle, children, footer, dirty = false }) {
  const { mounted, closing, panelRef, titleId, requestClose, onKeyDown } = useDialog({ open, onClose, dirty });

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={cn('absolute inset-0 bg-primary-900/25', closing ? 'animate-fade-out' : 'animate-fade-in')}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'relative w-full max-w-lg bg-surface h-full shadow-drawer flex flex-col outline-none',
          closing ? 'animate-slide-out' : 'animate-slide-in'
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-divider shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink truncate">{title}</h2>
            {subtitle && <p className="text-xs text-light-text mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-background hover:text-ink transition-colors shrink-0"
          >
            <span className="material-icons text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>
        <div data-dialog-body className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div
            data-dialog-footer
            className="flex items-center justify-end gap-3 px-6 py-4 border-t border-divider bg-background/60 shrink-0"
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
