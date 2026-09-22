import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import notificacaoService from '../services/notificacaoService';

const TIPO_VISUAL = {
  financeiro: {
    icon: 'account_balance_wallet',
    iconClass: 'bg-success-bg text-success',
  },
  recrutamento: {
    icon: 'person_search',
    iconClass: 'bg-primary-100 text-primary-700',
  },
  equipe: {
    icon: 'groups',
    iconClass: 'bg-info-bg text-info',
  },
  automacao: {
    icon: 'bolt',
    iconClass: 'bg-warning-bg text-warning',
  },
  sistema: {
    icon: 'notifications',
    iconClass: 'bg-sidebar text-light-text',
  },
};

function tempoRelativo(valor) {
  if (!valor) return '';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';

  const diferencaMs = Date.now() - data.getTime();
  const minutos = Math.max(0, Math.floor(diferencaMs / 60000));

  if (minutos < 1) return 'Agora';
  if (minutos < 60) return `Há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Ontem';
  if (dias < 7) return `Há ${dias} dias`;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(data);
}

function SkeletonNotificacao() {
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-lg bg-divider animate-pulse shrink-0" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3.5 bg-divider rounded animate-pulse w-2/3" />
        <div className="h-3 bg-divider rounded animate-pulse w-full" />
        <div className="h-3 bg-divider rounded animate-pulse w-1/4" />
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);

  const naoLidas = useMemo(
    () => notificacoes.filter((notificacao) => !notificacao.lida).length,
    [notificacoes]
  );

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const items = await notificacaoService.listar({ limit: 8 });
        if (ativo) {
          setNotificacoes(items);
          setErro(false);
        }
      } catch {
        if (ativo) setErro(true);
      } finally {
        if (ativo) setLoading(false);
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;

    const fecharAoClicarFora = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    };

    const fecharComEscape = (event) => {
      if (event.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEscape);

    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [aberto]);

  const marcarComoLida = async (notificacao) => {
    if (!notificacao.lida) {
      // Atualização otimista: deixa a interação instantânea. O backend poderá
      // confirmar a mudança quando os endpoints de notificações existirem.
      setNotificacoes((atuais) =>
        atuais.map((item) =>
          item.id === notificacao.id ? { ...item, lida: true } : item
        )
      );

      try {
        await notificacaoService.marcarComoLida(notificacao.id);
      } catch {
        // Não desfazemos o clique por uma falha de rede; uma futura sincronização
        // com o backend pode restaurar o estado correto.
      }
    }

    if (notificacao.url) {
      setAberto(false);
      navigate(notificacao.url);
    }
  };

  const marcarTodasComoLidas = async () => {
    if (naoLidas === 0) return;

    setNotificacoes((atuais) =>
      atuais.map((notificacao) => ({ ...notificacao, lida: true }))
    );

    try {
      await notificacaoService.marcarTodasComoLidas();
    } catch {
      // Mantém a UI responsiva; a integração real poderá tratar retries/toasts.
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className={`relative w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
          aberto
            ? 'bg-primary-100 border-primary-200 text-primary-700'
            : 'bg-surface border-divider text-light-text hover:text-primary-700 hover:border-primary-200 hover:bg-primary-50'
        }`}
      >
        <span className="material-icons text-[21px] leading-none">
          {naoLidas > 0 ? 'notifications' : 'notifications_none'}
        </span>

        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold leading-4 text-center ring-2 ring-background tabular"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <section
          role="dialog"
          aria-label="Central de notificações"
          className="absolute right-0 top-12 z-50 w-[390px] max-w-[calc(100vw-2rem)] bg-surface border border-divider rounded-xl shadow-lg overflow-hidden animate-rise"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-divider">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">Notificações</h2>
                {naoLidas > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-danger-bg text-danger text-2xs font-semibold tabular">
                    {naoLidas}
                  </span>
                )}
              </div>
              <p className="text-2xs text-light-text mt-0.5">
                Atualizações importantes da sua operação
              </p>
            </div>

            <button
              type="button"
              onClick={marcarTodasComoLidas}
              disabled={naoLidas === 0}
              className="text-xs font-medium text-primary-700 hover:text-primary disabled:text-faint disabled:cursor-default transition-colors shrink-0"
            >
              Marcar como lidas
            </button>
          </div>

          <div className="max-h-[430px] overflow-y-auto divide-y divide-divider">
            {loading && (
              <>
                <SkeletonNotificacao />
                <SkeletonNotificacao />
                <SkeletonNotificacao />
              </>
            )}

            {!loading && erro && (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-danger-bg text-danger flex items-center justify-center mb-3">
                  <span className="material-icons text-[20px]">error_outline</span>
                </div>
                <p className="text-sm font-medium text-ink">Não foi possível carregar</p>
                <p className="text-xs text-light-text mt-1">
                  As notificações ficarão disponíveis quando a conexão for restabelecida.
                </p>
              </div>
            )}

            {!loading && !erro && notificacoes.length === 0 && (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center mb-3">
                  <span className="material-icons text-[22px]">notifications_none</span>
                </div>
                <p className="text-sm font-medium text-ink">Tudo em dia</p>
                <p className="text-xs text-light-text mt-1">Você não tem novas notificações.</p>
              </div>
            )}

            {!loading && !erro && notificacoes.map((notificacao) => {
              const visual = TIPO_VISUAL[notificacao.tipo] ?? TIPO_VISUAL.sistema;

              return (
                <button
                  type="button"
                  key={notificacao.id}
                  onClick={() => marcarComoLida(notificacao)}
                  className={`w-full text-left flex gap-3 px-4 py-3.5 transition-colors hover:bg-primary-50/70 ${
                    notificacao.lida ? 'bg-surface' : 'bg-primary-50/40'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${visual.iconClass}`}>
                    <span className="material-icons text-[18px]">{visual.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-start">
                      <p className={`text-sm leading-5 flex-1 ${notificacao.lida ? 'font-medium text-ink-soft' : 'font-semibold text-ink'}`}>
                        {notificacao.titulo}
                      </p>
                      {!notificacao.lida && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Não lida" />
                      )}
                    </div>
                    <p className="text-xs text-light-text leading-[1.15rem] mt-0.5 line-clamp-2">
                      {notificacao.mensagem}
                    </p>
                    <p className="text-2xs text-faint mt-1.5 tabular">
                      {tempoRelativo(notificacao.criado_em)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {!notificacaoService.apiAtiva && !loading && !erro && (
            <div className="px-4 py-2.5 border-t border-divider bg-sidebar/60 flex items-center gap-2 text-2xs text-light-text">
              <span className="material-icons text-[15px] text-primary">science</span>
              <span>Sem aoi de notificacoes</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
