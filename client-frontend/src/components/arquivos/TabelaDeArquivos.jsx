import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../Layout';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Skeleton, tempoRelativo } from '../ui';
import { cn } from '../ui/cn';
import { useRegistros, queryKeys } from '../../hooks/queries';
import { useConfirm, useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { arquivoService } from '../../services/arquivoService';
import { usePagination } from '../../hooks/usePagination';
import { ACEITA, normalizar, tamanhoLegivel, tipoDoArquivo, tipoParaVisualizar } from '../../utils/arquivos';
import { useEnvioDeArquivos } from './useEnvioDeArquivos';
import PainelDeEnvio from './PainelDeEnvio';
import VisualizarArquivo from './VisualizarArquivo';

const SEM_DADOS = [];
const POR_PAGINA = 25;
const COLATOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const COLUNAS = [
  { key: 'arquivo_nome', titulo: 'Nome', ordenar: (a, b) => COLATOR.compare(a.arquivo_nome || '', b.arquivo_nome || '') },
  { key: 'arquivo_tamanho', titulo: 'Tamanho', classe: 'hidden sm:table-cell', ordenar: (a, b) => (a.arquivo_tamanho || 0) - (b.arquivo_tamanho || 0) },
  { key: 'enviado_por_nome', titulo: 'Enviado por', classe: 'hidden md:table-cell', ordenar: (a, b) => COLATOR.compare(a.enviado_por_nome || '', b.enviado_por_nome || '') },
  { key: 'criado_em', titulo: 'Enviado', ordenar: (a, b) => new Date(a.criado_em) - new Date(b.criado_em) },
];

const DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

function quando(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return { curto: null, completo: undefined };
  const relativo = tempoRelativo(valor);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return {
    curto: relativo === 'hoje' ? `hoje, ${hora}` : relativo || data.toLocaleDateString('pt-BR'),
    completo: DATA_COMPLETA.format(data),
  };
}

/** Algum diálogo aberto (confirmação, visualização): arrastar ou colar não envia nada. */
function dialogoAberto() {
  return !!document.querySelector('[aria-modal="true"]');
}

function temArquivos(evento) {
  return Array.from(evento.dataTransfer?.types || []).includes('Files');
}

/**
 * Tabela do tipo "arquivo": cada item é um arquivo. Envia vários de uma vez
 * (botão, arrastar para qualquer ponto da página ou colar), mostra o progresso,
 * abre imagem/PDF/texto sem baixar e baixa o resto com o nome original.
 */
export default function TabelaDeArquivos({ modulo }) {
  const id = modulo.id;
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const seletorRef = useRef(null);

  const registrosQuery = useRegistros(id);
  const arquivos = registrosQuery.data ?? SEM_DADOS;
  const chave = queryKeys.registros(id);

  // O arquivo enviado entra na lista na hora; a API recarrega a lista logo depois.
  const aoEnviar = useCallback(
    (enviado) => {
      if (!enviado?.id) return;
      queryClient.setQueryData(queryKeys.registros(id), (atual) => [enviado, ...(atual ?? []).filter((r) => r.id !== enviado.id)]);
    },
    [queryClient, id]
  );
  const envio = useEnvioDeArquivos(id, { onEnviado: aoEnviar });
  const { adicionar } = envio;

  // --- Busca e ordem ----------------------------------------------------------
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState({ key: 'criado_em', direcao: 'desc' });

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = termo ? arquivos.filter((a) => normalizar(a.arquivo_nome).includes(termo)) : arquivos;
    const coluna = COLUNAS.find((c) => c.key === ordem.key);
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => sinal * coluna.ordenar(a, b));
  }, [arquivos, busca, ordem]);

  const paginacao = usePagination(visiveis, POR_PAGINA);

  const alternarOrdem = (key) => {
    setOrdem((atual) =>
      atual.key === key
        ? { key, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
        : { key, direcao: key === 'arquivo_nome' || key === 'enviado_por_nome' ? 'asc' : 'desc' }
    );
    paginacao.setPage(1);
  };

  const totalBytes = useMemo(() => arquivos.reduce((soma, a) => soma + (Number(a.arquivo_tamanho) || 0), 0), [arquivos]);

  // --- Arrastar e colar ---------------------------------------------------------
  const [arrastando, setArrastando] = useState(false);
  const profundidade = useRef(0);

  useEffect(() => {
    // Na janela toda: soltar fora da área certa abriria o arquivo no navegador e tiraria a pessoa do app.
    const entrar = (e) => {
      if (!temArquivos(e) || dialogoAberto()) return;
      e.preventDefault();
      profundidade.current += 1;
      setArrastando(true);
    };
    const sobre = (e) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = dialogoAberto() ? 'none' : 'copy';
    };
    const sair = (e) => {
      if (!temArquivos(e)) return;
      profundidade.current = Math.max(0, profundidade.current - 1);
      if (profundidade.current === 0) setArrastando(false);
    };
    const soltar = (e) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      profundidade.current = 0;
      setArrastando(false);
      if (!dialogoAberto()) adicionar(e.dataTransfer.files);
    };
    const colar = (e) => {
      const colados = e.clipboardData?.files;
      if (!colados?.length || dialogoAberto()) return;
      e.preventDefault();
      adicionar(colados);
    };

    window.addEventListener('dragenter', entrar);
    window.addEventListener('dragover', sobre);
    window.addEventListener('dragleave', sair);
    window.addEventListener('drop', soltar);
    window.addEventListener('paste', colar);
    return () => {
      window.removeEventListener('dragenter', entrar);
      window.removeEventListener('dragover', sobre);
      window.removeEventListener('dragleave', sair);
      window.removeEventListener('drop', soltar);
      window.removeEventListener('paste', colar);
    };
  }, [adicionar]);

  const escolherArquivos = () => seletorRef.current?.click();

  // --- Visualizar, baixar, excluir ------------------------------------------
  const visualizaveis = useMemo(() => visiveis.filter((a) => tipoParaVisualizar(a.arquivo_nome)), [visiveis]);
  const [visualizandoId, setVisualizandoId] = useState(null);
  const indiceVisualizado = visualizaveis.findIndex((a) => a.id === visualizandoId);
  const mudarVisualizado = useCallback((indice) => setVisualizandoId(visualizaveis[indice]?.id ?? null), [visualizaveis]);

  const [baixando, setBaixando] = useState(() => new Set());

  const baixar = async (arquivo) => {
    setBaixando((atual) => new Set(atual).add(arquivo.id));
    try {
      await arquivoService.downloadFile(id, arquivo.id, arquivo.arquivo_nome);
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Não foi possível baixar o arquivo.'));
    } finally {
      setBaixando((atual) => {
        const novo = new Set(atual);
        novo.delete(arquivo.id);
        return novo;
      });
    }
  };

  const abrir = (arquivo) => (tipoParaVisualizar(arquivo.arquivo_nome) ? setVisualizandoId(arquivo.id) : baixar(arquivo));

  const excluir = async (arquivo) => {
    const ok = await confirm({
      title: 'Excluir arquivo?',
      message: `"${arquivo.arquivo_nome}" será apagado para todos da equipe. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;

    const anterior = queryClient.getQueryData(chave);
    queryClient.setQueryData(chave, (atual) => atual?.filter((r) => r.id !== arquivo.id));
    try {
      await arquivoService.delete(id, arquivo.id);
      toast.success('Arquivo excluído.');
    } catch (err) {
      queryClient.setQueryData(chave, anterior);
      toast.error(mensagemDeErro(err, 'Não foi possível excluir o arquivo.'));
    }
  };

  // --- Renderização -----------------------------------------------------------
  const subtitulo = registrosQuery.isLoading
    ? 'Carregando…'
    : arquivos.length === 0
      ? 'Nenhum arquivo ainda'
      : `${arquivos.length} ${arquivos.length === 1 ? 'arquivo' : 'arquivos'} · ${tamanhoLegivel(totalBytes)}`;

  return (
    <Layout>
      <input
        ref={seletorRef}
        type="file"
        multiple
        accept={ACEITA}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = ''; // permite escolher o mesmo arquivo de novo
        }}
      />

      <PageHeader
        backTo="/modulos"
        icon={modulo.icone || 'folder'}
        title={modulo.nome}
        subtitle={subtitulo}
        actions={
          <>
            <Button to={`/modulos/${id}/editar`} variant="secondary" icon="settings">
              Configurar
            </Button>
            <Button onClick={escolherArquivos} icon="upload">
              Enviar arquivos
            </Button>
          </>
        }
      />

      <PainelDeEnvio envio={envio} />

      {registrosQuery.isLoading ? (
        <Card padding="none" aria-busy="true">
          {[1, 2, 3, 4, 5].map((linha) => (
            <div key={linha} className="flex items-center gap-3 px-4 py-3.5 border-b border-divider last:border-0">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          ))}
        </Card>
      ) : registrosQuery.isError && !registrosQuery.data ? (
        <Card padding="lg" className="py-12">
          <ErrorState
            size="lg"
            description={mensagemDeErro(registrosQuery.error, 'Não foi possível carregar os arquivos.')}
            onRetry={() => registrosQuery.refetch()}
          />
        </Card>
      ) : arquivos.length === 0 ? (
        <button
          type="button"
          onClick={escolherArquivos}
          className={cn(
            'w-full rounded-xl border-2 border-dashed px-6 py-14 flex flex-col items-center text-center transition-colors duration-150',
            arrastando ? 'border-primary bg-primary-50' : 'border-divider-strong bg-surface hover:border-primary-300 hover:bg-primary-50'
          )}
        >
          <span className="w-16 h-16 rounded-xl bg-primary-100 text-primary flex items-center justify-center mb-4" aria-hidden="true">
            <span className="material-icons text-[30px]">cloud_upload</span>
          </span>
          <span className="text-base font-semibold text-ink">Arraste arquivos para cá ou clique para escolher</span>
          <span className="mt-1.5 text-sm text-light-text max-w-[48ch]">
            Contratos, notas, fotos, planilhas: tudo da equipe num lugar só. PDF, imagens, documentos, planilhas e
            apresentações de até 10 MB cada.
          </span>
        </button>
      ) : (
        <>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
                placeholder="Buscar pelo nome do arquivo..."
                aria-label="Buscar arquivos"
                autoComplete="off"
              />
            </div>
            <p className="hidden sm:flex items-center gap-1.5 text-xs text-light-text sm:ml-auto">
              <span className="material-icons text-[16px]" aria-hidden="true">touch_app</span>
              Arraste ou cole arquivos em qualquer lugar da página para enviar
            </p>
          </div>

          {visiveis.length === 0 ? (
            <Card padding="lg" className="py-12">
              <EmptyState
                icon="search_off"
                size="lg"
                title="Nenhum arquivo com esse nome"
                description={`Nada bate com "${busca.trim()}". Confira a grafia ou busque por parte do nome.`}
                actionLabel="Limpar busca"
                actionIcon="close"
                onAction={() => setBusca('')}
              />
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-divider bg-background">
                      {COLUNAS.map((coluna) => {
                        const ativa = ordem.key === coluna.key;
                        return (
                          <th
                            key={coluna.key}
                            scope="col"
                            aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                            className={cn('th-label text-left px-4 py-3', coluna.classe)}
                          >
                            <button
                              type="button"
                              onClick={() => alternarOrdem(coluna.key)}
                              className="inline-flex items-center gap-1 hover:text-ink transition-colors rounded"
                            >
                              {coluna.titulo}
                              <span className={cn('material-icons text-[14px]', ativa ? 'text-primary' : 'text-faint')} aria-hidden="true">
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
                    {paginacao.pageItems.map((arquivo) => {
                      const tipo = tipoDoArquivo(arquivo.arquivo_nome);
                      const podeVer = !!tipoParaVisualizar(arquivo.arquivo_nome);
                      const data = quando(arquivo.criado_em);
                      return (
                        <tr key={arquivo.id} className="border-b border-divider last:border-0 hover:bg-background transition-colors">
                          <td className="px-4 py-2.5 max-w-0 w-full">
                            <button
                              type="button"
                              onClick={() => abrir(arquivo)}
                              className="group flex items-center gap-3 min-w-0 w-full text-left rounded-md"
                              title={podeVer ? `Visualizar ${arquivo.arquivo_nome}` : `Baixar ${arquivo.arquivo_nome}`}
                            >
                              <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tipo.cor)} aria-hidden="true">
                                <span className="material-icons text-[18px]">{tipo.icone}</span>
                              </span>
                              <span className="min-w-0">
                                <span className="block font-medium text-ink truncate group-hover:text-primary-700 group-hover:underline">
                                  {arquivo.arquivo_nome || 'Arquivo sem nome'}
                                </span>
                                <span className="block text-2xs text-light-text">
                                  {tipo.rotulo}
                                  <span className="sm:hidden"> · {tamanhoLegivel(arquivo.arquivo_tamanho)}</span>
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-2.5 whitespace-nowrap text-xs text-light-text tabular">
                            {tamanhoLegivel(arquivo.arquivo_tamanho) ?? '--'}
                          </td>
                          <td className="hidden md:table-cell px-4 py-2.5 whitespace-nowrap">
                            {arquivo.enviado_por_nome ? (
                              <span className="flex items-center gap-2 text-ink-soft">
                                <Avatar name={arquivo.enviado_por_nome} size="xs" />
                                <span className="truncate max-w-[160px]">{arquivo.enviado_por_nome}</span>
                              </span>
                            ) : (
                              <span className="text-light-text">--</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-light-text" title={data.completo}>
                            {data.curto ?? '--'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {podeVer && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  icon="visibility"
                                  onClick={() => setVisualizandoId(arquivo.id)}
                                  title="Visualizar"
                                  aria-label={`Visualizar ${arquivo.arquivo_nome}`}
                                />
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                icon="download"
                                loading={baixando.has(arquivo.id)}
                                onClick={() => baixar(arquivo)}
                                title="Baixar"
                                aria-label={`Baixar ${arquivo.arquivo_nome}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                icon="delete_outline"
                                onClick={() => excluir(arquivo)}
                                title="Excluir"
                                aria-label={`Excluir ${arquivo.arquivo_nome}`}
                                className="hover:bg-danger-bg hover:text-danger"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination {...paginacao} onPageChange={paginacao.setPage} label="arquivos" />
            </Card>
          )}
        </>
      )}

      {/* Arrastando arquivos por cima da página */}
      {arrastando && (
        <div className="fixed inset-0 z-40 pointer-events-none p-4 animate-fade-in" aria-hidden="true">
          <div className="h-full w-full rounded-2xl border-2 border-dashed border-primary bg-primary-50/90 flex flex-col items-center justify-center text-center">
            <span className="w-16 h-16 rounded-xl bg-primary-100 text-primary flex items-center justify-center mb-4">
              <span className="material-icons text-[30px]">cloud_upload</span>
            </span>
            <p className="text-lg font-semibold text-ink">Solte para enviar para “{modulo.nome}”</p>
            <p className="mt-1 text-sm text-light-text">Até 10 MB por arquivo</p>
          </div>
        </div>
      )}

      <VisualizarArquivo
        moduloId={id}
        arquivos={visualizaveis}
        indice={indiceVisualizado}
        onMudar={mudarVisualizado}
        onFechar={() => setVisualizandoId(null)}
      />
    </Layout>
  );
}
