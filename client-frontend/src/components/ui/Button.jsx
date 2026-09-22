import { Link } from 'react-router-dom';
import Spinner from './Spinner';
import { cn } from './cn';

const VARIANTS = {
  primary:
    'bg-primary text-white shadow-xs hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary-300 disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-divider-strong hover:bg-background hover:border-primary-300 active:bg-primary-50 disabled:text-faint disabled:bg-surface',
  danger:
    'bg-danger text-white shadow-xs hover:brightness-110 active:brightness-95 disabled:opacity-45 disabled:shadow-none',
  ghost:
    'text-light-text hover:bg-primary-100 hover:text-primary-700 active:bg-primary-200 disabled:text-faint',
  subtle:
    'bg-primary-100 text-primary-700 hover:bg-primary-200 active:bg-primary-300 disabled:text-primary-300 disabled:bg-primary-50',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  icon: 'w-10 h-10 justify-center',
  'icon-sm': 'w-8 h-8 justify-center',
};

/**
 * Botão compartilhado. Passe `to` para renderizar como Link (react-router)
 * em vez de <button> — usado nos "Cancelar" que navegam sem submeter form.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  to,
  className = '',
  children,
  ...rest
}) {
  const isOff = disabled || loading;

  const classes = cn(
    'inline-flex items-center rounded-lg font-semibold shrink-0 transition-[background-color,border-color,color,box-shadow,filter] duration-150 ease-out-quart',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    isOff && 'cursor-not-allowed',
    className
  );

  const content = (
    <>
      {loading ? (
        <Spinner size="sm" light={variant === 'primary' || variant === 'danger'} />
      ) : (
        icon && <span className="material-icons text-[18px] leading-none">{icon}</span>
      )}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} disabled={isOff} {...rest}>
      {content}
    </button>
  );
}
