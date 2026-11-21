import { useState } from 'react';
import { Drawer, Badge, Button, Skeleton, EmptyState, ErrorState } from '../ui';
import { useExecucoes } from '../../hooks/queries';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { automacaoService } from '../../services/automacaoService';
import {
  STATUS_EXECUCAO,
  gatilhoLabel,
  acaoLabel,
  quando,
  dataHoraCompleta,
  duracao,
} from '../../utils/automacaoConstants';

function Execucao({ execucao, onReexecutar, reexecutando }) {
  const [aberta, setAberta] = useState(execucao.status === 'erro');
  const status = STATUS_EXECUCAO[execucao.status] || { label: execucao.status, variant: 'default', icon: 'help_outline' };
  const passos = execucao.passos || [];

  return (
    <li className="rounded-lg border border-divider bg-surface">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background/60 transition-colors rounded-lg"
      >
        <Badge variant={status.variant} icon={status.icon} size="sm">{status.label}</Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink truncate">
            {execucao.gatilho ? gatilhoLabel(execucao.gatilho) : 'Execução'}
            {execucao.tentativa > 1 && <span className="text-light-text"> · {execucao.tentativa}ª tentativa</span>}
          </p>
          <p className="text-xs text-light-text tabular">
            <time dateTime={execucao.executado_em} title={dataHoraCompleta(execucao.executado_em)}>
              {quando(execucao.executado_em)}
            </time>
            {execucao.duracao_ms !== null && execucao.duracao_ms !== undefined && <> · {duracao(execucao.duracao_ms)}</>}
          </p>
        </div>
        <span className="material-icons text-[18px] text-light-text" aria-hidden="true">
          {aberta ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {aberta && (
        <div className="border-t border-divider px-4 py-3 flex flex-col gap-3">
          {passos.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {passos.map((passo) => (
                <li key={passo.indice} className="flex items-start gap-2 text-sm">
                  <span
                    className={`material-icons text-[16px] mt-0.5 ${passo.status === 'sucesso' ? 'text-success' : 'text-danger'}`}
                    aria-hidden="true"
                  >
                    {passo.status === 'sucesso' ? 'check' : 'close'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      Ação {passo.indice + 1}: {acaoLabel(passo.tipo)}
                      <span className="sr-only"> — {passo.status === 'sucesso' ? 'sucesso' : 'falhou'}</span>
                    </p>
                    <p className="text-xs text-light-text break-words">{passo.mensagem}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            execucao.detalhes && <p className="text-sm text-danger break-words">{execucao.detalhes}</p>
          )}

          {execucao.status === 'retentando' && (
            <p className="text-xs text-light-text">
              Falha temporária. O sistema tenta de novo automaticamente, continuando da ação que falhou.
            </p>
          )}

          {execucao.status === 'erro' && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                icon="replay"
                loading={reexecutando}
                onClick={() => onReexecutar(execucao)}
              >
                Reexecutar
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Painel lateral com o histórico de execuções de uma automação. */
export default function HistoricoExecucoes({ automacao, onClose }) {
  const aberto = !!automacao;
  const toast = useToast();
  const query = useExecucoes(automacao, { aberto });
  const [reexecutandoId, setReexecutandoId] = useState(null);

  const execucoes = query.data?.pages.flatMap((p) => p.execucoes || []) ?? [];

  const reexecutar = async (execucao) => {
    setReexecutandoId(execucao.id);
    try {
      await automacaoService.reexecutar(automacao.modulo_id, automacao.id, execucao.id);
      toast.success('Reexecução colocada na fila. O resultado aparece aqui em instantes.');
      query.refetch();
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Não foi possível reexecutar.'));
    } finally {
      setReexecutandoId(null);
    }
  };

  return (
    <Drawer open={aberto} onClose={onClose} title="Histórico de execuções" subtitle={automacao?.nome}>
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState description={mensagemDeErro(query.error, 'Erro ao carregar o histórico.')} onRetry={() => query.refetch()} />
      ) : execucoes.length === 0 ? (
        <EmptyState
          icon="history"
          title="Nenhuma execução ainda"
          description="Quando um item disparar esta automação, cada execução aparece aqui com o resultado de cada ação."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2" aria-live="polite">
            {execucoes.map((execucao) => (
              <Execucao
                key={execucao.id}
                execucao={execucao}
                onReexecutar={reexecutar}
                reexecutando={reexecutandoId === execucao.id}
              />
            ))}
          </ul>
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
        </div>
      )}
    </Drawer>
  );
}
