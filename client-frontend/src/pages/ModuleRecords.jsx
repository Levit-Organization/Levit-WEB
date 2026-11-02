import { Fragment, useMemo, useState } from 'react';
import QuadroItens from '../components/quadro/QuadroItens';
import { useParams, useSearchParams, Navigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import {
  Button,
  Input,
  Select,
  Drawer,
  Alert,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
} from '../components/ui';
import { fieldClasses } from '../components/ui/fieldUtils';
import { registroService } from '../services/registroService';
import TabelaDeArquivos from '../components/arquivos/TabelaDeArquivos';
import { useModulo, useRegistros, usePessoas, useTitulosDasTabelas, queryKeys } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import SeloPrazo from '../components/prazos/SeloPrazo';
import PessoaResponsavel from '../components/prazos/PessoaResponsavel';
import { itemConcluido, opcaoDeConclusao } from '../utils/prazos';
import { REPETICOES, rotuloDaRepeticao } from '../utils/recorrencia';
import ImportarPlanilha from '../components/importacao/ImportarPlanilha';
import PainelFiltros from '../components/filtros/PainelFiltros';
import CampoVinculo from '../components/vinculos/CampoVinculo';
import ItensQueApontam from '../components/vinculos/ItensQueApontam';
import { alvosDoFiltro, filtrosParaApi, filtrosVazios } from '../utils/filtros';
import { idsLigados, linkDoItem, rotuloDosLigados, tabelasLigadas, tituloDoItem } from '../utils/vinculos';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagination } from '../hooks/usePagination';
import { useToast, useConfirm } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

const SEM_DADOS = [];
const SEM_FILTROS = filtrosVazios();
const POR_PAGINA = 25;
const COLATOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function valorOrdenavel(registro, coluna) {
  const bruto = coluna.ler(registro);
  if (bruto === null || bruto === undefined || bruto === '') return null;
  if (coluna.tipo === 'numero') {
    const n = Number(bruto);
    return Number.isNaN(n) ? null : n;
  }
  return String(bruto);
}

function compararRegistros(a, b, coluna, direcao) {
  const va = valorOrdenavel(a, coluna);
  const vb = valorOrdenavel(b, coluna);
  // Vazios sempre no fim, qualquer que seja a direção.
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const resultado = typeof va === 'number' && typeof vb === 'number' ? va - vb : COLATOR.compare(va, vb);
  return direcao === 'asc' ? resultado : -resultado;
}

const CHAVE_PREFERENCIA = (id) => `levit_visao_${id}`;

/** Lista ou quadro, por tabela. Conveniência local: falhar ao ler/gravar não quebra nada. */
function lerPreferencia(id) {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIA(id))) || {};
  } catch {
    return {};
  }
}

function salvarPreferencia(id, valor) {
  try {
    localStorage.setItem(CHAVE_PREFERENCIA(id), JSON.stringify(valor));
  } catch {
    // armazenamento indisponível: só não lembra a escolha
  }
}

export default function ModuleRecords() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();

  const [busca, setBusca] = useState('');
  const buscaAtiva = useDebouncedValue(busca.trim());

  const moduloQuery = useModulo(id);
  const modulo = moduloQuery.data ?? null;

  // --- Pesquisa avançada --------------------------------------------------------
  // Por tabela: trocar de tabela mantém esta tela montada (mesma rota, outro id).
  const [filtrosPorTabela, setFiltrosPorTabela] = useState({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const filtros = filtrosPorTabela[id] ?? SEM_FILTROS;
  const alvosFiltro = useMemo(() => alvosDoFiltro(modulo), [modulo]);
  const filtrosApi = useMemo(() => filtrosParaApi(filtros, alvosFiltro), [filtros, alvosFiltro]);
  // Espera a digitação parar; o id junto evita mandar os filtros de uma tabela para outra.
  const pedidoFiltros = useMemo(() => ({ tabela: id, filtros: filtrosApi }), [id, filtrosApi]);
  const filtrosAdiados = useDebouncedValue(pedidoFiltros);
  const filtrosAtivos = filtrosAdiados.tabela === id ? filtrosAdiados.filtros : null;
  const totalFiltros = filtrosApi?.regras.length ?? 0;

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

  const colunas = useMemo(() => {
    // Até 5 colunas na tabela (o formulário mostra todas), mas Responsável e
    // Prazo sempre aparecem: são o que diz de quem é e até quando.
    const visiveis = campos.filter(
      (campo, i) => i < 5 || campo.tipo === 'responsavel' || campo.tipo === 'prazo'
    );
    return [
      ...visiveis.map((campo) => ({
        key: campo.id,
        titulo: campo.nome,
        tipo: campo.tipo,
        campo,
        ler:
          campo.tipo === 'responsavel'
            ? (r) => nomes[r.dados?.[campo.id]]
            : campo.tipo === 'vinculo'
              ? (r) => rotuloDosLigados(r.dados?.[campo.id], titulosLigados[campo.modulo_vinculado_id])
              : (r) => r.dados?.[campo.id],
      })),
      { key: 'criado_em', titulo: 'Criado em', tipo: 'data', ler: (r) => r.criado_em },
    ];
  }, [campos, nomes, titulosLigados]);

  const [ordem, setOrdem] = useState(null); // { key, direcao }

  // --- Visão em quadro --------------------------------------------------------
  // Disponível quando a tabela tem uma coluna de lista: cada opção vira uma
  // coluna do quadro. A escolha (lista/quadro e coluna) fica lembrada por tabela.
  const camposLista = useMemo(() => campos.filter((c) => c.tipo === 'selecao' && c.opcoes?.length), [campos]);
  // Por tabela: trocar de tabela mantém esta tela montada (mesma rota, outro id).
  const [preferencias, setPreferencias] = useState({});
  const preferencia = preferencias[id] ?? lerPreferencia(id);
  const podeQuadro = camposLista.length > 0;
  const visao = podeQuadro && preferencia.visao === 'quadro' ? 'quadro' : 'lista';
  // Sem escolha salva, agrupa pela lista que é o andamento do trabalho (a que
  // tem uma opção de conclusão, como "Entregue"), não pela primeira que houver.
  const campoGrupo =
    camposLista.find((c) => c.id === preferencia.campo) ||
    camposLista.find((c) => c.opcoes.some(opcaoDeConclusao)) ||
    camposLista[0];
  const mudarPreferencia = (parcial) => {
    const nova = { ...preferencia, ...parcial };
    setPreferencias((atual) => ({ ...atual, [id]: nova }));
    salvarPreferencia(id, nova);
  };

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
    setOrdem((atual) => {
      if (atual?.key !== key) return { key, direcao: 'asc' };
      return atual.direcao === 'asc' ? { key, direcao: 'desc' } : null;
    });
    paginacao.setPage(1);
  };

  /**
   * Mover no quadro = trocar o valor da coluna de lista. Otimista: o cartão
   * muda na hora e volta se a API recusar.
   */
  const moverItem = async (item, valor) => {
    const chave = chaveRegistros;
    const aplicar = (dados) =>
      queryClient.setQueryData(chave, (atual) => atual?.map((r) => (r.id === item.id ? { ...r, dados } : r)));
    const novosDados = { ...item.dados, [campoGrupo.id]: valor || null };

    aplicar(novosDados);
    try {
      await registroService.update(id, item.id, { dados: novosDados }, { skipInvalidate: true });
    } catch (err) {
      aplicar(item.dados);
      toast.error(mensagemDeErro(err, 'Não foi possível mover o item.'));
    }
  };

  // --- Formulário (drawer) ----------------------------------------------------
  const [showForm, setShowForm] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState(null);
  const [formDados, setFormDados] = useState({});
  const [dadosIniciais, setDadosIniciais] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formSujo = JSON.stringify(formDados) !== JSON.stringify(dadosIniciais);

  const abrirFormulario = (registro) => {
    const dados = registro?.dados || {};
    setEditingRegistro(registro);
    setFormDados(dados);
    setDadosIniciais(dados);
    setError('');
    setShowForm(true);
  };

  // Link direto para um item (?item=id), vindo de outra tabela ligada: abre o item
  // quando a lista desta tabela chega. Ajuste durante a renderização, sem efeito.
  const [searchParams, setSearchParams] = useSearchParams();
  const itemDoLink = searchParams.get('item');
  const [linkTratado, setLinkTratado] = useState(null);
  if (itemDoLink && itemDoLink !== linkTratado && registrosQuery.data && !registrosQuery.isPlaceholderData) {
    setLinkTratado(itemDoLink);
    const alvo = registrosQuery.data.find((r) => r.id === itemDoLink);
    if (alvo) abrirFormulario(alvo);
  }

  const closeForm = () => {
    setShowForm(false);
    if (itemDoLink) {
      setSearchParams((atual) => {
        const novos = new URLSearchParams(atual);
        novos.delete('item');
        return novos;
      }, { replace: true });
      setLinkTratado(null);
    }
  };

  const handleFieldChange = (campoId, value) => {
    setFormDados((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setError('');
      if (editingRegistro) {
        await registroService.update(id, editingRegistro.id, { dados: formDados });
        toast.success('Item atualizado.');
      } else {
        await registroService.create(id, { dados: formDados });
        toast.success('Item criado.');
      }
      closeForm();
    } catch (err) {
      setError(mensagemDeErro(err, 'Erro ao salvar item.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (registro) => {
    const ok = await confirm({
      title: 'Excluir item?',
      message: 'Este item será removido definitivamente. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await registroService.delete(id, registro.id);
      queryClient.setQueryData(chaveRegistros, (atual) =>
        atual?.filter((r) => r.id !== registro.id)
      );
      toast.success('Item excluído.');
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Erro ao excluir.'));
    }
  };

  const renderFieldInput = (campo) => {
    const value = formDados[campo.id] ?? '';
    const comum = {
      id: `campo-${campo.id}`,
      value,
      onChange: (e) => handleFieldChange(campo.id, e.target.value),
    };

    switch (campo.tipo) {
      case 'texto':
        return <Input type="text" autoComplete="off" placeholder={`Digite ${campo.nome.toLowerCase()}...`} {...comum} />;
      case 'numero':
        return <Input type="number" inputMode="decimal" placeholder="0" {...comum} />;
      case 'data':
      case 'prazo':
        return <Input type="date" {...comum} />;
      case 'recorrencia':
        return (
          <Select
            placeholder="Não repete"
            options={REPETICOES.map((r) => ({ value: r.valor, label: r.rotulo }))}
            {...comum}
          />
        );
      case 'responsavel':
        return (
          <Select
            placeholder={pessoasQuery.isLoading ? 'Carregando a equipe...' : 'Sem responsável'}
            options={(pessoasQuery.data ?? []).map((p) => ({ value: p.id, label: p.id === usuario?.id ? `${p.nome} (você)` : p.nome }))}
            {...comum}
          />
        );
      case 'selecao':
        return (
          <Select
            placeholder="Selecione..."
            options={(campo.opcoes || []).map((opcao) => ({ value: opcao, label: opcao }))}
            {...comum}
          />
        );
      case 'vinculo':
        return (
          <CampoVinculo
            id={comum.id}
            campo={campo}
            value={formDados[campo.id]}
            onChange={(valor) => handleFieldChange(campo.id, valor)}
          />
        );
      default:
        return null;
    }
  };

  const TIPOS = { texto: 'Texto', numero: 'Número', data: 'Data', selecao: 'Seleção', responsavel: 'Pessoa da equipe', prazo: 'Data', recorrencia: 'Repetição', vinculo: 'Ligação' };

  // --- Renderização -----------------------------------------------------------
  if (moduloQuery.isLoading) {
    return (
      <Layout>
        <Skeleton className="h-11 w-64 mb-7" />
        <Card padding="none">
          {[1, 2, 3, 4, 5].map((linha) => (
            <div key={linha} className="px-4 py-4 border-b border-divider last:border-0">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </Card>
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
    setFiltrosPorTabela((atual) => ({ ...atual, [id]: novos }));
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
      <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-full sm:max-w-md">
        <Input
          type="search"
          name="busca"
          icon="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            paginacao.setPage(1);
          }}
          placeholder="Buscar itens..."
          aria-label="Buscar itens"
          autoComplete="off"
        />
        </div>

        {campos.length > 0 && (
          <Button
            variant={mostrarFiltros || totalFiltros > 0 ? 'subtle' : 'secondary'}
            size="sm"
            icon="filter_list"
            aria-expanded={mostrarFiltros}
            aria-controls="painel-filtros"
            onClick={() => setMostrarFiltros((v) => !v)}
          >
            {totalFiltros > 0 ? `Filtros (${totalFiltros})` : 'Filtrar'}
          </Button>
        )}

        {temResponsavel && (
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soMeus}
              onChange={(e) => {
                setSoMeus(e.target.checked);
                paginacao.setPage(1);
              }}
              className="w-4 h-4 accent-primary"
            />
            Só os meus
          </label>
        )}

        {podeQuadro && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {visao === 'quadro' && camposLista.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-light-text">
                Agrupar por
                {/* O Select do ui só tem a altura de formulário (h-11); aqui, na barra, o
                    nativo compacto com as mesmas classes de campo. */}
                <select
                  value={campoGrupo.id}
                  onChange={(e) => mudarPreferencia({ campo: e.target.value })}
                  className={`${fieldClasses.replace('w-full ', '')} h-9 px-2.5 cursor-pointer`}
                >
                  {camposLista.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
            )}
            <div role="group" aria-label="Como ver os itens" className="flex gap-1 rounded-lg bg-sidebar p-1">
              {[
                ['lista', 'view_list', 'Lista'],
                ['quadro', 'view_kanban', 'Quadro'],
              ].map(([valor, icone, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={visao === valor}
                  onClick={() => mudarPreferencia({ visao: valor })}
                  className={`flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-semibold transition-colors ${
                    visao === valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
                  }`}
                >
                  <span className="material-icons text-[16px]" aria-hidden="true">{icone}</span>
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {mostrarFiltros && (
        <Card id="painel-filtros" className="mb-6">
          <PainelFiltros alvos={alvosFiltro} filtros={filtros} onChange={mudarFiltros} />
        </Card>
      )}

      {/* RECORDS TABLE */}
      {registrosQuery.isLoading ? (
        <Card padding="none" aria-busy="true">
          {[1, 2, 3, 4, 5].map((linha) => (
            <div key={linha} className="px-4 py-4 border-b border-divider last:border-0">
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
          ))}
        </Card>
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
        <Card padding="none" className="overflow-hidden">
          <div className={`overflow-x-auto transition-opacity duration-150 ${buscando ? 'opacity-60' : ''}`} aria-busy={buscando}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider bg-background">
                  {colunas.map((coluna) => {
                    const ativa = ordem?.key === coluna.key;
                    return (
                      <th
                        key={coluna.key}
                        scope="col"
                        aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className="th-label text-left px-4 py-3"
                      >
                        <button
                          type="button"
                          onClick={() => alternarOrdem(coluna.key)}
                          className="inline-flex items-center gap-1 hover:text-ink transition-colors rounded"
                        >
                          {coluna.titulo}
                          <span
                            className={`material-icons text-[14px] ${ativa ? 'text-primary' : 'text-faint'}`}
                            aria-hidden="true"
                          >
                            {ativa ? (ordem.direcao === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="th-label text-right px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginacao.pageItems.map((registro) => (
                  <tr key={registro.id} className="border-b border-divider last:border-0 hover:bg-background transition-colors">
                    {colunas.map((coluna) => {
                      const valor = coluna.ler(registro);
                      const vazio = valor === null || valor === undefined || valor === '';
                      let exibicao = valor;
                      if (coluna.key === 'criado_em') exibicao = valor ? new Date(valor).toLocaleDateString('pt-BR') : null;
                      const textoVazio = exibicao === null || exibicao === undefined || exibicao === '';
                      if (!textoVazio && coluna.tipo === 'prazo') {
                        exibicao = <SeloPrazo data={valor} concluido={itemConcluido(registro.dados, campos)} />;
                      }
                      if (!textoVazio && coluna.tipo === 'recorrencia') {
                        exibicao = (
                          <span className="inline-flex items-center gap-1 text-ink-soft">
                            <span className="material-icons text-[16px] text-primary" aria-hidden="true">event_repeat</span>
                            {rotuloDaRepeticao(valor) ?? valor}
                          </span>
                        );
                      }
                      if (!textoVazio && coluna.tipo === 'responsavel') {
                        exibicao = <PessoaResponsavel nome={valor} />;
                      }
                      // Ligação: cada item ligado é um link para ele na tabela dele.
                      const mapaLigados = coluna.tipo === 'vinculo' ? titulosLigados[coluna.campo.modulo_vinculado_id] : null;
                      if (!textoVazio && mapaLigados) {
                        exibicao = idsLigados(registro.dados?.[coluna.key]).map((itemId, i) => (
                          <Fragment key={itemId}>
                            {i > 0 && ', '}
                            {itemId in mapaLigados ? (
                              <Link to={linkDoItem(coluna.campo.modulo_vinculado_id, itemId)} className="text-primary-700 hover:underline">
                                {tituloDoItem(mapaLigados[itemId])}
                              </Link>
                            ) : (
                              'Item excluído'
                            )}
                          </Fragment>
                        ));
                      }

                      return (
                        <td
                          key={coluna.key}
                          className={`px-4 py-3 truncate max-w-[200px] ${
                            coluna.key === 'criado_em' ? 'text-light-text text-xs' : ''
                          }`}
                          title={vazio ? undefined : String(valor)}
                        >
                          {textoVazio ? <span className="text-light-text">--</span> : exibicao}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          icon="edit"
                          onClick={() => abrirFormulario(registro)}
                          title="Editar"
                          aria-label="Editar item"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          icon="delete_outline"
                          onClick={() => handleDelete(registro)}
                          title="Excluir"
                          aria-label="Excluir item"
                          className="hover:bg-danger-bg hover:text-danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...paginacao} onPageChange={paginacao.setPage} />
        </Card>
      )}

      {/* SIDE PANEL FOR FORM */}
      <Drawer
        open={showForm}
        onClose={closeForm}
        dirty={formSujo}
        title={editingRegistro ? 'Editar item' : 'Novo item'}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button type="submit" form="registro-form" loading={saving}>
              {saving ? 'Salvando...' : editingRegistro ? 'Atualizar' : 'Criar item'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form id="registro-form" onSubmit={handleSave} noValidate>
          <div className="flex flex-col gap-5">
            {campos.map((campo) => (
              <div key={campo.id}>
                <label htmlFor={`campo-${campo.id}`} className="block text-sm font-medium mb-1.5 text-ink">
                  {campo.nome}
                  <span className="text-xs text-light-text ml-2 font-normal">{TIPOS[campo.tipo]}</span>
                </label>
                {renderFieldInput(campo)}
              </div>
            ))}
          </div>

          {campos.length === 0 && (
            <p className="text-sm text-light-text text-center py-8">
              Esta tabela não possui colunas configuradas.
            </p>
          )}
        </form>
        {editingRegistro && (
          <div className="mt-8 pt-6 border-t border-divider">
            <ItensQueApontam moduloId={id} registroId={editingRegistro.id} onNavegar={() => setShowForm(false)} />
          </div>
        )}
      </Drawer>
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
