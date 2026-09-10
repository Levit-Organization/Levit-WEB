import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  Button,
  Card,
  EmptyState,
  Avatar,
  Skeleton,
  StatCard,
  Badge,
  coresDaFase,
  tempoRelativo,
  estaParado,
} from '../components/ui';
import { moduloService } from '../services/moduloService';
import { equipeService } from '../services/equipeService';
import { recrutamentoService } from '../services/recrutamentoService';

function SecaoTitulo({ children, acao }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3.5">
      <h2 className="text-base font-bold text-ink">{children}</h2>
      {acao}
    </div>
  );
}

export default function Dashboard() {
  const { primeiroNome, empresa } = useAuth();
  const [modulos, setModulos] = useState([]);
  const [loadingModulos, setLoadingModulos] = useState(true);

  const [equipe, setEquipe] = useState([]);
  const [loadingEquipe, setLoadingEquipe] = useState(true);
  const [equipeIndisponivel, setEquipeIndisponivel] = useState(false);
  const [equipeErro, setEquipeErro] = useState('');

  const [vagaDestaque, setVagaDestaque] = useState(null);
  const [vagaKanban, setVagaKanban] = useState(null);
  const [loadingVaga, setLoadingVaga] = useState(false);
  const [vagaIndisponivel, setVagaIndisponivel] = useState(false);
  const [vagaErro, setVagaErro] = useState('');

  useEffect(() => {
    fetchModulos();
    fetchEquipe();
  }, []);

  useEffect(() => {
    const vagas = modulos.filter((m) => m.tipo === 'recrutamento');
    const vaga = vagas[vagas.length - 1] || null;
    setVagaDestaque(vaga);
    if (vaga) {
      fetchKanbanDaVaga(vaga.id);
    }
  }, [modulos]);

  const fetchModulos = async () => {
    try {
      setLoadingModulos(true);
      const data = await moduloService.getAll();
      setModulos(data);
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
    } finally {
      setLoadingModulos(false);
    }
  };

  const fetchEquipe = async () => {
    try {
      setLoadingEquipe(true);
      setEquipeErro('');
      const data = await equipeService.listarMembros();
      setEquipe(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      if (error.response?.status === 403) {
        setEquipeIndisponivel(true);
      } else {
        setEquipeErro(error.response?.data?.message || 'Erro ao carregar a equipe.');
      }
    } finally {
      setLoadingEquipe(false);
    }
  };

  const fetchKanbanDaVaga = async (moduloId) => {
    try {
      setLoadingVaga(true);
      setVagaIndisponivel(false);
      setVagaErro('');
      const kanban = await recrutamentoService.getKanbanDaVaga(moduloId);
      setVagaKanban(kanban || {});
    } catch (error) {
      console.error('Erro ao carregar candidatos da vaga:', error);
      if (error.response?.status === 403) {
        setVagaIndisponivel(true);
      } else {
        setVagaErro(error.response?.data?.message || 'Erro ao carregar os candidatos desta vaga.');
      }
    } finally {
      setLoadingVaga(false);
    }
  };

  const vagas = modulos.filter((m) => m.tipo === 'recrutamento');
  const outrosModulos = modulos.filter((m) => m.tipo !== 'recrutamento');

  const fasesDaVaga = vagaKanban ? Object.entries(vagaKanban) : [];
  const candidatosDaVaga = fasesDaVaga.flatMap(([, fase]) => fase.candidatos || []);
  const totalCandidatosVaga = candidatosDaVaga.length;
  const paradosVaga = candidatosDaVaga.filter((c) => estaParado(c.atualizado_em || c.criado_em)).length;
  const membrosAtivos = equipe.filter((m) => m.status !== 'Pendente').length;
  const convitesPendentes = equipe.length - membrosAtivos;

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

      {/* INDICADORES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 shrink-0">
        {loadingModulos || loadingVaga ? (
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
              icon="work_outline"
              value={vagas.length}
              label={vagas.length === 1 ? 'Vaga aberta' : 'Vagas abertas'}
              variant="primary"
            />
            <StatCard
              icon="person_search"
              value={totalCandidatosVaga}
              label="Candidatos no funil"
              hint={vagaDestaque?.nome}
              variant="info"
            />
            <StatCard
              icon="groups"
              value={membrosAtivos}
              label={membrosAtivos === 1 ? 'Pessoa na equipe' : 'Pessoas na equipe'}
              variant="success"
              badge={
                convitesPendentes > 0 ? (
                  <Badge variant="warning" size="sm">
                    +{convitesPendentes} convite{convitesPendentes > 1 ? 's' : ''}
                  </Badge>
                ) : null
              }
            />
            <StatCard
              icon="schedule"
              value={paradosVaga}
              label="Parados há mais de 14 dias"
              hint={paradosVaga > 0 ? 'Precisam de uma resposta' : 'Funil em dia'}
              variant={paradosVaga > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </section>

      {/* FUNIL + EQUIPE */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8 shrink-0">
        {/* Funil da vaga em destaque */}
        <Card className="lg:col-span-3 min-w-0">
          <SecaoTitulo
            acao={
              vagaDestaque && (
                <Link to="/recrutamento" className="text-sm text-primary font-semibold hover:underline shrink-0">
                  Abrir funil
                </Link>
              )
            }
          >
            {vagaDestaque ? vagaDestaque.nome : 'Funil de recrutamento'}
          </SecaoTitulo>

          {loadingModulos || loadingVaga ? (
            <div className="flex gap-2.5">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex-1">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : !vagaDestaque ? (
            <EmptyState
              size="sm"
              icon="work_outline"
              title="Nenhuma vaga aberta"
              description="Crie uma vaga para montar o funil de etapas e começar a receber candidaturas."
              actionLabel="Criar vaga"
              actionIcon="add"
              actionTo="/modulos/novo"
              className="py-4"
            />
          ) : vagaIndisponivel ? (
            <EmptyState size="sm" icon="lock" title="Sem acesso" description="Seu cargo não tem permissão para ver esta vaga." className="py-4" />
          ) : vagaErro ? (
            <EmptyState size="sm" icon="error_outline" title="Não foi possível carregar" description={vagaErro} className="py-4" />
          ) : totalCandidatosVaga === 0 ? (
            <EmptyState
              size="sm"
              icon="person_search"
              title="Nenhum candidato ainda"
              description="Assim que alguém se candidatar, o funil aparece aqui com o avanço por etapa."
              className="py-4"
            />
          ) : (
            <>
              {/* Barra do funil: largura proporcional ao volume por etapa */}
              <div className="flex gap-1 mb-4">
                {fasesDaVaga.map(([faseId, fase], indice) => {
                  const qtd = fase.candidatos?.length || 0;
                  const cor = coresDaFase(indice, fasesDaVaga.length);
                  return (
                    <div
                      key={faseId}
                      className={`h-1.5 rounded-full ${qtd ? cor.dot : 'bg-divider'}`}
                      style={{ flex: Math.max(qtd, 0.35) }}
                      title={`${fase.fase}: ${qtd}`}
                    />
                  );
                })}
              </div>

              <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(fasesDaVaga.length, 5)}, minmax(0, 1fr))` }}>
                {fasesDaVaga.slice(0, 5).map(([faseId, fase], indice) => {
                  const cor = coresDaFase(indice, fasesDaVaga.length);
                  const qtd = fase.candidatos?.length || 0;

                  return (
                    <div key={faseId} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cor.dot}`} />
                        <span className="text-2xs font-semibold uppercase tracking-wide text-light-text truncate">
                          {fase.fase}
                        </span>
                      </div>
                      <p className={`text-xl font-bold tabular ${qtd ? cor.text : 'text-faint'}`}>{qtd}</p>
                      <div className="mt-2 flex -space-x-1.5">
                        {(fase.candidatos || []).slice(0, 4).map((c) => (
                          <Avatar key={c.id} name={c.nome} size="xs" ring />
                        ))}
                        {qtd > 4 && (
                          <span className="w-6 h-6 rounded-full bg-background ring-2 ring-surface flex items-center justify-center text-[9px] font-bold text-light-text">
                            +{qtd - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Equipe */}
        <Card className="lg:col-span-2 min-w-0">
          <SecaoTitulo
            acao={
              <Link to="/team" className="text-sm text-primary font-semibold hover:underline shrink-0">
                Ver equipe
              </Link>
            }
          >
            Equipe
          </SecaoTitulo>

          {loadingEquipe ? (
            <div className="flex flex-col gap-3.5">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-28 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : equipeIndisponivel ? (
            <EmptyState size="sm" icon="lock" title="Sem acesso" description="Seu cargo não tem permissão para ver a equipe." className="py-4" />
          ) : equipeErro ? (
            <EmptyState size="sm" icon="error_outline" title="Não foi possível carregar" description={equipeErro} className="py-4" />
          ) : equipe.length === 0 ? (
            <EmptyState
              size="sm"
              icon="group_add"
              title="Só você por aqui"
              description="Convide quem participa das contratações para dividir o acompanhamento das vagas."
              actionLabel="Convidar pessoa"
              actionIcon="person_add"
              actionTo="/team"
              className="py-4"
            />
          ) : (
            <div className="flex flex-col">
              {equipe.slice(0, 5).map((membro) => (
                <div key={membro.id} className="flex items-center gap-3 py-2">
                  <Avatar name={membro.nome} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{membro.nome}</p>
                    <p className="text-2xs text-light-text truncate">{membro.cargo_nome || 'Sem cargo'}</p>
                  </div>
                  {membro.status === 'Pendente' && (
                    <Badge variant="warning" size="sm">Convite pendente</Badge>
                  )}
                </div>
              ))}
              {equipe.length > 5 && (
                <p className="text-2xs text-light-text pt-2">
                  e mais {equipe.length - 5} {equipe.length - 5 === 1 ? 'pessoa' : 'pessoas'}
                </p>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* MÓDULOS */}
      <section className="mb-4 shrink-0">
        <SecaoTitulo
          acao={<Button to="/modulos/novo" size="sm" variant="secondary" icon="add">Novo módulo</Button>}
        >
          Seus módulos
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
          ) : outrosModulos.length === 0 ? (
            <Card className="col-span-full">
              <EmptyState
                icon="widgets"
                title="Nenhum módulo além das vagas"
                description="Módulos guardam o resto do RH: documentos, avaliações, controle de ponto. Você define os campos."
                actionLabel="Criar módulo"
                actionIcon="add"
                actionTo="/modulos/novo"
              />
            </Card>
          ) : (
            outrosModulos.slice(0, 6).map((modulo) => (
              <Card
                key={modulo.id}
                as={Link}
                to={`/modulos/${modulo.id}/registros`}
                padding="sm"
                interactive
                className="flex items-center gap-3.5 group no-underline"
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary-100 text-primary shrink-0">
                  <span className="material-icons text-[21px]">{modulo.icone || 'extension'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-ink truncate">{modulo.nome}</h3>
                  <p className="text-xs text-light-text">
                    {modulo.total_registros || 0} registro{(modulo.total_registros || 0) != 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-icons text-[20px] text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  arrow_forward
                </span>
              </Card>
            ))
          )}
        </div>

        {outrosModulos.length > 6 && (
          <div className="mt-4">
            <Link to="/modulos" className="text-sm text-primary font-semibold hover:underline">
              Ver todos os {outrosModulos.length} módulos
            </Link>
          </div>
        )}
      </section>
    </Layout>
  );
}
