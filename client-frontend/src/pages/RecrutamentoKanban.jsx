import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import KanbanColumn from '../components/kanban/KanbanColumn';
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
  ErrorState,
  coresDaFase,
  tempoRelativo,
  estaParado,
} from '../components/ui';
import { recrutamentoService } from '../services/recrutamentoService';
import { useModulos, useKanban, queryKeys } from '../hooks/queries';
import { useToast } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { moverCandidatoNoFunil, localizarCandidato } from '../utils/kanban';
import { mascararTelefone } from '../utils/masks';

const CANDIDATO_VAZIO = { modulo_id: '', nome: '', email: '', telefone: '', cargo_desejado: '', mensagem: '' };
const SEM_DADOS = [];
const BORDA_AUTOSCROLL = 100; // px da borda que dispara o auto-scroll durante o arraste
const VELOCIDADE_AUTOSCROLL = 18;

export default function RecrutamentoKanban() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // --- Vagas e funil ---------------------------------------------------------
  const modulosQuery = useModulos();
  const vagas = useMemo(
    () => (modulosQuery.data ?? SEM_DADOS).filter((m) => m.tipo === 'recrutamento'),
    [modulosQuery.data]
  );

  const [vagaEscolhida, setVagaEscolhida] = useState(null);
  // Sem escolha (ou com a vaga escolhida removida) usa a primeira vaga. Sem vagas
  // nenhuma, mostra o funil global em modo somente leitura ('all').
  const vagaSelecionada =
    vagas.find((v) => v.id === vagaEscolhida)?.id ?? vagas[0]?.id ?? 'all';
  const modoSomenteLeitura = vagaSelecionada === 'all';

  // Espera saber quais vagas existem: evita buscar o funil global e logo em seguida o da vaga.
  // Durante um arraste ou com movimentos ainda sendo gravados, o polling espera:
  // um refetch nesse intervalo traria o cartão de volta à coluna antiga.
  const dragRef = useRef(null);
  const movimentosPendentes = useRef(0);
  const sincronizacaoPausada = useCallback(
    () => dragRef.current !== null || movimentosPendentes.current > 0,
    []
  );
  const kanbanQuery = useKanban(modoSomenteLeitura ? undefined : vagaSelecionada, {
    enabled: !modulosQuery.isLoading,
    pausado: sincronizacaoPausada,
  });
  const kanbanData = kanbanQuery.data ?? null;
  const loading = modulosQuery.isLoading || kanbanQuery.isLoading;

  const colunas = useMemo(() => (kanbanData ? Object.entries(kanbanData) : []), [kanbanData]);
  // Opções do seletor de etapa no cartão (mesma ideia do quadro das tabelas).
  const etapasParaMover = useMemo(() => colunas.map(([colId, col]) => ({ id: colId, nome: col.fase || colId })), [colunas]);
  const totalCandidatos = useMemo(
    () => colunas.reduce((acc, [, col]) => acc + (col.candidatos?.length || 0), 0),
    [colunas]
  );
  const contratados = colunas.length ? colunas[colunas.length - 1][1].candidatos?.length || 0 : 0;

  // --- Arrastar e soltar -----------------------------------------------------
  // O item arrastado fica em ref: iniciar o arraste não precisa re-renderizar nada.
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const scrollContainerRef = useRef(null);
  const velocidadeScroll = useRef(0);
  const rafScroll = useRef(null);

  const pararAutoScroll = useCallback(() => {
    velocidadeScroll.current = 0;
    if (rafScroll.current) {
      cancelAnimationFrame(rafScroll.current);
      rafScroll.current = null;
    }
  }, []);

  useEffect(() => pararAutoScroll, [pararAutoScroll]);

  // Auto-scroll ao arrastar perto das bordas: um laço por frame, não um salto por evento.
  const handleContainerDragOver = useCallback(
    (e) => {
      const container = scrollContainerRef.current;
      if (!container || !dragRef.current) return;

      const rect = container.getBoundingClientRect();
      if (e.clientX - rect.left < BORDA_AUTOSCROLL) velocidadeScroll.current = -VELOCIDADE_AUTOSCROLL;
      else if (rect.right - e.clientX < BORDA_AUTOSCROLL) velocidadeScroll.current = VELOCIDADE_AUTOSCROLL;
      else velocidadeScroll.current = 0;

      if (velocidadeScroll.current !== 0 && !rafScroll.current) {
        const passo = () => {
          const el = scrollContainerRef.current;
          if (!el || velocidadeScroll.current === 0) {
            rafScroll.current = null;
            return;
          }
          el.scrollLeft += velocidadeScroll.current;
          rafScroll.current = requestAnimationFrame(passo);
        };
        rafScroll.current = requestAnimationFrame(passo);
      }
    },
    []
  );

  /**
   * Move o candidato no cache (otimista) e persiste. Se a API falhar, desfaz só
   * esse cartão — o resto do funil continua como está, sem skeleton nem refetch visível.
   */
  const moverCandidato = useCallback(
    async (item, deColuna, paraColuna) => {
      if (deColuna === paraColuna) return;

      movimentosPendentes.current += 1;
      const chave = queryKeys.kanban(vagaSelecionada);
      await queryClient.cancelQueries({ queryKey: chave });

      const movido = { ...item, fase_atual_id: paraColuna, atualizado_em: new Date().toISOString() };
      queryClient.setQueryData(chave, (atual) => moverCandidatoNoFunil(atual, movido, deColuna, paraColuna));

      try {
        await recrutamentoService.moverFaseDaVaga(item.modulo_id || vagaSelecionada, item.id, paraColuna);
      } catch (err) {
        queryClient.setQueryData(chave, (atual) => moverCandidatoNoFunil(atual, item, paraColuna, deColuna));
        toast.error(mensagemDeErro(err, 'Erro ao mover candidato.'));
        queryClient.invalidateQueries({ queryKey: chave });
      } finally {
        movimentosPendentes.current -= 1;
      }
    },
    [queryClient, toast, vagaSelecionada]
  );

  const handleCardDragStart = useCallback((e, item, sourceColumn) => {
    dragRef.current = { item, sourceColumn };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.currentTarget.classList.add('opacity-50');
  }, []);

  const finalizarArraste = useCallback(() => {
    dragRef.current = null;
    pararAutoScroll();
    setDragOverColumn(null);
  }, [pararAutoScroll]);

  const handleCardDragEnd = useCallback(
    (e) => {
      e.currentTarget.classList.remove('opacity-50');
      finalizarArraste();
    },
    [finalizarArraste]
  );

  const handleColumnDragOver = useCallback(
    (e, colId) => {
      // Sem preventDefault o navegador mostra o cursor de "proibido".
      if (!dragRef.current) return;
      e.preventDefault();
      setDragOverColumn((atual) => (atual === colId ? atual : colId));
    },
    []
  );

  const handleColumnDragLeave = useCallback((colId) => {
    setDragOverColumn((atual) => (atual === colId ? null : atual));
  }, []);

  const handleColumnDrop = useCallback(
    (e, colunaDestino) => {
      e.preventDefault();
      const arraste = dragRef.current;
      finalizarArraste();
      if (!arraste) return;
      moverCandidato(arraste.item, arraste.sourceColumn, colunaDestino);
    },
    [finalizarArraste, moverCandidato]
  );

  // --- Perfil do candidato ---------------------------------------------------
  // Guardamos só o id: o perfil lê o funil atual, então reflete a etapa nova
  // assim que o candidato é movido (inclusive pelo seletor de etapa do modal).
  const [perfilId, setPerfilId] = useState(null);
  const [perfilAberto, setPerfilAberto] = useState(false);

  const abrirPerfil = useCallback((candidatoId) => {
    setPerfilId(candidatoId);
    setPerfilAberto(true);
  }, []);

  const perfil = useMemo(() => localizarCandidato(kanbanData, perfilId), [kanbanData, perfilId]);
  const perfilCor = useMemo(() => {
    if (!perfil) return null;
    const indice = colunas.findIndex(([colId]) => colId === perfil.colId);
    return coresDaFase(Math.max(indice, 0), colunas.length);
  }, [perfil, colunas]);

  // --- Nova etapa ------------------------------------------------------------
  const [showNovaEtapa, setShowNovaEtapa] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaVagaId, setNovaEtapaVagaId] = useState('');
  const [etapaErro, setEtapaErro] = useState('');
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);

  const abrirNovaEtapa = () => {
    setEtapaErro('');
    setNovaEtapaNome('');
    setNovaEtapaVagaId(modoSomenteLeitura ? '' : vagaSelecionada);
    setShowNovaEtapa(true);
  };

  const handleNovaEtapa = async (e) => {
    e?.preventDefault();
    if (!novaEtapaNome.trim() || !novaEtapaVagaId) return;
    try {
      setSalvandoEtapa(true);
      setEtapaErro('');
      await recrutamentoService.criarEtapa(novaEtapaVagaId, novaEtapaNome.trim());
      setShowNovaEtapa(false);
      toast.success('Etapa criada com sucesso.');
    } catch (err) {
      setEtapaErro(mensagemDeErro(err, 'Erro ao criar etapa.'));
    } finally {
      setSalvandoEtapa(false);
    }
  };

  // --- Novo candidato --------------------------------------------------------
  const [showNovoCandidato, setShowNovoCandidato] = useState(false);
  const [salvandoCandidato, setSalvandoCandidato] = useState(false);
  const [novoCandidatoDados, setNovoCandidatoDados] = useState(CANDIDATO_VAZIO);
  const [candidatoErros, setCandidatoErros] = useState({});
  const [candidatoErro, setCandidatoErro] = useState('');

  const candidatoSujo = ['nome', 'email', 'telefone', 'cargo_desejado', 'mensagem'].some(
    (campo) => novoCandidatoDados[campo].trim() !== ''
  );

  const abrirNovoCandidato = () => {
    setCandidatoErros({});
    setCandidatoErro('');
    setNovoCandidatoDados({ ...CANDIDATO_VAZIO, modulo_id: modoSomenteLeitura ? '' : vagaSelecionada });
    setShowNovoCandidato(true);
  };

  const alterarCandidato = (campo, valor) => {
    setNovoCandidatoDados((atual) => ({ ...atual, [campo]: valor }));
    setCandidatoErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const handleNovoCandidatoSubmit = async (e) => {
    e?.preventDefault();
    const dados = novoCandidatoDados;

    const erros = {};
    if (!dados.modulo_id) erros.modulo_id = 'Selecione a vaga.';
    if (!dados.nome.trim()) erros.nome = 'Informe o nome.';
    if (!dados.email.trim()) erros.email = 'Informe o e-mail.';
    else if (!/^\S+@\S+\.\S+$/.test(dados.email.trim())) erros.email = 'Esse e-mail não parece válido.';
    if (dados.telefone && dados.telefone.replace(/\D/g, '').length < 10) erros.telefone = 'Telefone incompleto.';

    setCandidatoErros(erros);
    if (Object.keys(erros).length > 0) return;

    try {
      setSalvandoCandidato(true);
      setCandidatoErro('');
      await recrutamentoService.adicionarCandidato(dados.modulo_id, {
        ...dados,
        nome: dados.nome.trim(),
        email: dados.email.trim(),
      });
      setShowNovoCandidato(false);
      toast.success('Candidato adicionado com sucesso.');
    } catch (err) {
      setCandidatoErro(mensagemDeErro(err, 'Erro ao salvar candidato.'));
    } finally {
      setSalvandoCandidato(false);
    }
  };

  const opcoesVaga = vagas.map((m) => ({ value: m.id, label: m.nome }));
  const erroDeAcesso = kanbanQuery.error?.response?.status === 403;

  return (
    <Layout noPadding>
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-8 pb-0 h-full overflow-hidden">
        <PageHeader
          title="Recrutamento"
          subtitle={
            loading
              ? 'Carregando quadro...'
              : `${totalCandidatos} ${totalCandidatos === 1 ? 'candidato' : 'candidatos'} no quadro · ${contratados} na etapa final`
          }
          actions={
            <>
              <div className="w-full sm:w-52">
                <Select
                  value={vagaSelecionada}
                  onChange={(e) => setVagaEscolhida(e.target.value)}
                  disabled={vagas.length === 0}
                  icon="work_outline"
                  aria-label="Vaga"
                  options={vagas.length === 0 ? [{ value: 'all', label: 'Nenhuma vaga criada' }] : opcoesVaga}
                />
              </div>
              <Button variant="secondary" icon="add" onClick={abrirNovaEtapa} disabled={vagas.length === 0}>
                Nova etapa
              </Button>
              <Button icon="person_add" onClick={abrirNovoCandidato} disabled={vagas.length === 0}>
                Novo candidato
              </Button>
            </>
          }
        />

        {/* Funil */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full overflow-x-auto pb-6" aria-busy="true">
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
          ) : kanbanQuery.isError && !kanbanData ? (
            <div className="h-full flex items-center justify-center pb-16">
              <ErrorState
                title={erroDeAcesso ? 'Sem acesso a este quadro' : 'Não foi possível carregar o quadro'}
                description={
                  erroDeAcesso
                    ? 'Seu cargo não tem permissão para ver esta vaga.'
                    : mensagemDeErro(kanbanQuery.error, 'Erro ao carregar o quadro de recrutamento.')
                }
                onRetry={erroDeAcesso ? undefined : () => kanbanQuery.refetch()}
              />
            </div>
          ) : vagas.length === 0 && colunas.length === 0 ? (
            <div className="h-full flex items-center justify-center pb-16">
              <EmptyState
                icon="work_outline"
                title="Nenhuma vaga criada"
                description="Cada vaga tem o próprio quadro de etapas — triagem, entrevista, proposta. Crie a primeira vaga para começar a receber candidatos."
                actionLabel="Criar vaga"
                actionIcon="add"
                actionTo="/modulos/novo"
              />
            </div>
          ) : colunas.length === 0 ? (
            <div className="h-full flex items-center justify-center pb-16">
              <EmptyState
                icon="person_search"
                title="Nenhuma etapa configurada"
                description="Um quadro de recrutamento é uma sequência de etapas — triagem, entrevista, proposta. Crie a primeira para começar a receber candidatos."
                actionLabel="Criar primeira etapa"
                actionIcon="add"
                onAction={abrirNovaEtapa}
              />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="h-full overflow-x-auto overflow-y-hidden pb-6"
              onDragOver={handleContainerDragOver}
            >
              <div className="flex h-full min-w-max gap-5 items-start">
                {colunas.map(([colId, coluna], indice) => (
                  <KanbanColumn
                    key={colId}
                    colId={colId}
                    coluna={coluna}
                    indice={indice}
                    totalColunas={colunas.length}
                    ativa={dragOverColumn === colId}
                    arrastavel={!modoSomenteLeitura}
                    onOpenCard={abrirPerfil}
                    onCardDragStart={handleCardDragStart}
                    onCardDragEnd={handleCardDragEnd}
                    onColumnDragOver={handleColumnDragOver}
                    onColumnDragLeave={handleColumnDragLeave}
                    onColumnDrop={handleColumnDrop}
                    etapas={etapasParaMover}
                    onMover={moverCandidato}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Modal
          open={showNovaEtapa}
          onClose={() => setShowNovaEtapa(false)}
          title="Nova etapa"
          subtitle="Ela entra no fim do quadro desta vaga"
          dirty={novaEtapaNome.trim() !== ''}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowNovaEtapa(false)}>Cancelar</Button>
              <Button
                type="submit"
                form="nova-etapa-form"
                loading={salvandoEtapa}
                disabled={!novaEtapaNome.trim() || !novaEtapaVagaId}
              >
                Criar etapa
              </Button>
            </>
          }
        >
          {etapaErro && (
            <div className="mb-4">
              <Alert variant="error">{etapaErro}</Alert>
            </div>
          )}

          <form id="nova-etapa-form" onSubmit={handleNovaEtapa} className="flex flex-col gap-4">
            <Select
              label="Vaga"
              name="vaga"
              value={novaEtapaVagaId}
              onChange={(e) => setNovaEtapaVagaId(e.target.value)}
              placeholder="Selecione uma vaga..."
              options={opcoesVaga}
              required
            />

            <Input
              label="Nome da etapa"
              name="nome_etapa"
              value={novaEtapaNome}
              onChange={(e) => setNovaEtapaNome(e.target.value)}
              placeholder="Ex: Entrevista técnica"
              autoComplete="off"
              autoFocus
              required
            />
          </form>
        </Modal>

        {/* Perfil do candidato */}
        <Modal
          open={perfilAberto && !!perfil}
          onClose={() => setPerfilAberto(false)}
          title={perfil?.candidato.nome || 'Candidato'}
          subtitle={perfil?.candidato.cargo_desejado || perfil?.candidato.vaga || undefined}
          maxWidth="lg"
          footer={
            perfil?.candidato.email ? (
              <>
                <Button variant="secondary" onClick={() => setPerfilAberto(false)}>Fechar</Button>
                <Button
                  icon="mail"
                  onClick={() => { window.location.href = `mailto:${perfil.candidato.email}`; }}
                >
                  Enviar e-mail
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setPerfilAberto(false)}>Fechar</Button>
            )
          }
        >
          {perfil && (
            <PerfilCandidato
              perfil={perfil}
              cor={perfilCor}
              colunas={colunas}
              podeMover={!modoSomenteLeitura}
              onMover={(paraColuna) => moverCandidato(perfil.candidato, perfil.colId, paraColuna)}
            />
          )}
        </Modal>

        {/* Novo candidato */}
        <Drawer
          open={showNovoCandidato}
          onClose={() => setShowNovoCandidato(false)}
          title="Novo candidato"
          subtitle="Entra na primeira etapa do quadro da vaga"
          dirty={candidatoSujo}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowNovoCandidato(false)}>Cancelar</Button>
              <Button type="submit" form="novo-candidato-form" loading={salvandoCandidato}>
                {salvandoCandidato ? 'Salvando...' : 'Adicionar candidato'}
              </Button>
            </>
          }
        >
          {candidatoErro && (
            <div className="mb-4">
              <Alert variant="error">{candidatoErro}</Alert>
            </div>
          )}

          <form id="novo-candidato-form" onSubmit={handleNovoCandidatoSubmit} noValidate className="flex flex-col gap-4">
            <Select
              label="Vaga"
              name="vaga"
              value={novoCandidatoDados.modulo_id}
              onChange={(e) => alterarCandidato('modulo_id', e.target.value)}
              placeholder="Selecione uma vaga..."
              options={opcoesVaga}
              error={candidatoErros.modulo_id}
              required
            />
            <Input
              label="Nome"
              name="nome"
              autoComplete="off"
              value={novoCandidatoDados.nome}
              onChange={(e) => alterarCandidato('nome', e.target.value)}
              placeholder="Nome completo"
              error={candidatoErros.nome}
              required
            />
            <Input
              label="E-mail"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={novoCandidatoDados.email}
              onChange={(e) => alterarCandidato('email', e.target.value)}
              placeholder="candidato@email.com"
              error={candidatoErros.email}
              required
            />
            <Input
              label="Telefone"
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={novoCandidatoDados.telefone}
              onChange={(e) => alterarCandidato('telefone', mascararTelefone(e.target.value))}
              placeholder="(11) 90000-0000"
              error={candidatoErros.telefone}
            />
            <Input
              label="Cargo desejado"
              name="cargo_desejado"
              autoComplete="off"
              value={novoCandidatoDados.cargo_desejado}
              onChange={(e) => alterarCandidato('cargo_desejado', e.target.value)}
              placeholder="Ex: Pessoa Desenvolvedora Back-end"
            />
            <Textarea
              label="Mensagem"
              name="mensagem"
              hint="Opcional"
              value={novoCandidatoDados.mensagem}
              onChange={(e) => alterarCandidato('mensagem', e.target.value)}
            />
          </form>
        </Drawer>
      </div>
    </Layout>
  );
}

function PerfilCandidato({ perfil, cor, colunas, podeMover, onMover }) {
  const { candidato, colId, fase } = perfil;
  const referencia = candidato.atualizado_em || candidato.criado_em;

  const campos = [
    { label: 'E-mail', value: candidato.email, icon: 'mail_outline', href: candidato.email ? `mailto:${candidato.email}` : null },
    {
      label: 'Telefone',
      value: candidato.telefone,
      icon: 'call',
      href: candidato.telefone ? `tel:${candidato.telefone.replace(/[^\d+]/g, '')}` : null,
    },
    { label: 'Cargo desejado', value: candidato.cargo_desejado, icon: 'work_outline' },
  ];

  return (
    <>
      <div className="flex items-center gap-4 pb-5 border-b border-divider">
        <Avatar name={candidato.nome} size="xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${cor?.bg || 'bg-primary-100'} ${cor?.text || 'text-primary'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cor?.dot || 'bg-primary'}`} />
              {fase}
            </span>
            {estaParado(referencia) && (
              <Badge variant="warning" size="sm" dot>Parado há mais de 14 dias</Badge>
            )}
          </div>
          <p className="text-xs text-light-text mt-1.5">
            Candidatou-se {tempoRelativo(candidato.criado_em) || '—'}
            {candidato.vaga ? ` · ${candidato.vaga}` : ''}
          </p>
        </div>
      </div>

      {/* Mover pela tela: alternativa ao arrastar, funciona no teclado e no toque. */}
      {podeMover && colunas.length > 1 && (
        <div className="py-4 border-b border-divider">
          <Select
            label="Etapa do quadro"
            name="etapa"
            icon="swap_horiz"
            value={colId}
            onChange={(e) => onMover(e.target.value)}
            options={colunas.map(([id, coluna]) => ({ value: id, label: coluna.fase || id }))}
          />
        </div>
      )}

      <dl className="divide-y divide-divider">
        {campos.map((campo) => (
          <div key={campo.label} className="flex items-center gap-3 py-3">
            <span className="material-icons text-[18px] text-light-text shrink-0" aria-hidden="true">{campo.icon}</span>
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

      {candidato.mensagem && (
        <div className="mt-2 pt-4 border-t border-divider">
          <p className="text-xs font-semibold text-ink mb-2">Mensagem do candidato</p>
          <p className="text-sm text-ink-soft whitespace-pre-wrap break-words leading-relaxed">
            {candidato.mensagem}
          </p>
        </div>
      )}
    </>
  );
}
