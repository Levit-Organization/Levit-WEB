import { cn } from './cn';

export default function Toggle({ checked, onChange, label, description, disabled = false }) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full shrink-0 transition-colors duration-150 ease-out-quart',
        checked ? 'bg-primary' : 'bg-divider-strong hover:bg-faint',
        disabled && 'opacity-45 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out-quart',
          checked && 'translate-x-5'
        )}
      />
    </button>
  );

  if (!label && !description) return switchEl;

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <p className="text-sm font-medium text-ink">{label}</p>}
        {description && <p className="text-2xs text-light-text mt-0.5">{description}</p>}
      </div>
      {switchEl}
    </div>
  );
}
