import { cn } from '../ui/cn';
import { iniciais } from '../../utils/prazos';

/** Iniciais num círculo e, opcionalmente, o nome. Sem nome conhecido, mostra "Sem responsável". */
export default function PessoaResponsavel({ nome, comNome = true, className = '' }) {
  if (!nome) {
    return comNome ? <span className={cn('text-light-text', className)}>Sem responsável</span> : null;
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 min-w-0', className)} title={nome}>
      <span
        aria-hidden="true"
        className="w-6 h-6 shrink-0 rounded-full bg-primary-100 text-primary-700 text-2xs font-bold flex items-center justify-center"
      >
        {iniciais(nome)}
      </span>
      {comNome ? <span className="truncate">{nome}</span> : <span className="sr-only">{nome}</span>}
    </span>
  );
}
