import { cn } from './cn';
import { fieldClasses, FieldShell } from './Input';

export default function Textarea({ label, hint, error, className = '', id, rows = 3, ...rest }) {
  const inputId = id || rest.name;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <textarea
        id={inputId}
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
