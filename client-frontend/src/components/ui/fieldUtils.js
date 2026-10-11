export const fieldClasses =
  'w-full bg-surface text-ink border border-divider-strong rounded-lg text-sm transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-light-text ' +
  'hover:border-primary-300 ' +
  'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100 ' +
  'disabled:bg-background disabled:text-faint disabled:border-divider disabled:cursor-not-allowed';

/** Props de acessibilidade do controle: liga a mensagem de erro/dica ao campo. */
export function fieldA11y(htmlFor, { error, hint }) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': htmlFor && (error || hint) ? `${htmlFor}-msg` : undefined,
  };
}

