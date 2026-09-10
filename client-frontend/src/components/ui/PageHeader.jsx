import { Link } from 'react-router-dom';
import { cn } from './cn';

/**
 * Cabeçalho de página: título/subtítulo à esquerda (com ícone e/ou link de
 * voltar opcionais), ações à direita. Cobre o padrão repetido em quase toda
 * página interna do app.
 */
export default function PageHeader({
  icon,
  backTo,
  title,
  subtitle,
  actions,
  align = 'center',
  className = '',
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row shrink-0 mb-7',
        align === 'end' ? 'sm:items-end sm:justify-between' : 'sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors shrink-0"
          >
            <span className="material-icons text-[20px]">arrow_back</span>
          </Link>
        )}
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0">
            <span className="material-icons text-[22px]">{icon}</span>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink truncate">{title}</h1>
          {subtitle && <p className="text-sm text-light-text mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </header>
  );
}
