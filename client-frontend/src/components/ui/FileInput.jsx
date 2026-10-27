import { useId, useRef } from 'react';
import { FieldShell } from './Field';
import { cn } from './cn';

function tamanhoLegivel(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Campo de um arquivo só: área para escolher e, depois de escolhido, o nome
 * com a opção de trocar ou remover. `value` é o File (ou null).
 */
export default function FileInput({ label, hint, error, accept, value, onChange, required, name, id, disabled = false }) {
  const autoId = useId();
  const htmlFor = id || autoId;
  const inputRef = useRef(null);

  const escolher = (e) => {
    onChange(e.target.files?.[0] ?? null);
    // Permite escolher de novo o mesmo arquivo depois de remover.
    e.target.value = '';
  };

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={htmlFor} required={required}>
      <input
        ref={inputRef}
        id={htmlFor}
        name={name}
        type="file"
        accept={accept}
        onChange={escolher}
        disabled={disabled}
        className="sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${htmlFor}-msg` : undefined}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-divider-strong bg-surface px-3 py-2.5">
          <span className="material-icons text-[20px] text-primary shrink-0" aria-hidden="true">description</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink truncate">{value.name}</span>
            <span className="block text-2xs text-light-text">{tamanhoLegivel(value.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Trocar
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remover arquivo"
            title="Remover arquivo"
            className="w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-danger-bg hover:text-danger transition-colors shrink-0"
          >
            <span className="material-icons text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>
      ) : (
        <label
          htmlFor={htmlFor}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm font-medium transition-colors',
            disabled ? 'cursor-not-allowed text-faint border-divider' : 'cursor-pointer text-primary border-divider-strong hover:border-primary-300 hover:bg-primary-50',
            error && 'border-danger'
          )}
        >
          <span className="material-icons text-[20px]" aria-hidden="true">upload_file</span>
          Escolher arquivo
        </label>
      )}
    </FieldShell>
  );
}
