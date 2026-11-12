import Layout from '../components/Layout';
import KanbanColumn from '../components/kanban/KanbanColumn';
import KanbanCarregando from '../components/kanban/KanbanCarregando';
import ModalNovaEtapa from '../components/kanban/ModalNovaEtapa';
import ModalPerfilCandidato from '../components/kanban/ModalPerfilCandidato';
import DrawerNovoCandidato from '../components/kanban/DrawerNovoCandidato';
import { useFunilDaVaga } from '../components/kanban/useFunilDaVaga';
import { useArrasteKanban } from '../components/kanban/useArrasteKanban';
import { useBuscaNoFunil } from '../components/kanban/useBuscaNoFunil';
import { usePerfilCandidato } from '../components/kanban/usePerfilCandidato';
import { useNovaEtapa } from '../components/kanban/useNovaEtapa';
import { useNovoCandidato } from '../components/kanban/useNovoCandidato';
import { Button, Select, Input, PageHeader, EmptyState, ErrorState } from '../components/ui';
import { useToast } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { linkDaVaga } from '../utils/candidato';

export default function RecrutamentoKanban() {
  const toast = useToast();

  const {
    vagas,
    vagaSelecionada,
    setVagaEscolhida,
    modoSomenteLeitura,
    dragRef,
    kanbanQuery,
    kanbanData,
    loading,
    colunas,
    etapasParaMover,
    totalCandidatos,
    moverCandidato,
  } = useFunilDaVaga();
  const { busca, setBusca, termo, colunasVisiveis, totalEncontrados } = useBuscaNoFunil(colunas, totalCandidatos);
  const {
    dragOverColumn,
    scrollContainerRef,
    handleContainerDragOver,
    handleCardDragStart,
    handleCardDragEnd,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
  } = useArrasteKanban({ dragRef, moverCandidato });
  const { perfil, perfilCor, perfilAberto, abrirPerfil, fecharPerfil } = usePerfilCandidato(kanbanData, colunas);
  const etapa = useNovaEtapa({ vagaSelecionada, modoSomenteLeitura });
  const candidato = useNovoCandidato({ vagaSelecionada, modoSomenteLeitura });

  const trocarVaga = (id) => {
    setVagaEscolhida(id);
    setBusca('');
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkDaVaga(vagaSelecionada));
      toast.success('Link copiado. Quem abrir pode se candidatar a esta vaga.');
    } catch {
      toast.error('Não foi possível copiar. Copie da barra: ' + linkDaVaga(vagaSelecionada));
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
            loading ? (
              'Carregando quadro...'
            ) : (
              <>
                {`${totalCandidatos} ${totalCandidatos === 1 ? 'candidato' : 'candidatos'} no quadro`}
                {!modoSomenteLeitura && (
                  <>
                    {' · '}
                    <button type="button" onClick={copiarLink} className="font-semibold text-primary hover:underline">
                      Copiar link de candidatura
                    </button>
                  </>
                )}
              </>
            )
          }
          actions={
            <>
              <div className="w-full sm:w-52">
                <Select
                  value={vagaSelecionada}
                  onChange={(e) => trocarVaga(e.target.value)}
                  disabled={vagas.length === 0}
                  icon="work_outline"
                  aria-label="Vaga"
                  options={vagas.length === 0 ? [{ value: 'all', label: 'Nenhuma vaga criada' }] : opcoesVaga}
                />
              </div>
              <div className="w-full sm:w-56">
                <Input
                  type="search"
                  icon="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  name="busca"
                  autoComplete="off"
                  placeholder="Buscar candidato..."
                  aria-label="Buscar candidato pelo nome nesta vaga"
                  disabled={totalCandidatos === 0}
                />
              </div>
              <Button variant="secondary" icon="add" onClick={etapa.abrirNovaEtapa} disabled={vagas.length === 0}>
                Nova etapa
              </Button>
              <Button icon="person_add" onClick={candidato.abrirNovoCandidato} disabled={vagas.length === 0}>
                Novo candidato
              </Button>
            </>
          }
        />

        {/* Funil */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <KanbanCarregando />
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
                onAction={etapa.abrirNovaEtapa}
              />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="h-full overflow-x-auto overflow-y-hidden pb-6"
              onDragOver={handleContainerDragOver}
            >
              {termo && (
                <p className="mb-3 text-sm text-light-text" role="status">
                  {totalEncontrados === 0
                    ? `Ninguém com “${busca.trim()}” nesta vaga.`
                    : `${totalEncontrados} ${totalEncontrados === 1 ? 'candidato encontrado' : 'candidatos encontrados'}`}
                </p>
              )}
              <div className="flex h-full min-w-max gap-5 items-start">
                {colunasVisiveis.map(([colId, coluna], indice) => (
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

        <ModalNovaEtapa etapa={etapa} opcoesVaga={opcoesVaga} />

        {/* Perfil do candidato */}
        <ModalPerfilCandidato
          perfil={perfil}
          perfilCor={perfilCor}
          perfilAberto={perfilAberto}
          onClose={fecharPerfil}
          vagas={vagas}
          colunas={colunas}
          podeMover={!modoSomenteLeitura}
          onMover={moverCandidato}
        />

        {/* Novo candidato */}
        <DrawerNovoCandidato candidato={candidato} opcoesVaga={opcoesVaga} />
      </div>
    </Layout>
  );
}
