import { useMemo, useState } from 'react';
import QuadroItens from '../components/quadro/QuadroItens';
import { useParams, Navigate } from 'react-router-dom';
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
import { registroService } from '../services/registroService';
import { arquivoService } from '../services/arquivoService';
import { useModulo, useRegistros, usePessoas, queryKeys } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import SeloPrazo from '../components/prazos/SeloPrazo';
import PessoaResponsavel from '../components/prazos/PessoaResponsavel';
import { itemConcluido, opcaoDeConclusao } from '../utils/prazos';
import { REPETICOES, rotuloDaRepeticao } from '../utils/recorrencia';
import ImportarPlanilha from '../components/importacao/ImportarPlanilha';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagination } from '../hooks/usePagination';
import { useToast, useConfirm } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

const SEM_DADOS = [];
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
  const registrosQuery = useRegistros(id, buscaAtiva);
  const modulo = moduloQuery.data ?? null;
  const registros = registrosQuery.data ?? SEM_DADOS;
  const ehArquivo = modulo?.tipo === 'arquivo';

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

  const colunas = useMemo(() => {
    if (ehArquivo) {
      return [
        { key: 'arquivo_nome', titulo: 'Arquivo', tipo: 'texto', ler: (r) => r.arquivo_nome },
        { key: 'arquivo_tamanho', titulo: 'Tamanho', tipo: 'numero', ler: (r) => r.arquivo_tamanho },
        { key: 'criado_em', titulo: 'Criado em', tipo: 'data', ler: (r) => r.criado_em },
      ];
    }
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
        ler: campo.tipo === 'responsavel' ? (r) => nomes[r.dados?.[campo.id]] : (r) => r.dados?.[campo.id],
      })),
      { key: 'criado_em', titulo: 'Criado em', tipo: 'data', ler: (r) => r.criado_em },
    ];
  }, [campos, ehArquivo, nomes]);

  const [ordem, setOrdem] = useState(null); // { key, direcao }

  // --- Visão em quadro --------------------------------------------------------
  // Disponível quando a tabela tem uma coluna de lista: cada opção vira uma
  // coluna do quadro. A escolha (lista/quadro e coluna) fica lembrada por tabela.
  const camposLista = useMemo(() => campos.filter((c) => c.tipo === 'selecao' && c.opcoes?.length), [campos]);
  // Por tabela: trocar de tabela mantém esta tela montada (mesma rota, outro id).
  const [preferencias, setPreferencias] = useState({});
  const preferencia = preferencias[id] ?? lerPreferencia(id);
  const podeQuadro = !ehArquivo && camposLista.length > 0;
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
    const chave = queryKeys.registros(id, buscaAtiva);
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formSujo = ehArquivo
    ? !!selectedFile
    : JSON.stringify(formDados) !== JSON.stringify(dadosIniciais);

  const abrirFormulario = (registro) => {
    const dados = registro?.dados || {};
    setEditingRegistro(registro);
    setFormDados(dados);
    setDadosIniciais(dados);
    setSelectedFile(null);
    setError('');
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleFieldChange = (campoId, value) => {
    setFormDados((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setError('');
      if (ehArquivo) {
        if (!selectedFile) {
          setError('Selecione um arquivo.');
          return;
        }
        await arquivoService.upload(id, selectedFile);
        toast.success('Arquivo enviado.');
      } else if (editingRegistro) {
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
      title: ehArquivo ? 'Excluir arquivo?' : 'Excluir item?',
      message: ehArquivo
        ? `"${registro.arquivo_nome || 'Este arquivo'}" será removido definitivamente.`
        : 'Este item será removido definitivamente. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      if (ehArquivo) {
        await arquivoService.delete(id, registro.id);
      } else {
        await registroService.delete(id, registro.id);
      }
      queryClient.setQueryData(queryKeys.registros(id, buscaAtiva), (atual) =>
        atual?.filter((r) => r.id !== registro.id)
      );
      toast.success(ehArquivo ? 'Arquivo excluído.' : 'Item excluído.');
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Erro ao excluir.'));
    }
  };

  const handleDownload = async (registro) => {
    try {
      await arquivoService.downloadFile(id, registro.id, registro.arquivo_nome);
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Erro ao baixar arquivo.'));
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
      default:
        return null;
    }
  };

  const TIPOS = { texto: 'Texto', numero: 'Número', data: 'Data', selecao: 'Seleção', responsavel: 'Pessoa da equipe', prazo: 'Data', recorrencia: 'Repetição' };

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

  const buscando = registrosQuery.isFetching && registrosQuery.isPlaceholderData;
  const termoBusca = buscaAtiva;

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
            {!ehArquivo && campos.length > 0 && (
              <Button variant="secondary" icon="upload_file" onClick={() => setImportando(true)}>
                Importar
              </Button>
            )}
            <Button onClick={() => abrirFormulario(null)} icon={ehArquivo ? 'upload' : 'add'}>
              {ehArquivo ? 'Enviar arquivo' : 'Novo item'}
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
                <select
                  value={campoGrupo.id}
                  onChange={(e) => mudarPreferencia({ campo: e.target.value })}
                  className="h-9 rounded-lg border border-divider-strong bg-surface px-2.5 text-sm text-ink"
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
            icon={ehArquivo ? 'folder_open' : 'inbox'}
            size="lg"
            title={termoBusca ? 'Nenhum resultado' : 'Nenhum item ainda'}
            description={
              termoBusca
                ? `Nada bate com "${termoBusca}" nesta tabela. Tente outro termo.`
                : ehArquivo
                  ? 'Esta tabela guarda arquivos. Envie o primeiro para começar a organizar os documentos aqui.'
                  : 'Cada item é uma linha com as colunas que você configurou nesta tabela.'
            }
            actionLabel={termoBusca ? undefined : ehArquivo ? 'Enviar arquivo' : 'Criar primeiro item'}
            actionIcon={termoBusca ? undefined : ehArquivo ? 'upload' : 'add'}
            onAction={termoBusca ? undefined : () => abrirFormulario(null)}
          />
        </Card>
      ) : visao === 'quadro' ? (
        <div className={`transition-opacity duration-150 ${buscando ? 'opacity-60' : ''}`} aria-busy={buscando}>
          <QuadroItens itens={ordenados} campos={campos} campoGrupo={campoGrupo} nomes={nomes} onAbrir={abrirFormulario} onMover={moverItem} />
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
                        className="text-left px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider"
                      >
                        <button
                          type="button"
                          onClick={() => alternarOrdem(coluna.key)}
                          className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink transition-colors rounded"
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
                  <th scope="col" className="text-right px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider">
                    Ações
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
                      if (coluna.key === 'arquivo_tamanho') exibicao = valor ? `${(valor / 1024).toFixed(2)} KB` : null;
                      const textoVazio = exibicao === null || exibicao === undefined || exibicao === '';
                      if (!textoVazio && coluna.tipo === 'prazo') {
                        exibicao = <SeloPrazo data={valor} concluido={itemConcluido(registro.dados, campos)} />;
                      }
                      if (!textoVazio && coluna.tipo === 'recorrencia') {
                        exibicao = (
                          <span className="inline-flex items-center gap-1 text-ink-soft">
                            <span className="material-icons text-[15px] text-primary" aria-hidden="true">event_repeat</span>
                            {rotuloDaRepeticao(valor) ?? valor}
                          </span>
                        );
                      }
                      if (!textoVazio && coluna.tipo === 'responsavel') {
                        exibicao = <PessoaResponsavel nome={valor} />;
                      }

                      return (
                        <td
                          key={coluna.key}
                          className={`px-4 py-3 truncate max-w-[200px] ${
                            coluna.key === 'criado_em' || coluna.key === 'arquivo_tamanho' ? 'text-light-text text-xs' : ''
                          }`}
                          title={vazio ? undefined : String(valor)}
                        >
                          {textoVazio ? <span className="text-light-text">--</span> : exibicao}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {ehArquivo ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(registro)}
                            className="p-1.5 text-light-text hover:text-primary transition-colors rounded-md hover:bg-primary-100"
                            title="Baixar"
                            aria-label="Baixar arquivo"
                          >
                            <span className="material-icons text-lg" aria-hidden="true">download</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirFormulario(registro)}
                            className="p-1.5 text-light-text hover:text-primary transition-colors rounded-md hover:bg-primary-100"
                            title="Editar"
                            aria-label="Editar item"
                          >
                            <span className="material-icons text-lg" aria-hidden="true">edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(registro)}
                          className="p-1.5 text-light-text hover:text-danger transition-colors rounded hover:bg-danger-bg"
                          title="Excluir"
                          aria-label={ehArquivo ? 'Excluir arquivo' : 'Excluir item'}
                        >
                          <span className="material-icons text-lg" aria-hidden="true">delete_outline</span>
                        </button>
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
        title={ehArquivo ? 'Enviar arquivo' : editingRegistro ? 'Editar item' : 'Novo item'}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button type="submit" form="registro-form" loading={saving}>
              {saving ? 'Salvando...' : editingRegistro ? 'Atualizar' : ehArquivo ? 'Enviar' : 'Criar item'}
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
          {ehArquivo ? (
            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="arquivo-input" className="block text-sm font-medium mb-1.5 text-ink">Selecione o arquivo</label>
                <input
                  id="arquivo-input"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="w-full text-sm text-light-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </form>
      </Drawer>
      {importando && (
        <ImportarPlanilha
          aberto
          onFechar={() => setImportando(false)}
          modulo={modulo}
          campos={campos}
          pessoas={pessoasQuery.data ?? []}
          onImportado={() => queryClient.invalidateQueries({ queryKey: ['registros', id] })}
        />
      )}
    </Layout>
  );
}
