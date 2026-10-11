import { cn } from './cn';
import { useDialog } from './useDialog';

const MAX_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * `dirty`: há alterações não salvas — Esc, clique no fundo e o X pedem
 * confirmação antes de fechar. `layer` permite empilhar acima de outro diálogo.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  dirty = false,
  role = 'dialog',
  layer = 'z-50',
}) {
  const { mounted, closing, panelRef, titleId, requestClose, onKeyDown } = useDialog({ open, onClose, dirty });

  if (!mounted) return null;

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', layer)}>
      <div
        className={cn('absolute inset-0 bg-primary-900/25', closing ? 'animate-fade-out' : 'animate-fade-in')}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'relative bg-surface rounded-xl shadow-lg w-full flex flex-col max-h-[90vh] outline-none',
          closing ? 'animate-fall' : 'animate-rise',
          MAX_WIDTHS[maxWidth] || MAX_WIDTHS.md
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-divider shrink-0">
            <div className="min-w-0">
              <h3 id={titleId} className="text-lg font-bold text-ink truncate">{title}</h3>
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
        )}
        <div data-dialog-body className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div
            data-dialog-footer
            className="flex justify-end gap-3 px-6 py-4 border-t border-divider bg-background/60 rounded-b-xl shrink-0"
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
