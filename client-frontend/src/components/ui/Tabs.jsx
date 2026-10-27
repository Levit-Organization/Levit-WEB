import { useRef } from 'react';
import { cn } from './cn';

/**
 * Abas de seção da página: sublinhado alinhado à esquerda, contagem opcional.
 * Um estilo só no app inteiro. O painel usa `id="painel-<id>"` e
 * `aria-labelledby="aba-<id>"`. Setas, Home e End trocam de aba (padrão ARIA).
 *
 * Alternância de filtro ("Meus / Da equipe", "Lista / Quadro") não é aba: usa
 * o controle segmentado de pílula.
 */
export default function Tabs({ abas, ativa, onChange, label, className = '' }) {
  const refs = useRef({});

  const irPara = (indice) => {
    const aba = abas[(indice + abas.length) % abas.length];
    onChange(aba.id);
    refs.current[aba.id]?.focus();
  };

  const onKeyDown = (e, indice) => {
    const destino = {
      ArrowRight: indice + 1,
      ArrowLeft: indice - 1,
      Home: 0,
      End: abas.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    irPara(destino);
  };

  return (
    <div role="tablist" aria-label={label} className={cn('border-b border-divider flex gap-6 mb-6 shrink-0 overflow-x-auto', className)}>
      {abas.map((aba, indice) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            ref={(el) => {
              refs.current[aba.id] = el;
            }}
            id={`aba-${aba.id}`}
            type="button"
            role="tab"
            aria-selected={selecionada}
            aria-controls={`painel-${aba.id}`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onChange(aba.id)}
            onKeyDown={(e) => onKeyDown(e, indice)}
            className={cn(
              'flex items-center gap-2 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
              selecionada ? 'text-primary border-primary' : 'text-light-text border-transparent hover:text-ink-soft'
            )}
          >
            {aba.label}
            {aba.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-2xs font-bold tabular',
                  selecionada ? 'bg-primary-100 text-primary-700' : 'bg-background text-light-text'
                )}
              >
                {aba.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
