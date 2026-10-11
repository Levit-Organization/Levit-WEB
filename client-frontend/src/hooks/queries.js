import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { moduloService } from '../services/moduloService';
import { registroService } from '../services/registroService';
import { recrutamentoService } from '../services/recrutamentoService';
import { equipeService } from '../services/equipeService';
import { cargoService } from '../services/cargoService';
import { automacaoService } from '../services/automacaoService';
import { prazoService } from '../services/prazoService';
import { relatorioService } from '../services/relatorioService';
import { queryClient } from '../lib/queryClient';

export const queryKeys = {
  modulos: ['modulos'],
  modulo: (id) => ['modulo', id],
  registros: (id, busca) => ['registros', id, busca || ''],
  kanban: (vagaId) => ['kanban', vagaId || 'all'],
  equipe: ['equipe'],
  cargos: ['cargos'],
  automacoes: ['automacoes'],
  pessoas: ['equipe', 'pessoas'],
  prazos: (escopo) => ['prazos', escopo],
  relatorios: ['relatorios'],
  enviosRelatorio: (id) => ['relatorios', 'envios', id],
  indicadores: (inicio, fim) => ['relatorios', 'indicadores', inicio, fim],
  tabelasRelatorio: ['relatorios', 'tabelas'],
  agrupamento: (params) => ['relatorios', 'agrupar', params],
  convites: ['equipe', 'convites'],
  execucoes: (automacaoId) => ['automacoes', 'execucoes', automacaoId],
  simulacao: (moduloId, registroId, definicao) => ['automacoes', 'simulacao', moduloId, registroId || 'recente', definicao],
};

export const modulosQuery = {
  queryKey: queryKeys.modulos,
  queryFn: () => moduloService.getAll(),
};

/** Lista de módulos — compartilhada (e deduplicada) entre Dashboard, Kanban, Módulos, Equipe... */
export function useModulos(options) {
  return useQuery({ ...modulosQuery, ...options });
}

export function useModulo(id) {
  return useQuery({
    queryKey: queryKeys.modulo(id),
    queryFn: () => moduloService.getById(id),
    enabled: !!id,
  });
}

/**
 * Registros de um módulo. `placeholderData` mantém a tabela anterior na tela
 * enquanto a nova busca chega, em vez de piscar um spinner a cada digitação.
 * O `signal` cancela a requisição anterior quando a busca muda.
 */
export function useRegistros(id, busca) {
  return useQuery({
    queryKey: queryKeys.registros(id, busca),
    queryFn: ({ signal }) => registroService.getAll(id, busca, signal),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

/**
 * Funil de uma vaga. Sem `vagaId`, cai no funil global (somente leitura).
 * O estado `enabled` deixa a tela decidir quando buscar (ex.: depois de saber
 * quais vagas existem), evitando uma requisição inútil por navegação.
 */
// Intervalo da sincronização do funil. Sem canal push no backend, o polling é o
// que mantém o quadro próximo do tempo real; trocar por SSE/WebSocket só exige
// chamar invalidateQueries({ queryKey: queryKeys.kanban(vagaId) }) a cada evento.
export const KANBAN_POLL_MS = 15_000;

export function useKanban(vagaId, { enabled = true, pausado } = {}) {
  return useQuery({
    queryKey: queryKeys.kanban(vagaId),
    queryFn: ({ signal }) =>
      vagaId ? recrutamentoService.getKanbanDaVaga(vagaId, signal) : recrutamentoService.getKanban(signal),
    enabled,
    // Aba oculta não consome API (o React Query já não faz polling em segundo plano).
    refetchInterval: () => (pausado?.() ? false : KANBAN_POLL_MS),
    refetchOnWindowFocus: () => !pausado?.(),
    // Mantém a mesma referência quando nada mudou: sem re-render nem tremor.
    structuralSharing: true,
  });
}

export const equipeQuery = {
  queryKey: queryKeys.equipe,
  queryFn: () => equipeService.listarMembros(),
};

export const cargosQuery = {
  queryKey: queryKeys.cargos,
  queryFn: () => cargoService.listarCargos(),
};

export const convitesQuery = {
  queryKey: queryKeys.convites,
  queryFn: () => equipeService.listarConvites(),
};

/** Convites enviados que ainda não foram aceitos. */
export function useConvites(options) {
  return useQuery({ ...convitesQuery, ...options });
}

/** Nomes da equipe (sem e-mail) para a coluna Responsável. Muda pouco: 5 min de cache. */
export function usePessoas(options) {
  return useQuery({
    queryKey: queryKeys.pessoas,
    queryFn: () => equipeService.listarPessoas(),
    staleTime: 5 * 60_000,
    ...options,
  });
}

export const prazosQuery = (escopo = 'todos') => ({
  queryKey: queryKeys.prazos(escopo),
  queryFn: ({ signal }) => prazoService.listar({ escopo, signal }),
});

/** Prazos de todas as tabelas (tela inicial). */
export function usePrazos(escopo = 'todos', options) {
  return useQuery({ ...prazosQuery(escopo), ...options });
}

/** Relatórios agendados (só acesso total; 403 vira estado próprio na tela). */
export function useRelatorios() {
  return useQuery({ queryKey: queryKeys.relatorios, queryFn: () => relatorioService.listar(), retry: false });
}

export function useEnviosRelatorio(id, { enabled }) {
  return useQuery({ queryKey: queryKeys.enviosRelatorio(id), queryFn: () => relatorioService.envios(id), enabled: enabled && !!id });
}

/** Indicadores do painel de relatórios para o período (datas inclusivas). */
export function useIndicadores(inicio, fim) {
  return useQuery({
    queryKey: queryKeys.indicadores(inicio, fim),
    queryFn: ({ signal }) => relatorioService.indicadores({ inicio, fim, signal }),
    enabled: !!inicio && !!fim && inicio <= fim,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useTabelasRelatorio() {
  return useQuery({ queryKey: queryKeys.tabelasRelatorio, queryFn: () => relatorioService.tabelas(), retry: false });
}

/** Relatório montado; só busca quando tabela e coluna estão escolhidas. */
export function useAgrupamento(params) {
  const pronto = !!params?.modulo_id && !!params?.agrupar_por && (params.operacao === 'contar' || !!params.campo_valor);
  return useQuery({
    queryKey: queryKeys.agrupamento(params),
    queryFn: ({ signal }) => relatorioService.agrupar(params, signal),
    enabled: pronto,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useEquipe(options) {
  return useQuery({ ...equipeQuery, ...options });
}

export function useCargos(options) {
  return useQuery({ ...cargosQuery, ...options });
}

/** Formato antigo (uma chamada por módulo), usado só se o backend ainda não tiver GET /automacoes. */
async function automacoesPorModulo(modulos) {
  const listas = await Promise.all(
    modulos.map((modulo) =>
      automacaoService
        .listar(modulo.id)
        .then((lista) =>
          (lista || []).map((automacao) => ({
            ...automacao,
            modulo_nome: modulo.nome,
            modulo_icone: modulo.icone,
          }))
        )
        // Um módulo sem acesso/automações não deve derrubar a lista toda.
        .catch(() => [])
    )
  );
  return listas.flat();
}

/**
 * Automações de todos os módulos, já anotadas com nome/ícone do módulo: duas
 * requisições em paralelo (a lista de módulos sai do cache quando já existe)
 * em vez de uma por módulo.
 */
export const automacoesQuery = {
  queryKey: queryKeys.automacoes,
  queryFn: async () => {
    const [modulos, automacoes] = await Promise.all([
      queryClient.ensureQueryData(modulosQuery).then((m) => m || []),
      automacaoService.listarTodas().catch((error) => (error?.response?.status === 404 ? null : Promise.reject(error))),
    ]);
    return { modulos, automacoes: automacoes ?? (await automacoesPorModulo(modulos)) };
  },
};

/**
 * Pré-carrega os dados da tela antes do clique (hover/foco no menu). Dados
 * ainda frescos no cache não são buscados de novo.
 */
const DADOS_POR_ROTA = {
  '/dashboard': [modulosQuery, equipeQuery, convitesQuery, automacoesQuery, prazosQuery('todos')],
  '/recrutamento': [modulosQuery],
  '/modulos': [modulosQuery],
  '/team': [equipeQuery, cargosQuery, convitesQuery],
  '/automacoes': [automacoesQuery],
};

export function prefetchDadosDaRota(path) {
  (DADOS_POR_ROTA[path] || []).forEach((query) => {
    queryClient.prefetchQuery(query);
  });
}

export function useAutomacoes() {
  return useQuery(automacoesQuery);
}

/**
 * Histórico de execuções paginado por cursor. Enquanto o painel está aberto,
 * atualiza sozinho para mostrar retentativas e novas execuções.
 */
export function useExecucoes(automacao, { aberto }) {
  return useInfiniteQuery({
    queryKey: queryKeys.execucoes(automacao?.id),
    queryFn: ({ pageParam, signal }) =>
      automacaoService.execucoes(automacao.modulo_id, automacao.id, { antesDe: pageParam, signal }),
    initialPageParam: undefined,
    getNextPageParam: (ultima) => ultima?.proximo ?? undefined,
    enabled: !!automacao && aberto,
    refetchInterval: aberto ? 15_000 : false,
  });
}

/** Prévia do que a automação faria com um registro, sem enviar nada. */
export function useSimulacao(moduloId, definicao, registroId, { enabled }) {
  return useQuery({
    queryKey: queryKeys.simulacao(moduloId, registroId, definicao),
    queryFn: ({ signal }) =>
      automacaoService.simular(moduloId, { automacao: definicao, ...(registroId ? { registro_id: registroId } : {}) }, signal),
    enabled: enabled && !!moduloId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
