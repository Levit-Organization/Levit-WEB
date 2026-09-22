import { cn } from './cn';

export const fieldClasses =
  'w-full bg-surface text-ink border border-divider-strong rounded-lg text-sm transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-light-text ' +
  'hover:border-primary-300 ' +
  'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100 ' +
  'disabled:bg-background disabled:text-faint disabled:border-divider disabled:cursor-not-allowed';

export function FieldShell({ label, hint, error, htmlFor, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-2xs text-light-text mt-1.5">{hint}</p>}
      {error && (
        <p className="text-2xs text-danger mt-1.5 flex items-center gap-1">
          <span className="material-icons text-[13px]">error_outline</span>
          {error}
        </p>
      )}
    </div>
  );
}

export default function Input({ label, hint, error, icon, className = '', id, ...rest }) {
  const inputId = id || rest.name;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <div className="relative">
        {icon && (
          <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-light-text pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            fieldClasses,
            'h-11',
            icon ? 'pl-10 pr-4' : 'px-4',
            error && 'border-danger focus-visible:border-danger focus-visible:ring-danger-bg',
            className
          )}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}
