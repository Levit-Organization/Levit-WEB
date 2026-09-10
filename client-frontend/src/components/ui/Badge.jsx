import { cn } from './cn';

const VARIANTS = {
  default: 'bg-background text-light-text',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  muted: 'bg-surface text-ink-soft shadow-xs',
  outline: 'border border-divider-strong text-light-text',
};

const DOTS = {
  default: 'bg-faint',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-faint',
  outline: 'bg-faint',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'text-2xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
        VARIANTS[variant] || VARIANTS.default,
        className
      )}
      {...rest}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOTS[variant] || DOTS.default)} />}
      {icon && !dot && <span className="material-icons text-[14px] leading-none">{icon}</span>}
      {children}
    </span>
  );
}
