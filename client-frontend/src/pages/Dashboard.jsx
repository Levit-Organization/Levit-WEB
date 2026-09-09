import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { moduloService } from '../services/moduloService';
import { equipeService } from '../services/equipeService';
import { recrutamentoService } from '../services/recrutamentoService';

function getInitials(nome = '') {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

export default function Dashboard() {
  const { primeiroNome, iniciais, empresa } = useAuth();
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

  // Calculate KPIs from real data
  const totalModulos = modulos.length;
  const totalRegistros = modulos.reduce((acc, m) => acc + (parseInt(m.total_registros) || 0), 0);

  const kpis = [
    { value: totalModulos, label: 'Módulos Ativos', colorClass: 'text-primary' },
    { value: totalRegistros, label: 'Total de Registros', colorClass: 'text-emerald-600' },
  ];

  // Show up to 6 recent modules
  const recentModules = modulos.slice(0, 6);

  const fasesDaVaga = vagaKanban ? Object.entries(vagaKanban) : [];
  const totalCandidatosVaga = fasesDaVaga.reduce((acc, [, fase]) => acc + (fase.candidatos?.length || 0), 0);

  return (
    <Layout>
      {/* CABEÇALHO */}
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {primeiroNome}!
          </h1>
          <p className="text-sm text-light-text mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
          {iniciais}
        </div>
      </header>

      {/* KPIS (INDICADORES) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 shrink-0">
        {loadingModulos ? (
          [1, 2].map((skeleton) => (
            <div key={skeleton} className="bg-white border border-divider rounded-xl p-6 h-28 animate-pulse flex flex-col justify-center">
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
            </div>
          ))
        ) : (
          kpis.map((kpi, index) => (
            <div key={index} className="bg-white border border-divider rounded-xl p-6">
              <h3 className={`text-3xl font-bold mb-1 ${kpi.colorClass}`}>{kpi.value}</h3>
              <p className="text-sm text-light-text">{kpi.label}</p>
            </div>
          ))
        )}
      </section>

      {/* MÓDULOS */}
      <section className="mb-8 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Módulos</h2>
          <Link 
            to="/modulos/novo"
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/80 transition flex items-center gap-1.5"
          >
            <span className="material-icons text-base">add</span>
            Novo Módulo
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingModulos ? (
             [1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="bg-white border border-divider rounded-xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-16"></div>
                </div>
              </div>
            ))
          ) : recentModules.length === 0 ? (
            <div className="col-span-full bg-white border border-divider rounded-xl p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-2xl text-light-text">widgets</span>
              </div>
              <p className="text-light-text mb-3 text-sm">Nenhum módulo criado ainda.</p>
              <Link to="/modulos/novo" className="text-primary font-medium hover:underline text-sm">
                Crie seu primeiro módulo
              </Link>
            </div>
          ) : (
            recentModules.map((modulo) => (
              <Link
                key={modulo.id} 
                to={`/modulos/${modulo.id}/registros`}
                className="bg-white border border-divider rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-primary/20 transition group"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white bg-primary shrink-0">
                  <span className="material-icons text-xl">{modulo.icone || 'extension'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{modulo.nome}</h4>
                  <p className="text-xs text-light-text">
                    {modulo.total_registros || 0} registro{(modulo.total_registros || 0) != 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-icons text-lg text-light-text opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </Link>
            ))
          )}
        </div>

        {modulos.length > 6 && (
          <div className="text-center mt-4">
            <Link to="/modulos" className="text-sm text-primary font-medium hover:underline">
              Ver todos os {modulos.length} módulos
            </Link>
          </div>
        )}
      </section>

      {/* VAGA EM DESTAQUE + EQUIPE */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 shrink-0">

        {/* Vaga em destaque — mini kanban */}
        <div className="bg-white border border-divider rounded-xl p-6 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Vaga em Destaque</h2>
              {vagaDestaque && (
                <p className="text-xs text-light-text mt-0.5">{vagaDestaque.nome}</p>
              )}
            </div>
            {vagaDestaque && (
              <Link to="/recrutamento" className="text-primary text-sm font-medium hover:underline shrink-0">
                Ver Kanban
              </Link>
            )}
          </div>

          {loadingModulos || loadingVaga ? (
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="w-32 shrink-0 rounded-lg bg-background p-2 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-3"></div>
                  <div className="h-6 bg-white rounded mb-1.5"></div>
                  <div className="h-6 bg-white rounded"></div>
                </div>
              ))}
            </div>
          ) : !vagaDestaque ? (
            <div className="text-center py-6">
              <p className="text-sm text-light-text mb-2">Nenhuma vaga de recrutamento criada ainda.</p>
              <Link to="/modulos/novo" className="text-primary font-medium hover:underline text-sm">
                Criar vaga
              </Link>
            </div>
          ) : vagaIndisponivel ? (
            <div className="text-center py-6">
              <span className="material-icons text-2xl text-light-text mb-2 block">lock</span>
              <p className="text-sm text-light-text">Você não tem acesso a esta vaga.</p>
            </div>
          ) : vagaErro ? (
            <div className="text-center py-6">
              <span className="material-icons text-2xl text-red-400 mb-2 block">error_outline</span>
              <p className="text-sm text-light-text">{vagaErro}</p>
            </div>
          ) : totalCandidatosVaga === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-light-text">Nenhum candidato ainda.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {fasesDaVaga.map(([faseId, fase]) => (
                <div key={faseId} className="w-36 shrink-0 rounded-lg bg-background p-2.5">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-light-text truncate">
                      {fase.fase}
                    </span>
                    <span className="text-[10px] font-bold text-light-text shrink-0 ml-1">
                      {fase.total ?? fase.candidatos.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {fase.candidatos.slice(0, 4).map((candidato) => (
                      <div
                        key={candidato.id}
                        title={candidato.nome}
                        className="bg-white border border-divider rounded-md px-2 py-1.5 text-xs font-medium truncate"
                      >
                        {candidato.nome || 'Sem nome'}
                      </div>
                    ))}
                    {fase.candidatos.length === 0 && (
                      <div className="text-[11px] text-light-text/70 px-0.5 py-1">Vazio</div>
                    )}
                    {fase.candidatos.length > 4 && (
                      <p className="text-[11px] text-primary font-medium px-0.5">
                        +{fase.candidatos.length - 4} mais
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipe */}
        <div className="bg-white border border-divider rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Equipe</h2>
            <Link to="/team" className="text-primary text-sm font-medium hover:underline">
              Ver todos
            </Link>
          </div>

          {loadingEquipe ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5"></div>
                    <div className="h-3 bg-gray-100 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : equipeIndisponivel ? (
            <div className="text-center py-6">
              <span className="material-icons text-2xl text-light-text mb-2 block">lock</span>
              <p className="text-sm text-light-text">Você não tem permissão para ver a equipe.</p>
            </div>
          ) : equipeErro ? (
            <div className="text-center py-6">
              <span className="material-icons text-2xl text-red-400 mb-2 block">error_outline</span>
              <p className="text-sm text-light-text">{equipeErro}</p>
            </div>
          ) : equipe.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-light-text">Nenhum membro na equipe ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {equipe.slice(0, 6).map((membro) => (
                <div key={membro.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {getInitials(membro.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{membro.nome}</p>
                    <p className="text-xs text-light-text truncate">{membro.cargo_nome || '—'}</p>
                  </div>
                  {membro.status && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      membro.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {membro.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
