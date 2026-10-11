import { cn } from '../ui/cn';

/** Sino com contador de não lidas. `compacto`: só o ícone (menu recolhido / barra do celular). */
export default function BotaoNotificacoes({ naoLidas, onClick, compacto = false, aberto = false, className = '' }) {
  const rotulo = naoLidas > 0 ? `Notificações, ${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Notificações';
  const contador = naoLidas > 99 ? '99+' : naoLidas;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-haspopup="dialog"
      aria-expanded={aberto}
      title={compacto ? rotulo : undefined}
      className={cn(
        'relative flex items-center rounded-lg text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors',
        compacto ? 'w-10 h-10 justify-center' : 'gap-3 px-3 py-2.5 w-full',
        className
      )}
    >
      <span className="relative shrink-0">
        <span className="material-icons text-[20px] leading-none" aria-hidden="true">
          {naoLidas > 0 ? 'notifications_active' : 'notifications_none'}
        </span>
        {naoLidas > 0 && compacto && (
          <span
            className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-[18px] text-center tabular"
            aria-hidden="true"
          >
            {contador}
          </span>
        )}
      </span>
      {!compacto && (
        <>
          <span className="text-sm font-medium truncate">Notificações</span>
          {naoLidas > 0 && (
            <span
              className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-2xs font-bold leading-5 text-center tabular"
              aria-hidden="true"
            >
              {contador}
            </span>
          )}
        </>
      )}
    </button>
  );
}
