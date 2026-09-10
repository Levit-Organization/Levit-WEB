import { cn } from './cn';

const VARIANTS = {
  error: { classes: 'bg-danger-bg text-danger', icon: 'error_outline' },
  success: { classes: 'bg-success-bg text-success', icon: 'check_circle' },
  warning: { classes: 'bg-warning-bg text-warning', icon: 'warning_amber' },
  info: { classes: 'bg-info-bg text-info', icon: 'info' },
};

export default function Alert({ variant = 'error', title, icon, children, className = '' }) {
  const info = VARIANTS[variant] || VARIANTS.error;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg px-4 py-3 text-sm', info.classes, className)}>
      <span className="material-icons text-[19px] leading-5 shrink-0">{icon || info.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className={title ? 'opacity-90' : undefined}>{children}</div>
      </div>
    </div>
  );
}
