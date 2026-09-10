import { cn } from './cn';
import { fieldClasses, FieldShell } from './Input';

/**
 * Select nativo com a seta de material-icon posicionada por cima.
 * `options`: [{ value, label }] — ou passe <option> como children.
 */
export default function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  icon,
  className = '',
  id,
  children,
  ...rest
}) {
  const inputId = id || rest.name;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <div className="relative">
        {icon && (
          <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-light-text pointer-events-none z-10">
            {icon}
          </span>
        )}
        <select
          id={inputId}
          className={cn(
            fieldClasses,
            'h-11 appearance-none pr-10 cursor-pointer',
            icon ? 'pl-10' : 'pl-4',
            error && 'border-danger focus-visible:border-danger focus-visible:ring-danger-bg',
            className
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-light-text pointer-events-none">
          expand_more
        </span>
      </div>
    </FieldShell>
  );
}
