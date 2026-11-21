import { cn } from './cn';
import { useId } from 'react';
import { fieldClasses, fieldA11y } from './fieldUtils';
import { FieldShell } from './Field';

export default function Textarea({ label, hint, error, className = '', id, rows = 3, ...rest }) {
  const generatedId = useId();
  const inputId = id || rest.name || generatedId;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} required={rest.required}>
      <textarea
        id={inputId}
        {...fieldA11y(inputId, { error, hint })}
        rows={rows}
        className={cn(
          fieldClasses,
          'px-4 py-2.5 resize-none',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger-bg',
          className
        )}
        {...rest}
      />
    </FieldShell>
  );
}
