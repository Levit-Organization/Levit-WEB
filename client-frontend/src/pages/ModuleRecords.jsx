import { useMemo, useState } from 'react';
import QuadroItens from '../components/quadro/QuadroItens';
import { useParams, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import TabelaDeArquivos from '../components/arquivos/TabelaDeArquivos';
import { useModulo, useRegistros, usePessoas, useTitulosDasTabelas, queryKeys } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import ImportarPlanilha from '../components/importacao/ImportarPlanilha';
import PainelFiltros from '../components/filtros/PainelFiltros';
import BarraDaTabela from '../components/registros/BarraDaTabela';
import EsqueletoDeLinhas from '../components/registros/EsqueletoDeLinhas';
import FormularioDoRegistro from '../components/registros/FormularioDoRegistro';
import TabelaDeRegistros from '../components/registros/TabelaDeRegistros';
import { filtrosVazios } from '../utils/filtros';
import { tabelasLigadas } from '../utils/vinculos';
import { colunasDaTabela, compararRegistros, proximaOrdem } from '../utils/registros';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagination } from '../hooks/usePagination';
import { useFiltrosDaTabela } from '../hooks/useFiltrosDaTabela';
import { useVisaoDaTabela } from '../hooks/useVisaoDaTabela';
import { useFormularioRegistro } from '../hooks/useFormularioRegistro';
import { useAlteracoesDeRegistros } from '../hooks/useAlteracoesDeRegistros';
import { mensagemDeErro } from '../lib/queryClient';

const SEM_DADOS = [];
const POR_PAGINA = 25;

export default function ModuleRecords() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();

  const [busca, setBusca] = useState('');
  const buscaAtiva = useDebouncedValue(busca.trim());

  const moduloQuery = useModulo(id);
  const modulo = moduloQuery.data ?? null;

  // --- Pesquisa avançada --------------------------------------------------------
  const pesquisa = useFiltrosDaTabela(id, modulo);
  const { filtrosAtivos } = pesquisa;

  // Tabela de arquivos tem tela própria (TabelaDeArquivos), com a própria lista.
  const ehArquivo = modulo?.tipo === 'arquivo';
  const registrosQuery = useRegistros(ehArquivo ? null : id, buscaAtiva, filtrosAtivos);
  const registros = registrosQuery.data ?? SEM_DADOS;
  const chaveRegistros = queryKeys.registros(id, buscaAtiva, filtrosAtivos);

  // --- Colunas, ordenação e paginação ---------------------------------------
  const campos = useMemo(() => modulo?.campos ?? SEM_DADOS, [modulo]);

  // Responsável: guarda o id da pessoa; a tela mostra o nome.
  const camposResponsavel = useMemo(() => campos.filter((c) => c.tipo === 'responsavel'), [campos]);
  const temResponsavel = camposResponsavel.length > 0;
  const pessoasQuery = usePessoas({ enabled: temResponsavel });
  const nomes = useMemo(
    () => Object.fromEntries((pessoasQuery.data ?? []).map((p) => [p.id, p.nome])),
    [pessoasQuery.data]
  );
  const [soMeus, setSoMeus] = useState(false);
  const [importando, setImportando] = useState(false);

  // Ligação: guarda o id do item da outra tabela; a tela mostra o nome dele.
  const ligadas = useMemo(() => tabelasLigadas(campos), [campos]);
  const titulosLigados = useTitulosDasTabelas(ligadas);

  const colunas = useMemo(() => colunasDaTabela(campos, nomes, titulosLigados), [campos, nomes, titulosLigados]);

  const [ordem, setOrdem] = useState(null); // { key, direcao }

  // --- Visão em quadro --------------------------------------------------------
  const visaoDaTabela = useVisaoDaTabela(id, campos);
  const { visao, campoGrupo } = visaoDaTabela;

  const filtrados = useMemo(() => {
    if (!soMeus || !temResponsavel) return registros;
    return registros.filter((r) => camposResponsavel.some((c) => r.dados?.[c.id] === usuario?.id));
  }, [registros, soMeus, temResponsavel, camposResponsavel, usuario]);

  const ordenados = useMemo(() => {
    const coluna = ordem && colunas.find((c) => c.key === ordem.key);
    if (!coluna) return filtrados;
    return [...filtrados].sort((a, b) => compararRegistros(a, b, coluna, ordem.direcao));
  }, [filtrados, colunas, ordem]);

  const paginacao = usePagination(ordenados, POR_PAGINA);

  const alternarOrdem = (key) => {
    setOrdem((atual) => proximaOrdem(atual, key));
    paginacao.setPage(1);
  };

  const { moverItem, handleDelete } = useAlteracoesDeRegistros(id, chaveRegistros, campoGrupo);

  // --- Formulário (drawer) ----------------------------------------------------
  const formulario = useFormularioRegistro(id, registrosQuery);
  const { abrirFormulario } = formulario;

  // --- Renderização -----------------------------------------------------------
  if (moduloQuery.isLoading) {
    return (
      <Layout>
        <Skeleton className="h-11 w-64 mb-7" />
        <EsqueletoDeLinhas larguraMaxima="max-w-md" />
      </Layout>
    );
  }

  if (moduloQuery.isError) {
    return (
      <Layout>
        <ErrorState
          title="Não foi possível abrir esta tabela"
          description={mensagemDeErro(moduloQuery.error, 'Erro ao carregar dados da tabela.')}
          onRetry={() => moduloQuery.refetch()}
        />
      </Layout>
    );
  }

  // Módulos especiais têm telas próprias.
  if (modulo?.tipo === 'recrutamento') return <Navigate to="/recrutamento" replace />;
  if (modulo?.tipo === 'financeiro') return <Navigate to={`/modulos/${id}/financeiro`} replace />;
  if (ehArquivo) return <TabelaDeArquivos key={id} modulo={modulo} />;

  const buscando = registrosQuery.isFetching && registrosQuery.isPlaceholderData;
  const termoBusca = buscaAtiva;
  const filtrando = !!filtrosAtivos;
  const mudarFiltros = (novos) => {
    pesquisa.definirFiltros(novos);
    paginacao.setPage(1);
  };

  return (
    <Layout>
      {/* HEADER */}
      <PageHeader
        backTo="/modulos"
        icon={modulo?.icone || 'extension'}
        title={modulo?.nome || 'Tabela'}
        subtitle={
          soMeus
            ? `${filtrados.length} de ${registros.length} ${registros.length === 1 ? 'item' : 'itens'} com você`
            : `${registros.length} ${registros.length === 1 ? 'item' : 'itens'}`
        }
        actions={
          <>
            <Button to={`/modulos/${id}/editar`} variant="secondary" icon="settings">
              Configurar
            </Button>
            {campos.length > 0 && (
              <Button variant="secondary" icon="upload_file" onClick={() => setImportando(true)}>
                Importar
              </Button>
            )}
            <Button onClick={() => abrirFormulario(null)} icon="add">
              Novo item
            </Button>
          </>
        }
      />

      {/* BUSCA E VISÃO */}
      <BarraDaTabela
        busca={busca}
        onBuscar={(valor) => {
          setBusca(valor);
          paginacao.setPage(1);
        }}
        podeFiltrar={campos.length > 0}
        mostrarFiltros={pesquisa.mostrarFiltros}
        totalFiltros={pesquisa.totalFiltros}
        onAlternarFiltros={() => pesquisa.setMostrarFiltros((v) => !v)}
        temResponsavel={temResponsavel}
        soMeus={soMeus}
        onSoMeus={(marcado) => {
          setSoMeus(marcado);
          paginacao.setPage(1);
        }}
        visaoDaTabela={visaoDaTabela}
      />

      {pesquisa.mostrarFiltros && (
        <Card id="painel-filtros" className="mb-6">
          <PainelFiltros alvos={pesquisa.alvosFiltro} filtros={pesquisa.filtros} onChange={mudarFiltros} />
        </Card>
      )}

      {/* RECORDS TABLE */}
      {registrosQuery.isLoading ? (
        <EsqueletoDeLinhas larguraMaxima="max-w-lg" aria-busy="true" />
      ) : registrosQuery.isError && !registrosQuery.data ? (
        <Card padding="lg" className="py-12">
          <ErrorState
            size="lg"
            description={mensagemDeErro(registrosQuery.error, 'Erro ao carregar os itens.')}
            onRetry={() => registrosQuery.refetch()}
          />
        </Card>
      ) : filtrados.length === 0 && registros.length > 0 ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon="person_search"
            size="lg"
            title="Nenhum item com você"
            description="Nenhum item desta tabela tem você como responsável."
            actionLabel="Ver todos"
            actionIcon="visibility"
            onAction={() => setSoMeus(false)}
          />
        </Card>
      ) : registros.length === 0 ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon="inbox"
            size="lg"
            title={termoBusca || filtrando ? 'Nenhum resultado' : 'Nenhum item ainda'}
            description={
              filtrando
                ? 'Nenhum item atende a todos os filtros. Ajuste ou limpe os filtros.'
                : termoBusca
                  ? `Nada bate com "${termoBusca}" nesta tabela. Tente outro termo.`
                  : 'Cada item é uma linha com as colunas que você configurou nesta tabela.'
            }
            actionLabel={filtrando ? 'Limpar filtros' : termoBusca ? undefined : 'Criar primeiro item'}
            actionIcon={filtrando ? 'filter_list_off' : termoBusca ? undefined : 'add'}
            onAction={filtrando ? () => mudarFiltros(filtrosVazios()) : termoBusca ? undefined : () => abrirFormulario(null)}
          />
        </Card>
      ) : visao === 'quadro' ? (
        <div className={`transition-opacity duration-150 ${buscando ? 'opacity-60' : ''}`} aria-busy={buscando}>
          <QuadroItens itens={ordenados} campos={campos} campoGrupo={campoGrupo} nomes={nomes} titulosLigados={titulosLigados} onAbrir={abrirFormulario} onMover={moverItem} />
        </div>
      ) : (
        <TabelaDeRegistros
          colunas={colunas}
          campos={campos}
          titulosLigados={titulosLigados}
          ordem={ordem}
          onOrdenar={alternarOrdem}
          paginacao={paginacao}
          buscando={buscando}
          onEditar={abrirFormulario}
          onExcluir={handleDelete}
        />
      )}

      {/* SIDE PANEL FOR FORM */}
      <FormularioDoRegistro
        moduloId={id}
        campos={campos}
        formulario={formulario}
        pessoas={pessoasQuery.data ?? []}
        carregandoPessoas={pessoasQuery.isLoading}
        usuarioId={usuario?.id}
      />
      {importando && (
        <ImportarPlanilha
          aberto
          onFechar={() => setImportando(false)}
          modulo={modulo}
          campos={campos}
          pessoas={pessoasQuery.data ?? []}
          ligados={titulosLigados}
          onImportado={() => queryClient.invalidateQueries({ queryKey: ['registros', id] })}
        />
      )}
    </Layout>
  );
}
