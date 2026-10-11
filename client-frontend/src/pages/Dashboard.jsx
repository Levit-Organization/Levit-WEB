import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Avatar,
  Skeleton,
  StatCard,
  Badge,
  coresDaFase,
  estaParado,
} from '../components/ui';
import { useModulos, useEquipe, useKanban, useAutomacoes, useConvites, usePrazos } from '../hooks/queries';
import PainelPrazos from '../components/prazos/PainelPrazos';
import { mensagemDeErro } from '../lib/queryClient';
import { MODELOS_TABELA } from '../utils/modelosTabela';

function SecaoTitulo({ children, acao }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3.5">
      <h2 className="text-base font-bold text-ink">{children}</h2>
      {acao}
    </div>
  );
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

const SEM_DADOS = [];

/** Destino de cada tipo de tabela (financeiro e vaga têm telas próprias). */
function destinoDaTabela(modulo) {
  if (modulo.tipo === 'financeiro') return `/modulos/${modulo.id}/financeiro`;
  if (modulo.tipo === 'recrutamento') return '/recrutamento';
  return `/modulos/${modulo.id}/registros`;
}

/**
 * Tela inicial: primeiro o que ninguém pode esquecer (prazos e o que pede
 * atenção), depois as tabelas; recrutamento e equipe como resumo.
 */
export default function Dashboard() {
  const { primeiroNome, empresa } = useAuth();

  const modulosQuery = useModulos();
  const modulos = modulosQuery.data ?? SEM_DADOS;
  const loadingModulos = modulosQuery.isLoading;

  const equipeQuery = useEquipe();
  const equipe = equipeQuery.data ?? SEM_DADOS;
  const equipeIndisponivel = equipeQuery.error?.response?.status === 403;

  // Convites e automações dependem de permissão: sem acesso, só não aparecem.
  const convites = useConvites({ retry: false }).data ?? SEM_DADOS;
  const automacoes = useAutomacoes().data?.automacoes ?? SEM_DADOS;

  const { tabelas, vagas, totalItens } = useMemo(() => {
    const tabs = modulos.filter((m) => m.tipo !== 'recrutamento');
    return {
      tabelas: tabs,
      vagas: modulos.filter((m) => m.tipo === 'recrutamento'),
      totalItens: tabs.reduce((soma, m) => soma + Number(m.total_registros || 0), 0),
    };
  }, [modulos]);
  const vagaDestaque = vagas[vagas.length - 1] || null;

  const kanbanQuery = useKanban(vagaDestaque?.id, { enabled: !!vagaDestaque });
  const vagaKanban = kanbanQuery.data ?? null;
  const vagaIndisponivel = kanbanQuery.error?.response?.status === 403;

  const { fasesDaVaga, totalCandidatosVaga, paradosVaga } = useMemo(() => {
    const fases = vagaKanban ? Object.entries(vagaKanban) : [];
    const candidatos = fases.flatMap(([, fase]) => fase.candidatos || []);
    return {
      fasesDaVaga: fases,
      totalCandidatosVaga: candidatos.length,
      paradosVaga: candidatos.filter((c) => estaParado(c.atualizado_em || c.criado_em)).length,
    };
  }, [vagaKanban]);

  const resumoAutomacoes = useMemo(
    () =>
      automacoes.reduce(
        (acc, a) => ({
          ativas: acc.ativas + (a.ativo ? 1 : 0),
          execucoes: acc.execucoes + (a.estatisticas?.execucoes_7d || 0),
          falhas: acc.falhas + (a.estatisticas?.falhas_7d || 0),
          pausadas: a.pausada_por_falhas_em && !a.ativo ? [...acc.pausadas, a] : acc.pausadas,
        }),
        { ativas: 0, execucoes: 0, falhas: 0, pausadas: [] }
      ),
    [automacoes]
  );

  const convitesVencidos = convites.filter((c) => c.expirado).length;

  const prazosQuery = usePrazos('todos');
  const atrasados = prazosQuery.data?.atrasados ?? SEM_DADOS;
  const meusAtrasados = atrasados.filter((i) => i.meu).length;

  /** O que pede alguém agir agora, em ordem de urgência. */
  const atencao = [
    ...(atrasados.length > 0
      ? [{
          id: 'atrasados',
          icone: 'event_busy',
          cor: 'bg-danger-bg text-danger',
          titulo: `${plural(atrasados.length, 'item atrasado', 'itens atrasados')}`,
          texto: meusAtrasados > 0 ? `${plural(meusAtrasados, 'está', 'estão')} com você. Veja em Prazos.` : 'Nenhum com você. Veja em Prazos.',
          // O mais atrasado primeiro: leva direto à tabela dele.
          to: `/modulos/${atrasados[0].modulo_id}/registros`,
        }]
      : []),
    ...resumoAutomacoes.pausadas.map((a) => ({
      id: `aut-${a.id}`,
      icone: 'pause_circle',
      cor: 'bg-warning-bg text-warning',
      titulo: `Automação pausada: ${a.nome}`,
      texto: 'Falhou várias vezes seguidas. Veja o histórico, corrija e ligue de novo.',
      to: '/automacoes',
    })),
    ...(paradosVaga > 0
      ? [{
          id: 'parados',
          icone: 'schedule',
          cor: 'bg-warning-bg text-warning',
          titulo: `${plural(paradosVaga, 'candidato parado', 'candidatos parados')} há mais de 14 dias`,
          texto: vagaDestaque ? `Em ${vagaDestaque.nome}.` : '',
          to: '/recrutamento',
        }]
      : []),
    ...(convitesVencidos > 0
      ? [{
          id: 'convites-vencidos',
          icone: 'mail',
          cor: 'bg-danger-bg text-danger',
          titulo: `${plural(convitesVencidos, 'convite venceu', 'convites venceram')} sem resposta`,
          texto: 'Reenvie para a pessoa receber um link novo.',
          to: '/team',
        }]
      : []),
    ...(convites.length - convitesVencidos > 0
      ? [{
          id: 'convites',
          icone: 'forward_to_inbox',
          cor: 'bg-info-bg text-info',
          titulo: `${plural(convites.length - convitesVencidos, 'convite aguardando', 'convites aguardando')} resposta`,
          texto: 'Quem aceitar entra direto na equipe.',
          to: '/team',
        }]
      : []),
  ];

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <Layout>
      <header className="mb-7 shrink-0">
        <h1 className="text-2xl font-bold text-ink">
          {saudacao}, {primeiroNome}
        </h1>
        <p className="text-sm text-light-text mt-1 first-letter:uppercase">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {empresa?.nome ? ` · ${empresa.nome}` : ''}
        </p>
      </header>

      {/* INDICADORES: a operação inteira */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 shrink-0" aria-label="Resumo">
        {loadingModulos ? (
          [1, 2, 3, 4].map((s) => (
            <Card key={s} padding="md" className="flex items-start gap-3.5">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-7 w-14 mb-2" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon="table_chart"
              value={tabelas.length}
              label={tabelas.length === 1 ? 'Tabela' : 'Tabelas'}
              hint={plural(totalItens, 'item guardado', 'itens guardados')}
              variant="primary"
            />
            <StatCard
              icon="bolt"
              value={resumoAutomacoes.ativas}
              label={resumoAutomacoes.ativas === 1 ? 'Automação ligada' : 'Automações ligadas'}
              hint={`${plural(resumoAutomacoes.execucoes, 'execução', 'execuções')} nesta semana`}
              variant="info"
              badge={
                resumoAutomacoes.falhas > 0 ? (
                  <Badge variant="danger" size="sm">{plural(resumoAutomacoes.falhas, 'falha', 'falhas')}</Badge>
                ) : null
              }
            />
            <StatCard
              icon="groups"
              value={equipe.length}
              label={equipe.length === 1 ? 'Pessoa na equipe' : 'Pessoas na equipe'}
              variant="success"
              badge={
                convites.length > 0 ? (
                  <Badge variant="warning" size="sm">+{plural(convites.length, 'convite', 'convites')}</Badge>
                ) : null
              }
            />
            <StatCard
              icon={atencao.length ? 'priority_high' : 'task_alt'}
              value={atencao.length}
              label={atencao.length === 1 ? 'Coisa pede atenção' : 'Coisas pedem atenção'}
              hint={atencao.length ? 'Veja a lista abaixo' : 'Tudo em dia'}
              variant={atencao.length ? 'warning' : 'default'}
            />
          </>
        )}
      </section>

      {/* PRAZOS E ATENÇÃO: o que ninguém pode esquecer */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8 shrink-0">
        <div className="lg:col-span-3 min-w-0">
          <PainelPrazos query={prazosQuery} />
        </div>

        {/* PRECISA DE ATENÇÃO */}
        <Card className="lg:col-span-2 min-w-0">
          <SecaoTitulo>Precisa da sua atenção</SecaoTitulo>
          {atencao.length === 0 ? (
            <EmptyState
              size="sm"
              icon="task_alt"
              title="Tudo em dia"
              description="Quando algo atrasar, uma automação falhar ou um convite vencer, aparece aqui."
              className="py-4"
            />
          ) : (
            <ul className="flex flex-col divide-y divide-divider">
              {atencao.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="flex items-start gap-3 py-3 group">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.cor}`} aria-hidden="true">
                      <span className="material-icons text-[18px]">{item.icone}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink group-hover:text-primary transition-colors">{item.titulo}</span>
                      {item.texto && <span className="block text-xs text-light-text mt-0.5">{item.texto}</span>}
                    </span>
                    <span className="material-icons text-[18px] text-faint mt-2" aria-hidden="true">chevron_right</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* TABELAS: o centro do trabalho */}
      <section className="mb-8 shrink-0">
        <SecaoTitulo acao={<Button to="/modulos/novo" size="sm" variant="secondary" icon="add">Nova tabela</Button>}>
          Suas tabelas
        </SecaoTitulo>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingModulos ? (
            [1, 2, 3].map((s) => (
              <Card key={s} padding="sm" className="flex items-center gap-3.5">
                <Skeleton className="w-11 h-11 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </Card>
            ))
          ) : modulosQuery.isError ? (
            <Card className="col-span-full">
              <ErrorState
                description={mensagemDeErro(modulosQuery.error, 'Erro ao carregar as tabelas.')}
                onRetry={() => modulosQuery.refetch()}
              />
            </Card>
          ) : tabelas.length === 0 ? (
            <Card className="col-span-full">
              <p className="text-sm font-semibold text-ink">Comece pela primeira tabela</p>
              <p className="text-sm text-light-text mt-1">
                Tudo o que hoje está em planilhas, e-mails e mensagens pode virar uma tabela. Escolha um modelo para começar:
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {MODELOS_TABELA.filter((m) => m.segmento || m.id === 'tarefas').map((m) => (
                  <Button key={m.id} to="/modulos/novo" variant="secondary" size="sm" icon={m.icone}>
                    {m.titulo}
                  </Button>
                ))}
              </div>
            </Card>
          ) : (
            tabelas.slice(0, 6).map((modulo) => (
              <Card
                key={modulo.id}
                as={Link}
                to={destinoDaTabela(modulo)}
                padding="sm"
                interactive
                className="flex items-center gap-3.5 group no-underline"
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary-100 text-primary shrink-0">
                  <span className="material-icons text-[21px]" aria-hidden="true">{modulo.icone || 'extension'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-ink truncate">{modulo.nome}</h3>
                  <p className="text-xs text-light-text">
                    {modulo.tipo === 'financeiro' ? 'Entradas e saídas' : plural(Number(modulo.total_registros || 0), 'item', 'itens')}
                  </p>
                </div>
                <span className="material-icons text-[20px] text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true">
                  arrow_forward
                </span>
              </Card>
            ))
          )}
        </div>

        {tabelas.length > 6 && (
          <div className="mt-4">
            <Link to="/modulos" className="text-sm text-primary font-semibold hover:underline">
              Ver todas as {tabelas.length} tabelas
            </Link>
          </div>
        )}
      </section>

      {/* RECRUTAMENTO E EQUIPE (resumo) */}
      <section className="mb-4 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          {/* RECRUTAMENTO (resumo) */}
          <Card className="min-w-0">
            <SecaoTitulo
              acao={
                <Link to="/recrutamento" className="text-sm text-primary font-semibold hover:underline shrink-0">
                  {vagaDestaque ? 'Abrir quadro' : 'Abrir vaga'}
                </Link>
              }
            >
              Recrutamento
            </SecaoTitulo>
            {!vagaDestaque ? (
              <p className="text-sm text-light-text">
                Nenhuma vaga aberta. Quando abrir uma, os candidatos se inscrevem por um link e aparecem num quadro de etapas.
              </p>
            ) : vagaIndisponivel ? (
              <p className="text-sm text-light-text">Seu cargo não tem acesso a esta vaga.</p>
            ) : kanbanQuery.isLoading ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  <strong className="text-ink">{vagaDestaque.nome}</strong> · {plural(totalCandidatosVaga, 'candidato', 'candidatos')}
                  {vagas.length > 1 ? ` · ${plural(vagas.length, 'vaga aberta', 'vagas abertas')}` : ''}
                </p>
                {totalCandidatosVaga > 0 && (
                  <>
                    <div className="flex gap-1 mt-3" aria-hidden="true">
                      {fasesDaVaga.map(([faseId, fase], indice) => {
                        const qtd = fase.candidatos?.length || 0;
                        return (
                          <div
                            key={faseId}
                            className={`h-1.5 rounded-full ${qtd ? coresDaFase(indice, fasesDaVaga.length).dot : 'bg-divider'}`}
                            style={{ flex: Math.max(qtd, 0.35) }}
                          />
                        );
                      })}
                    </div>
                    <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      {fasesDaVaga.map(([faseId, fase], indice) => (
                        <li key={faseId} className="flex items-center gap-1.5 text-xs text-light-text">
                          <span className={`h-1.5 w-1.5 rounded-full ${coresDaFase(indice, fasesDaVaga.length).dot}`} aria-hidden="true" />
                          {fase.fase}: <strong className="text-ink tabular">{fase.candidatos?.length || 0}</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </Card>

          {/* EQUIPE (resumo) */}
          <Card className="min-w-0">
            <SecaoTitulo
              acao={
                <Link to="/team" className="text-sm text-primary font-semibold hover:underline shrink-0">
                  Ver equipe
                </Link>
              }
            >
              Equipe
            </SecaoTitulo>
            {equipeIndisponivel ? (
              <p className="text-sm text-light-text">Seu cargo não tem acesso à lista da equipe.</p>
            ) : equipeQuery.isLoading ? (
              <Skeleton className="h-9 w-40 rounded-full" />
            ) : equipe.length <= 1 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-light-text">Só você por aqui. Convide quem trabalha com você.</p>
                <Button to="/team" size="sm" variant="secondary" icon="person_add">Convidar</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {equipe.slice(0, 6).map((membro) => (
                    <Avatar key={membro.id} name={membro.nome} size="md" ring />
                  ))}
                </div>
                <p className="text-sm text-light-text">
                  {plural(equipe.length, 'pessoa', 'pessoas')}
                  {convites.length > 0 ? ` · ${plural(convites.length, 'convite pendente', 'convites pendentes')}` : ''}
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </Layout>
  );
}
