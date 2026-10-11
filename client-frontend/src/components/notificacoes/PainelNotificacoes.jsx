import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, Button, Skeleton, EmptyState, ErrorState } from '../ui';
import { cn } from '../ui/cn';
import { useAcoesNotificacoes, useListaNotificacoes } from '../../hooks/useNotificacoes';
import { mensagemDeErro } from '../../lib/queryClient';
import { agruparPorDia, ICONE_NOTIFICACAO } from '../../utils/notificacoes';
import { quando, dataHoraCompleta } from '../../utils/automacaoConstants';

const FILTROS = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'nao_lidas', label: 'Não lidas' },
];

function ItemNotificacao({ notificacao, onAbrir, onExcluir }) {
  const naoLida = !notificacao.lida_em;
  const icone = ICONE_NOTIFICACAO[notificacao.tipo] || ICONE_NOTIFICACAO.padrao;

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onAbrir(notificacao)}
        className={cn(
          'w-full flex items-start gap-3 rounded-lg px-3 py-3 pr-11 text-left transition-colors hover:bg-background',
          naoLida && 'bg-primary-50/60'
        )}
      >
        <span className={cn('mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center', icone.classes)}>
          <span className="material-icons text-[17px]" aria-hidden="true">{icone.icon}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm break-words', naoLida ? 'font-semibold text-ink' : 'text-ink-soft')}>
            {notificacao.titulo}
          </span>
          {notificacao.mensagem && (
            <span className="block text-xs text-light-text mt-0.5 break-words line-clamp-2">{notificacao.mensagem}</span>
          )}
          <time
            dateTime={notificacao.criado_em}
            title={dataHoraCompleta(notificacao.criado_em)}
            className="block text-2xs text-light-text mt-1 tabular"
          >
            {quando(notificacao.criado_em)}
          </time>
        </span>
        {naoLida && (
          <>
            <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
            <span className="sr-only">(não lida)</span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => onExcluir(notificacao)}
        aria-label={`Excluir notificação: ${notificacao.titulo}`}
        className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-md text-light-text opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-danger-bg hover:text-danger transition"
      >
        <span className="material-icons text-[16px]" aria-hidden="true">delete_outline</span>
      </button>
    </li>
  );
}

/** Central de notificações: painel lateral com filtro, agrupamento por dia e ações. */
export default function PainelNotificacoes({ open, onClose, naoLidas }) {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
  const query = useListaNotificacoes(filtro, { aberto: open });
  const acoes = useAcoesNotificacoes();

  const notificacoes = query.data?.pages.flatMap((p) => p.notificacoes || []) ?? [];
  const grupos = agruparPorDia(notificacoes);

  const abrir = (notificacao) => {
    acoes.marcarLida(notificacao);
    if (notificacao.link) {
      onClose();
      navigate(notificacao.link);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notificações"
      subtitle={naoLidas > 0 ? `${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia'}
      footer={
        naoLidas > 0 ? (
          <Button variant="secondary" size="sm" icon="done_all" onClick={acoes.marcarTodasLidas}>
            Marcar todas como lidas
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Filtrar notificações" className="flex gap-1 rounded-lg bg-background p-1 self-start">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                filtro === f.valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState description={mensagemDeErro(query.error, 'Erro ao carregar as notificações.')} onRetry={() => query.refetch()} />
        ) : notificacoes.length === 0 ? (
          <EmptyState
            icon="notifications_none"
            title={filtro === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação ainda'}
            description="Novas candidaturas, avisos de automações e mudanças na equipe aparecem aqui."
          />
        ) : (
          <>
            {grupos.map((grupo) => (
              <section key={grupo.rotulo} aria-label={grupo.rotulo}>
                <h3 className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wide text-light-text">{grupo.rotulo}</h3>
                <ul className="flex flex-col gap-0.5">
                  {grupo.itens.map((n) => (
                    <ItemNotificacao key={n.id} notificacao={n} onAbrir={abrir} onExcluir={acoes.excluir} />
                  ))}
                </ul>
              </section>
            ))}
            {query.hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => query.fetchNextPage()}
                loading={query.isFetchingNextPage}
                className="self-center"
              >
                Carregar mais
              </Button>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
