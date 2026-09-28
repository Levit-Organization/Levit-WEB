import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../services/api';
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
import KanbanColuna from '../components/kanban/KanbanColuna';
import CandidatoModal from '../components/kanban/CandidatoModal';
import { useModulos } from '../hooks/useModulos';
import {
  useKanban,
  useMoverCandidato,
  useCriarEtapa,
  useAdicionarCandidato,
} from '../hooks/useKanban';

export default function RecrutamentoKanban() {
  // ── UI-only state ─────────────────────────────────────────────────────────
  const [successMsg,  setSuccessMsg]  = useState('');
  const [formError,   setFormError]   = useState('');
  const [moveError,   setMoveError]   = useState(null);   // erro de DnD separado do query error
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showNovaEtapa,  setShowNovaEtapa]  = useState(false);
  const [novaEtapaNome,  setNovaEtapaNome]  = useState('');
  const [novaEtapaModuloId, setNovaEtapaModuloId] = useState('');
  const [selectedCard,     setSelectedCard]     = useState(null);
  const [vagaSelecionada,  setVagaSelecionada]  = useState('');
  const [showVagaInfo, setShowVagaInfo] = useState(false);
  const [showNovoCandidato, setShowNovoCandidato] = useState(false);
  const [novoCandidatoDados, setNovoCandidatoDados] = useState({
    modulo_id: '', nome: '', email: '', telefone: '', cargo_desejado: '', mensagem: '', curriculo_url: ''
  });

  const scrollContainerRef = useRef(null);
  const draggedItemRef     = useRef(null);

  const showSuccess = useCallback((msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }, []);

  const showMoveError = useCallback((msg) => {
    setMoveError(msg);
    setTimeout(() => setMoveError(null), 4000);
  }, []);

  // ── Dados via TanStack Query ──────────────────────────────────────────────
  const { data: modulos = [] } = useModulos({
    select: (data) => data?.filter((m) => m.tipo === 'recrutamento') ?? [],
  });

  useEffect(() => {
    if (modulos.length > 0) {
      setNovaEtapaModuloId((cur) => cur || modulos[0].id);
      setVagaSelecionada((cur) => cur || modulos[0].id);
    }
  }, [modulos]);

  const {
    data: kanbanData,
    isLoading: loading,
    error: kanbanError,
  } = useKanban(vagaSelecionada || null);

  const queryError = kanbanError
    ? kanbanError?.response?.data?.message || 'Erro ao carregar o Kanban de recrutamento.'
    : null;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutateAsync: moverCandidato } = useMoverCandidato(vagaSelecionada);
  const { mutateAsync: criarEtapa }     = useCriarEtapa();
  const { mutateAsync: adicionarCandidato, isPending: salvandoCandidato } =
    useAdicionarCandidato(vagaSelecionada);

  // ── Primitivo 1: scroll durante drag — sem deps ───────────────────────────
  const handleDragOverWithScroll = useCallback((e) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const edgeSize = 100;
    const scrollSpeed = 18;
    if (e.clientX - rect.left < edgeSize) container.scrollLeft -= scrollSpeed;
    else if (rect.right - e.clientX < edgeSize) container.scrollLeft += scrollSpeed;
  }, []);

  // ── Primitivo 2: drag start — persiste em ref (sem re-render) ─────────────
  const handleDragStart = useCallback((e, item, sourceColumn) => {
    draggedItemRef.current = { item, sourceColumn };
    setDraggedItem({ item, sourceColumn });
    e.dataTransfer.setData('text/plain', item.id);
  }, []);

  // ── Primitivo 3: drop — KanbanColuna cria seu próprio wrapper por coluna ──
  const handleDrop = useCallback(
    async (e, targetColumnId) => {
      e.preventDefault();
      setDragOverColumn(null);

      const dragged = draggedItemRef.current;
      if (!dragged) return;

      // BUG-19: modo 'all' usa chaves de fase normalizadas, não UUIDs
      if (vagaSelecionada === 'all') {
        draggedItemRef.current = null;
        setDraggedItem(null);
        showMoveError('Selecione uma vaga específica para mover candidatos entre etapas.');
        return;
      }

      const { item, sourceColumn } = dragged;
      if (sourceColumn === targetColumnId) {
        draggedItemRef.current = null;
        setDraggedItem(null);
        return;
      }

      draggedItemRef.current = null;
      setDraggedItem(null);

      try {
        await moverCandidato({
          moduloId:     item.modulo_id,
          candidatoId:  item.id,
          sourceFaseId: sourceColumn,
          faseId:       targetColumnId,
        });
      } catch {
        // rollback automático via snapshot no onError do hook
      }
    },
    [vagaSelecionada, moverCandidato, showMoveError],
  );

  // ── Primitivo 4: click no card ────────────────────────────────────────────
  const handleCardClick = useCallback((cardComMeta) => {
    setSelectedCard(cardComMeta);
  }, []);

  // ── Handlers de formulários ───────────────────────────────────────────────
  const handleNovaEtapa = async () => {
    if (!novaEtapaNome.trim() || !novaEtapaModuloId) return;
    try {
      await criarEtapa({ moduloId: novaEtapaModuloId, nome: novaEtapaNome });
      setNovaEtapaNome('');
      setShowNovaEtapa(false);
      showSuccess('Etapa criada com sucesso.');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erro ao criar etapa.');
    }
  };

  const handleNovoCandidatoSubmit = async () => {
    if (!novoCandidatoDados.modulo_id || !novoCandidatoDados.nome || !novoCandidatoDados.email) {
      setFormError('Vaga, Nome e E-mail são obrigatórios.');
      return;
    }
    try {
      const payload = {
        ...novoCandidatoDados,
        dados: { curriculo_url: novoCandidatoDados.curriculo_url }
      };
      delete payload.curriculo_url;

      await adicionarCandidato(payload);
      setShowNovoCandidato(false);
      setNovoCandidatoDados({ modulo_id: '', nome: '', email: '', telefone: '', cargo_desejado: '', mensagem: '', curriculo_url: '' });
      showSuccess('Candidato adicionado com sucesso.');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erro ao salvar candidato.');
    }
  };

  const colunas = kanbanData ? Object.entries(kanbanData) : [];
  const totalCandidatos = colunas.reduce((acc, [, col]) => acc + (col.candidatos?.length || 0), 0);
  const contratados     = colunas.length ? colunas[colunas.length - 1][1].candidatos?.length || 0 : 0;

  // Busca o módulo detalhado para ter acesso ao array de `campos`
  const { data: moduloDetalhado } = useQuery({
    queryKey: ['modulo', vagaSelecionada],
    queryFn: ({ signal }) => apiGet(`/modulos/${vagaSelecionada}`, { signal }),
    enabled: !!vagaSelecionada && vagaSelecionada !== 'all',
    staleTime: 60_000,
  });

  const camposModulo = moduloDetalhado?.campos || [];

  // ── Render ────────────────────────────────────────────────────────────────
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
              <div className="flex items-center gap-2">
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
                {vagaSelecionada !== 'all' && moduloDetalhado?.descricao && (
                  <Button variant="secondary" icon="info_outline" onClick={() => setShowVagaInfo(true)} aria-label="Ver detalhes da vaga" title="Detalhes da Vaga" className="px-3" />
                )}
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
                    setNovoCandidatoDados((cur) => ({ ...cur, modulo_id: vagaSelecionada }));
                  }
                  setShowNovoCandidato(true);
                }}
              >
                Novo candidato
              </Button>
            </>
          }
        />

        {/* Erros: query error ou erro de DnD (modo 'all') */}
        {(queryError || moveError) && (
          <div className="mb-5 shrink-0">
            <Alert variant="error">{queryError || moveError}</Alert>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 shrink-0">
            <Alert variant="success">{successMsg}</Alert>
          </div>
        )}

        {/* ── Funil ─────────────────────────────────────────────────────────── */}
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
              onDragOver={handleDragOverWithScroll}
            >
              <div className="flex h-full min-w-max gap-5 items-start">
                {colunas.map(([colId, colData], indice) => {
                  const cor   = coresDaFase(indice, colunas.length);
                  const ativa = dragOverColumn === colId;

                  return (
                    <KanbanColuna
                      key={colId}
                      colId={colId}
                      colData={colData}
                      cor={cor}
                      ativa={ativa}
                      campos={camposModulo}
                      // Primitivos estáveis — KanbanColuna cria handlers internos via useCallback([colId])
                      onScrollDragOver={handleDragOverWithScroll}
                      onSetDragOverColumn={setDragOverColumn}
                      onDrop={handleDrop}
                      onDragStart={handleDragStart}
                      onCardClick={handleCardClick}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Modal: Nova etapa ──────────────────────────────────────────────── */}
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

        {/* ── Modal: Perfil do candidato ─────────────────────────────────────── */}
        <CandidatoModal
          candidato={selectedCard}
          onClose={() => setSelectedCard(null)}
          campos={camposModulo}
          vagaSelecionada={vagaSelecionada}
        />

        {/* ── Drawer: Novo candidato ─────────────────────────────────────────── */}
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
            <Input
              label="Link do Currículo ou LinkedIn"
              type="url"
              value={novoCandidatoDados.curriculo_url}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, curriculo_url: e.target.value })}
              placeholder="https://..."
            />
            <Textarea
              label="Mensagem"
              hint="Opcional"
              value={novoCandidatoDados.mensagem}
              onChange={(e) => setNovoCandidatoDados({ ...novoCandidatoDados, mensagem: e.target.value })}
            />
          </div>
        </Drawer>

        {/* ── Drawer: Detalhes da Vaga ────────────────────────────────────────── */}
        <Drawer
          open={showVagaInfo}
          onClose={() => setShowVagaInfo(false)}
          title="Detalhes da Vaga"
          subtitle={moduloDetalhado?.nome || 'Descrição e requisitos'}
        >
          <div className="flex flex-col gap-4 text-sm text-ink whitespace-pre-wrap break-words">
            {moduloDetalhado?.descricao ? (
              <div className="p-4 bg-surface border border-divider rounded-xl">
                {moduloDetalhado.descricao}
              </div>
            ) : (
              <p className="text-light-text italic">Nenhuma descrição fornecida para esta vaga.</p>
            )}
          </div>
        </Drawer>
      </div>
    </Layout>
  );
}
