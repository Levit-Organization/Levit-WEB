import { cn } from './cn';

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-2xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-10 h-10 text-xs',
  xl: 'w-12 h-12 text-sm',
};

/* Classes literais: o JIT do Tailwind não enxerga nome de classe montado em
   runtime, então a paleta precisa aparecer escrita aqui. */
const PEOPLE = [
  'bg-people-1-bg text-people-1',
  'bg-people-2-bg text-people-2',
  'bg-people-3-bg text-people-3',
  'bg-people-4-bg text-people-4',
  'bg-people-5-bg text-people-5',
  'bg-people-6-bg text-people-6',
];

const VARIANTS = {
  solid: 'bg-primary text-white',
  tint: 'bg-primary-100 text-primary-700',
  muted: 'bg-background text-light-text',
};

function initialsFrom(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

/** Mesma pessoa, mesma cor, sempre — inclusive entre telas diferentes. */
function paletteFor(name = '') {
  const key = String(name).trim().toLowerCase();
  if (!key) return PEOPLE[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PEOPLE[hash % PEOPLE.length];
}

/**
 * `variant="person"` (padrão) dá a cada pessoa uma cor estável a partir do
 * nome. Use `solid`/`tint`/`muted` quando o círculo não representa uma pessoa
 * específica (ex: o usuário logado no rodapé da sidebar).
 */
export default function Avatar({
  name,
  initials,
  src,
  size = 'md',
  variant = 'person',
  ring = false,
  className = '',
  ...rest
}) {
  const label = initials || initialsFrom(name);
  const tone = variant === 'person' ? paletteFor(name) : VARIANTS[variant] || VARIANTS.tint;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden select-none',
        SIZES[size] || SIZES.md,
        tone,
        ring && 'ring-2 ring-surface',
        className
      )}
      title={name || undefined}
      {...rest}
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : label}
    </div>
  );
}
