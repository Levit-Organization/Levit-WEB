import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../Layout';
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../ui';
import { useRegistros, queryKeys } from '../../hooks/queries';
import { mensagemDeErro } from '../../lib/queryClient';
import { usePagination } from '../../hooks/usePagination';
import {
  ACEITA,
  ORDEM_INICIAL,
  arquivosVisiveis,
  proximaOrdemDosArquivos,
  resumoDosArquivos,
  tipoParaVisualizar,
} from '../../utils/arquivos';
import { useEnvioDeArquivos } from './useEnvioDeArquivos';
import { useArrastarEColar } from './useArrastarEColar';
import { useAcoesDosArquivos } from './useAcoesDosArquivos';
import { AreaDeEnvioVazia, AvisoDeSoltar } from './AreaDeSoltar';
import ListaDeArquivos from './ListaDeArquivos';
import PainelDeEnvio from './PainelDeEnvio';
import VisualizarArquivo from './VisualizarArquivo';

const SEM_DADOS = [];
const POR_PAGINA = 25;

/**
 * Tabela do tipo "arquivo": cada item é um arquivo. Envia vários de uma vez
 * (botão, arrastar para qualquer ponto da página ou colar), mostra o progresso,
 * abre imagem/PDF/texto sem baixar e baixa o resto com o nome original.
 */
export default function TabelaDeArquivos({ modulo }) {
  const id = modulo.id;
  const queryClient = useQueryClient();
  const seletorRef = useRef(null);

  const registrosQuery = useRegistros(id);
  const arquivos = registrosQuery.data ?? SEM_DADOS;

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
  const arrastando = useArrastarEColar(adicionar);
  const escolherArquivos = () => seletorRef.current?.click();

  // --- Busca e ordem ----------------------------------------------------------
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState(ORDEM_INICIAL);
  const visiveis = useMemo(() => arquivosVisiveis(arquivos, busca, ordem), [arquivos, busca, ordem]);
  const paginacao = usePagination(visiveis, POR_PAGINA);

  const alternarOrdem = (key) => {
    setOrdem((atual) => proximaOrdemDosArquivos(atual, key));
    paginacao.setPage(1);
  };

  // --- Visualizar, baixar, excluir ------------------------------------------
  const acoes = useAcoesDosArquivos(id);
  const visualizaveis = useMemo(() => visiveis.filter((a) => tipoParaVisualizar(a.arquivo_nome)), [visiveis]);
  const [visualizandoId, setVisualizandoId] = useState(null);
  const indiceVisualizado = visualizaveis.findIndex((a) => a.id === visualizandoId);
  const mudarVisualizado = useCallback((indice) => setVisualizandoId(visualizaveis[indice]?.id ?? null), [visualizaveis]);
  const visualizar = (arquivo) => setVisualizandoId(arquivo.id);
  const abrir = (arquivo) => (tipoParaVisualizar(arquivo.arquivo_nome) ? visualizar(arquivo) : acoes.baixar(arquivo));

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
        subtitle={resumoDosArquivos(arquivos, registrosQuery.isLoading)}
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
        <AreaDeEnvioVazia arrastando={arrastando} onEscolher={escolherArquivos} />
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
            <ListaDeArquivos
              paginacao={paginacao}
              ordem={ordem}
              onOrdenar={alternarOrdem}
              acoes={acoes}
              onAbrir={abrir}
              onVisualizar={visualizar}
            />
          )}
        </>
      )}

      {/* Arrastando arquivos por cima da página */}
      {arrastando && <AvisoDeSoltar nomeDaTabela={modulo.nome} />}

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
