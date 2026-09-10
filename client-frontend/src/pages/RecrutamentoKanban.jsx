import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import {
  Button,
  Select,
  Input,
  Textarea,
  Modal,
  Drawer,
  Alert,
  Badge,
  Avatar,
  Skeleton,
  PageHeader,
  EmptyState,
  coresDaFase,
  tempoRelativo,
  estaParado,
} from '../components/ui';
import { recrutamentoService } from '../services/recrutamentoService';
import { moduloService } from '../services/moduloService';
import api from '../services/api';

export default function RecrutamentoKanban() {
  const [kanbanData, setKanbanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showNovaEtapa, setShowNovaEtapa] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [modulos, setModulos] = useState([]);
  const [novaEtapaModuloId, setNovaEtapaModuloId] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [vagaSelecionada, setVagaSelecionada] = useState('all');

  const scrollContainerRef = useRef(null);

  // Auto-scroll when dragging near edges
  const handleDragOverWithScroll = useCallback((e) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeSize = 100; // pixels from edge to trigger scroll
    const scrollSpeed = 18;

    if (e.clientX - rect.left < edgeSize) {
      container.scrollLeft -= scrollSpeed;
    } else if (rect.right - e.clientX < edgeSize) {
      container.scrollLeft += scrollSpeed;
    }
  }, []);

  useEffect(() => {
    fetchModulos();
  }, []);

  useEffect(() => {
    fetchKanban();
  }, [vagaSelecionada]);

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const data = vagaSelecionada === 'all'
        ? await recrutamentoService.getKanban()
        : await recrutamentoService.getKanbanDaVaga(vagaSelecionada);
      setKanbanData(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar o Kanban de recrutamento.');
    } finally {
      setLoading(false);
    }
  };

  const fetchModulos = async () => {
    try {
      const data = await moduloService.getAll();
      const recrutamento = data.filter(m => m.tipo === 'recrutamento');
      setModulos(recrutamento);
      if (recrutamento.length > 0) {
        setNovaEtapaModuloId((current) => current || recrutamento[0].id);
        setVagaSelecionada((current) => (current === 'all' ? recrutamento[0].id : current));
      }
    } catch (err) {
      console.error('Erro ao carregar módulos:', err);
    }
  };

  const handleNovaEtapa = async () => {
    if (!novaEtapaNome.trim() || !novaEtapaModuloId) return;
    try {
      await api.post(`/modulos/${novaEtapaModuloId}/fases`, { nome: novaEtapaNome });
      setNovaEtapaNome('');
      setShowNovaEtapa(false);
      showSuccess('Etapa criada com sucesso.');
      fetchKanban();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erro ao criar etapa.');
    }
  };

  const handleDragStart = (e, item, sourceColumn) => {
    setDraggedItem({ item, sourceColumn });
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    handleDragOverWithScroll(e);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedItem) return;

    const { item, sourceColumn } = draggedItem;
    if (sourceColumn === targetColumnId) {
      setDraggedItem(null);
      return;
    }

    // Optimistic update (deep copy to avoid state mutation)
    const newKanban = {};
    for (const [key, value] of Object.entries(kanbanData)) {
      newKanban[key] = {
        ...value,
        candidatos: [...value.candidatos],
      };
    }

    // Remove from source
    newKanban[sourceColumn].candidatos = newKanban[sourceColumn].candidatos.filter(c => c.id !== item.id);
    newKanban[sourceColumn].total--;

    // Add to target
    const updatedItem = { ...item, fase_atual_id: targetColumnId };
    newKanban[targetColumnId].candidatos = [...newKanban[targetColumnId].candidatos, updatedItem];
    newKanban[targetColumnId].total++;

    setKanbanData(newKanban);
    setDraggedItem(null);

    // Persist API call
    try {
      if (vagaSelecionada === 'all') {
        await recrutamentoService.moverFase(item.id, targetColumnId);
      } else {
        await recrutamentoService.moverFaseDaVaga(item.modulo_id, item.id, targetColumnId);
      }
    } catch (err) {
      // Revert if error
      setError(err.response?.data?.message || 'Erro ao mover candidato.');
      fetchKanban();
    }
  };



  const [showNovoCandidato, setShowNovoCandidato] = useState(false);
  const [salvandoCandidato, setSalvandoCandidato] = useState(false);
  const [novoCandidatoDados, setNovoCandidatoDados] = useState({
    modulo_id: '',
    nome: '',
    email: '',
    telefone: '',
    cargo_desejado: '',
    mensagem: ''
  });

  const handleNovoCandidatoSubmit = async () => {
    if (!novoCandidatoDados.modulo_id || !novoCandidatoDados.nome || !novoCandidatoDados.email) {
      setFormError('Vaga, Nome e E-mail são obrigatórios.');
      return;
    }
    try {
      setSalvandoCandidato(true);
      await api.post(`/publico/candidatura/${novoCandidatoDados.modulo_id}`, novoCandidatoDados);
      setShowNovoCandidato(false);
      setNovoCandidatoDados({ modulo_id: '', nome: '', email: '', telefone: '', cargo_desejado: '', mensagem: '' });
      showSuccess('Candidato adicionado com sucesso.');
      fetchKanban();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erro ao salvar candidato.');
    } finally {
      setSalvandoCandidato(false);
    }
  };

  const colunas = kanbanData ? Object.entries(kanbanData) : [];
  const totalCandidatos = colunas.reduce((acc, [, col]) => acc + (col.candidatos?.length || 0), 0);
  const contratados = colunas.length ? colunas[colunas.length - 1][1].candidatos?.length || 0 : 0;

  return (
    <Layout noPadding>
      <div className="flex min-h-0 flex-1 flex-col p-8 pb-0 h-full overflow-hidden">
        <PageHeader
          title="Recrutamento"
          subtitle={
            loading
              ? 'Carregando funil...'
              : `${totalCandidatos} ${totalCandidatos === 1 ? 'candidato' : 'candidatos'} no funil · ${contratados} na etapa final`
          }
          actions={
            <>
              <div className="w-52">
                <Select
                  value={vagaSelecionada}
                  onChange={(e) => setVagaSelecionada(e.target.value)}
                  disabled={modulos.length === 0}
                  icon="work_outline"
                  aria-label="Vaga"
                  options={
                    modulos.length === 0
                      ? [{ value: 'all', label: 'Nenhuma vaga criada' }]
                      : modulos.map((m) => ({ value: m.id, label: m.nome }))
                  }
                />
              </div>
              <Button
                variant="secondary"
                icon="add"
                onClick={() => {
                  setFormError('');
                  if (vagaSelecionada !== 'all') setNovaEtapaModuloId(vagaSelecionada);
                  setShowNovaEtapa(true);
                }}
              >
                Nova etapa
              </Button>
              <Button
                icon="person_add"
                onClick={() => {
                  setFormError('');
                  if (vagaSelecionada !== 'all') {
                    setNovoCandidatoDados((current) => ({ ...current, modulo_id: vagaSelecionada }));
                  }
                  setShowNovoCandidato(true);
                }}
              >
                Novo candidato
              </Button>
            </>
          }
        />

        {error && (
          <div className="mb-5 shrink-0">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 shrink-0">
            <Alert variant="success">{successMsg}</Alert>
          </div>
        )}

        {/* Funil */}
        <section className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full overflow-x-auto pb-6">
              <div className="flex h-full min-w-max gap-5 items-start">
                {[1, 2, 3, 4].map((coluna) => (
                  <div key={coluna} className="flex w-[300px] flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-5 w-6 rounded-full" />
                    </div>
                    {[1, 2, 3].map((card) => (
                      <div key={card} className="rounded-xl bg-surface border border-divider p-3.5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                          <div className="flex-1">
                            <Skeleton className="h-3.5 w-28 mb-1.5" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : colunas.length === 0 ? (
            <div className="h-full flex items-center justify-center pb-16">
              <EmptyState
                icon="person_search"
                title="Nenhuma etapa configurada"
                description="Um funil de recrutamento é uma sequência de etapas — triagem, entrevista, proposta. Crie a primeira para começar a receber candidatos."
                actionLabel="Criar primeira etapa"
                actionIcon="add"
                onAction={() => {
                  setFormError('');
                  if (vagaSelecionada !== 'all') setNovaEtapaModuloId(vagaSelecionada);
                  setShowNovaEtapa(true);
                }}
              />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="h-full overflow-x-auto overflow-y-hidden pb-6"
              onDragOver={handleDragOver}
            >
              <div className="flex h-full min-w-max gap-5 items-start">
                {colunas.map(([colId, colData], indice) => {
                  const cor = coresDaFase(indice, colunas.length);
                  const ativa = dragOverColumn === colId;

                  return (
                    <div
                      key={colId}
                      className="flex h-full max-h-full w-[300px] shrink-0 flex-col"
                      onDragOver={(e) => {
                        handleDragOver(e);
                        if (dragOverColumn !== colId) setDragOverColumn(colId);
                      }}
                      onDragLeave={() => setDragOverColumn((c) => (c === colId ? null : c))}
                      onDrop={(e) => handleDrop(e, colId)}
                    >
                      {/* Cabeçalho da etapa */}
                      <div className="flex items-center justify-between gap-2 px-1 pb-3 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${cor.dot}`} />
                          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft truncate">
                            {colData.fase || colId}
                          </h2>
                        </div>
                        <span
                          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular ${cor.bg} ${cor.text}`}
                        >
                          {colData.total ?? colData.candidatos.length}
                        </span>
                      </div>

                      {/* Cartões */}
                      <div
                        className={`flex-1 min-h-0 space-y-2.5 overflow-y-auto rounded-xl p-2 transition-colors duration-150 ${
                          ativa ? 'bg-primary-100 ring-2 ring-primary-200' : 'bg-sidebar/60'
                        }`}
                      >
                        {colData.candidatos.map((item) => {
                          const desde = tempoRelativo(item.atualizado_em || item.criado_em);
                          const parado = estaParado(item.atualizado_em || item.criado_em);

                          return (
                            <article
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item, colId)}
                              onClick={() => setSelectedCard({ ...item, colId, faseNome: colData.fase || colId, cor })}
                              className="group cursor-grab rounded-lg bg-surface border border-divider p-3.5 shadow-xs transition-[box-shadow,border-color,transform] duration-150 ease-out-quart hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar name={item.nome} size="lg" />
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
                                    {item.nome || 'Sem nome'}
                                  </h3>
                                  <p className="text-xs text-light-text truncate">
                                    {item.cargo_desejado || item.vaga || 'Sem cargo informado'}
                                  </p>
                                </div>
                              </div>

                              {(desde || parado) && (
                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-divider pt-2.5">
                                  <span className="text-2xs text-light-text truncate">
                                    {desde ? `Nesta etapa ${desde}` : ''}
                                  </span>
                                  {parado && (
                                    <Badge variant="warning" size="sm" dot>
                                      Parado
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}

                        {colData.candidatos.length === 0 && (
                          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-divider-strong px-4 text-center text-xs text-light-text">
                            Arraste um candidato para cá
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <Modal
          open={showNovaEtapa}
          onClose={() => setShowNovaEtapa(false)}
          title="Nova etapa"
          subtitle="Ela entra no fim do funil desta vaga"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowNovaEtapa(false)}>Cancelar</Button>
              <Button onClick={handleNovaEtapa} disabled={!novaEtapaNome.trim() || !novaEtapaModuloId}>
                Criar etapa
              </Button>
            </>
          }
        >
          {formError && (
            <div className="mb-4">
              <Alert variant="error">{formError}</Alert>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Select
              label="Vaga"
              value={novaEtapaModuloId}
              onChange={(e) => setNovaEtapaModuloId(e.target.value)}
              placeholder="Selecione uma vaga..."
              options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
            />

            <Input
              label="Nome da etapa"
              value={novaEtapaNome}
              onChange={(e) => setNovaEtapaNome(e.target.value)}
              placeholder="Ex: Entrevista técnica"
              autoFocus
            />
          </div>
        </Modal>

        {/* Perfil do candidato */}
        <Modal
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          title={selectedCard?.nome || 'Candidato'}
          subtitle={selectedCard?.cargo_desejado || selectedCard?.vaga || undefined}
          maxWidth="lg"
          footer={
            selectedCard?.email ? (
              <>
                <Button variant="secondary" onClick={() => setSelectedCard(null)}>Fechar</Button>
                <Button
                  icon="mail"
                  onClick={() => { window.location.href = `mailto:${selectedCard.email}`; }}
                >
                  Enviar e-mail
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setSelectedCard(null)}>Fechar</Button>
            )
          }
        >
          {selectedCard && (
            <>
              <div className="flex items-center gap-4 pb-5 border-b border-divider">
                <Avatar name={selectedCard.nome} size="xl" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${selectedCard.cor?.bg || 'bg-primary-100'} ${selectedCard.cor?.text || 'text-primary'}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${selectedCard.cor?.dot || 'bg-primary'}`} />
                      {selectedCard.faseNome}
                    </span>
                    {estaParado(selectedCard.atualizado_em || selectedCard.criado_em) && (
                      <Badge variant="warning" size="sm" dot>Parado há mais de 14 dias</Badge>
                    )}
                  </div>
                  <p className="text-xs text-light-text mt-1.5">
                    Candidatou-se {tempoRelativo(selectedCard.criado_em) || '—'}
                    {selectedCard.vaga ? ` · ${selectedCard.vaga}` : ''}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-divider">
                {[
                  { label: 'E-mail', value: selectedCard.email, icon: 'mail_outline', href: selectedCard.email ? `mailto:${selectedCard.email}` : null },
                  { label: 'Telefone', value: selectedCard.telefone, icon: 'call', href: selectedCard.telefone ? `tel:${selectedCard.telefone}` : null },
                  { label: 'Cargo desejado', value: selectedCard.cargo_desejado, icon: 'work_outline' },
                ].map((campo) => (
                  <div key={campo.label} className="flex items-center gap-3 py-3">
                    <span className="material-icons text-[18px] text-light-text shrink-0">{campo.icon}</span>
                    <dt className="text-xs text-light-text w-32 shrink-0">{campo.label}</dt>
                    <dd className="text-sm text-ink truncate min-w-0 flex-1">
                      {campo.value ? (
                        campo.href ? (
                          <a href={campo.href} className="hover:text-primary hover:underline">{campo.value}</a>
                        ) : (
                          campo.value
                        )
                      ) : (
                        <span className="text-light-text">Não informado</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {selectedCard.mensagem && (
                <div className="mt-2 pt-4 border-t border-divider">
                  <p className="text-xs font-semibold text-ink mb-2">Mensagem do candidato</p>
                  <p className="text-sm text-ink-soft whitespace-pre-wrap break-words leading-relaxed">
                    {selectedCard.mensagem}
                  </p>
                </div>
              )}
            </>
          )}
        </Modal>

        {/* Novo candidato */}
        <Drawer
          open={showNovoCandidato}
          onClose={() => setShowNovoCandidato(false)}
          title="Novo candidato"
          subtitle="Entra na primeira etapa do funil da vaga"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowNovoCandidato(false)}>Cancelar</Button>
              <Button onClick={handleNovoCandidatoSubmit} loading={salvandoCandidato}>
                {salvandoCandidato ? 'Salvando...' : 'Adicionar candidato'}
              </Button>
            </>
          }
        >
          {formError && (
            <div className="mb-4">
              <Alert variant="error">{formError}</Alert>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Select
              label="Vaga"
              value={novoCandidatoDados.modulo_id}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, modulo_id: e.target.value })}
              placeholder="Selecione uma vaga..."
              options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
            />
            <Input
              label="Nome"
              value={novoCandidatoDados.nome}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, nome: e.target.value })}
              placeholder="Nome completo"
            />
            <Input
              label="E-mail"
              type="email"
              value={novoCandidatoDados.email}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, email: e.target.value })}
              placeholder="candidato@email.com"
            />
            <Input
              label="Telefone"
              value={novoCandidatoDados.telefone}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, telefone: e.target.value })}
              placeholder="(11) 90000-0000"
            />
            <Input
              label="Cargo desejado"
              value={novoCandidatoDados.cargo_desejado}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, cargo_desejado: e.target.value })}
              placeholder="Ex: Pessoa Desenvolvedora Back-end"
            />
            <Textarea
              label="Mensagem"
              hint="Opcional"
              value={novoCandidatoDados.mensagem}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, mensagem: e.target.value })}
            />
          </div>
        </Drawer>
      </div>
    </Layout>
  );
}
