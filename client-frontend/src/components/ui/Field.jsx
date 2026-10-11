export function FieldShell({ label, hint, error, htmlFor, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1.5">
          {label}
          {required && (
            <>
              <span className="text-danger ml-0.5" aria-hidden="true">*</span>
              <span className="sr-only"> (obrigatório)</span>
            </>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-msg` : undefined} className="text-2xs text-light-text mt-1.5">{hint}</p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-msg` : undefined}
          role="alert"
          className="text-2xs text-danger mt-1.5 flex items-center gap-1"
        >
          <span className="material-icons text-[13px]" aria-hidden="true">error_outline</span>
          {error}
        </p>
      )}
    </div>
  );
}

