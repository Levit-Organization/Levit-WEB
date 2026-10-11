import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Button,
  Badge,
  Toggle,
  StatCard,
  EmptyState,
  ErrorState,
  Card,
  Input,
  Skeleton,
  PageHeader,
  Pagination,
} from '../components/ui';
import HistoricoExecucoes from '../components/automacoes/HistoricoExecucoes';
import SimulacaoModal from '../components/automacoes/SimulacaoModal';
import { usePagination } from '../hooks/usePagination';
import {
  GATILHO_INFO,
  ACAO_INFO,
  gatilhoLabel,
  acaoLabel,
  gatilhosDaAutomacao,
  condicoesDaAutomacao,
  ehVaga,
  quando,
  dataHoraCompleta,
} from '../utils/automacaoConstants';

/** Definição salva no formato que o endpoint de simulação espera. */
function definicaoSalva(automacao) {
  return {
    gatilhos: gatilhosDaAutomacao(automacao),
    condicoes: condicoesDaAutomacao(automacao),
    acoes: (automacao.acoes || []).map((a) => ({ tipo: a.tipo, configuracao: a.configuracao })),
  };
}

const ITEM_MENU = 'w-full flex items-center gap-2 px-3.5 py-2 text-sm text-ink-soft hover:bg-background transition-colors';

function RowMenu({ automacao, onDelete, onHistorico, onTestar, onOpenChange, isOpen }) {
  const menuRef = useRef(null);
  const botaoRef = useRef(null);

  // Menu aberto: foco no primeiro item, Esc fecha e devolve o foco ao botão.
  useEffect(() => {
    if (!isOpen) return undefined;
    menuRef.current?.querySelector('a, button')?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(null);
        botaoRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => onOpenChange(isOpen ? null : automacao.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-light-text hover:bg-background transition-colors"
        title="Mais ações"
        aria-label={`Mais ações para ${automacao.nome}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="material-icons text-[19px]" aria-hidden="true">more_vert</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => onOpenChange(null)}
            aria-label="Fechar menu"
            tabIndex={-1}
          />
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 top-9 z-20 w-44 bg-surface border border-divider rounded-lg shadow-lg py-1.5"
          >
            <Link role="menuitem" to={`/automacoes/${automacao.modulo_id}/${automacao.id}/editar`} className={ITEM_MENU}>
              <span className="material-icons text-[17px] text-light-text" aria-hidden="true">edit</span>
              Editar
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(null);
                onTestar(automacao);
              }}
              className={ITEM_MENU}
            >
              <span className="material-icons text-[17px] text-light-text" aria-hidden="true">science</span>
              Testar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(null);
                onHistorico(automacao);
              }}
              className={ITEM_MENU}
            >
              <span className="material-icons text-[17px] text-light-text" aria-hidden="true">history</span>
              Histórico
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(null);
                onDelete(automacao);
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-danger hover:bg-danger-bg transition-colors"
            >
              <span className="material-icons text-[17px]" aria-hidden="true">delete_outline</span>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Automacoes({
  automacoes = [],
  modulos = [],
  loading = false,
  error = '',
  onRetry,
  onToggleAtivo,
  onDelete,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [historicoDe, setHistoricoDe] = useState(null);
  const [testeDe, setTesteDe] = useState(null);
  const definicaoTeste = useMemo(() => (testeDe ? definicaoSalva(testeDe) : null), [testeDe]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtradas = useMemo(
    () =>
      automacoes.filter((automacao) => {
        if (!normalizedSearch) return true;
        return (
          (automacao.nome || '').toLowerCase().includes(normalizedSearch) ||
          (automacao.modulo_nome || '').toLowerCase().includes(normalizedSearch)
        );
      }),
    [automacoes, normalizedSearch]
  );
  const paginacao = usePagination(filtradas, 25);

  const total = automacoes.length;
  const ativas = useMemo(() => automacoes.filter((a) => a.ativo).length, [automacoes]);
  const { execucoes7d, falhas7d } = useMemo(
    () =>
      automacoes.reduce(
        (acc, a) => ({
          execucoes7d: acc.execucoes7d + (a.estatisticas?.execucoes_7d || 0),
          falhas7d: acc.falhas7d + (a.estatisticas?.falhas_7d || 0),
        }),
        { execucoes7d: 0, falhas7d: 0 }
      ),
    [automacoes]
  );

  return (
    <Layout>
      <PageHeader
        title="Automações"
        subtitle={
          total === 0
            ? 'Avisos, e-mails e tarefas que acontecem sozinhos quando um item muda'
            : `${ativas} de ${total} ${total === 1 ? 'automação ativa' : 'automações ativas'}`
        }
        actions={
          <>
            <div className="w-full sm:w-64">
              <Input
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  paginacao.setPage(1);
                }}
                name="busca"
                autoComplete="off"
                placeholder="Buscar automações..."
                aria-label="Buscar automações"
              />
            </div>
            <Button to="/automacoes/nova" icon="add">
              Criar automação
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
        <StatCard icon="bolt" value={total} label={total === 1 ? 'Automação criada' : 'Automações criadas'} variant="primary" />
        <StatCard icon="check_circle" value={ativas} label={ativas === 1 ? 'Ativa agora' : 'Ativas agora'} variant="success" />
        <StatCard
          icon="insights"
          value={execucoes7d}
          label="Execuções nos últimos 7 dias"
          variant={falhas7d > 0 ? 'warning' : 'info'}
          badge={falhas7d > 0 ? <Badge variant="danger" size="sm">{falhas7d} {falhas7d === 1 ? 'falha' : 'falhas'}</Badge> : undefined}
        />
      </div>

      <Card padding="none" className="overflow-hidden flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col gap-2 p-5" aria-busy="true">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <ErrorState description={error} onRetry={onRetry} />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <EmptyState
              icon="bolt"
              title={normalizedSearch ? 'Nenhuma automação encontrada' : 'Nenhuma automação ainda'}
              description={
                normalizedSearch
                  ? `Nada bate com "${searchTerm.trim()}". Tente outro termo ou limpe a busca.`
                  : 'Uma automação observa uma tabela e age sozinha: quando um item é criado ou muda, ela avisa a equipe, manda um e-mail ou atualiza outra tabela.'
              }
              actionLabel={!normalizedSearch ? 'Criar automação' : undefined}
              actionIcon={!normalizedSearch ? 'add' : undefined}
              actionTo={!normalizedSearch ? '/automacoes/nova' : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-xs text-light-text uppercase tracking-wide">
                  <th className="px-5 py-3.5 font-medium">Automação</th>
                  <th className="px-5 py-3.5 font-medium">Fluxo</th>
                  <th className="px-5 py-3.5 font-medium">Execuções</th>
                  <th className="px-5 py-3.5 font-medium">Última execução</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium w-12"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {paginacao.pageItems.map((automacao) => {
                  const gatilhos = gatilhosDaAutomacao(automacao);
                  const gatilhoInfo = gatilhos.length === 1 ? GATILHO_INFO[gatilhos[0]] || {} : { icon: 'bolt' };
                  const primeiraAcao = automacao.acoes?.[0];
                  const acaoInfo = primeiraAcao ? ACAO_INFO[primeiraAcao.tipo] : null;
                  const acoesExtras = (automacao.acoes?.length || 0) - 1;
                  const estatisticas = automacao.estatisticas || { execucoes_7d: 0, falhas_7d: 0 };

                  return (
                    <tr key={automacao.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="material-icons text-primary text-[18px]" aria-hidden="true">
                              {gatilhoInfo.icon || 'bolt'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate">{automacao.nome}</p>
                            <p className="text-xs text-light-text truncate">{automacao.modulo_nome}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {gatilhos.map((g) => (
                            <Badge key={g} variant="default">{gatilhoLabel(g)}</Badge>
                          ))}
                          {automacao.condicoes?.regras?.length > 0 && (
                            <Badge variant="outline" icon="filter_alt" title="Só roda quando as condições forem verdadeiras">
                              {automacao.condicoes.regras.length === 1 ? '1 condição' : `${automacao.condicoes.regras.length} condições`}
                            </Badge>
                          )}
                          <span className="material-icons text-[15px] text-light-text" aria-hidden="true">arrow_forward</span>
                          <Badge variant="primary">{acaoInfo ? acaoLabel(primeiraAcao.tipo) : '—'}</Badge>
                          {acoesExtras > 0 && (
                            <span className="text-2xs text-light-text">+{acoesExtras}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setHistoricoDe(automacao)}
                          className="flex items-center gap-2 whitespace-nowrap rounded-md -mx-1.5 px-1.5 py-1 text-left hover:bg-background transition-colors"
                          aria-label={`Ver histórico de ${automacao.nome}`}
                        >
                          <span className="text-ink tabular">{estatisticas.execucoes_7d}</span>
                          <span className="text-xs text-light-text">em 7 dias</span>
                          {estatisticas.falhas_7d > 0 && (
                            <Badge variant="danger" size="sm">{estatisticas.falhas_7d} {estatisticas.falhas_7d === 1 ? 'falha' : 'falhas'}</Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-light-text whitespace-nowrap">
                        {estatisticas.ultima_execucao_em ? (
                          <time dateTime={estatisticas.ultima_execucao_em} title={dataHoraCompleta(estatisticas.ultima_execucao_em)}>
                            {quando(estatisticas.ultima_execucao_em)}
                          </time>
                        ) : (
                          'Nunca'
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Toggle
                            ariaLabel={`Automação ${automacao.nome} ativa`}
                            checked={!!automacao.ativo}
                            onChange={(novoValor) => onToggleAtivo(automacao, novoValor)}
                          />
                          {!automacao.ativo && automacao.pausada_por_falhas_em && (
                            <Badge
                              variant="warning"
                              size="sm"
                              icon="pause_circle"
                              title={`Pausada automaticamente em ${dataHoraCompleta(automacao.pausada_por_falhas_em)} depois de falhar várias vezes seguidas. Veja o histórico, corrija e reative.`}
                            >
                              Pausada por falhas
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <RowMenu
                          automacao={automacao}
                          onDelete={onDelete}
                          onHistorico={setHistoricoDe}
                          onTestar={setTesteDe}
                          isOpen={openMenuId === automacao.id}
                          onOpenChange={setOpenMenuId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filtradas.length > 0 && (
          <Pagination {...paginacao} onPageChange={paginacao.setPage} label="automações" />
        )}
      </Card>

      <HistoricoExecucoes automacao={historicoDe} onClose={() => setHistoricoDe(null)} />
      <SimulacaoModal
        open={!!testeDe}
        onClose={() => setTesteDe(null)}
        moduloId={testeDe?.modulo_id}
        vaga={ehVaga(modulos.find((m) => m.id === testeDe?.modulo_id))}
        definicao={definicaoTeste}
      />
    </Layout>
  );
}
