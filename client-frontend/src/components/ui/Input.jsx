import { useId } from 'react';
import { cn } from './cn';

import { fieldClasses, fieldA11y } from './fieldUtils';
import { FieldShell } from './Field';

export default function Input({ label, hint, error, icon, className = '', id, ...rest }) {
  const generatedId = useId();
  const inputId = id || rest.name || generatedId;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} required={rest.required}>
      <div className="relative">
        {icon && (
          <span aria-hidden="true" className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-light-text pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          {...fieldA11y(inputId, { error, hint })}
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
