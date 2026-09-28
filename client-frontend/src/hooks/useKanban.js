/**
 * src/hooks/useKanban.js
 *
 * Hook para o kanban de recrutamento.
 * - Suporta modo "todas as vagas" (vagaId = 'all') ou vaga específica
 * - AbortSignal propagado ao Axios
 *
 * Optimistic update cirúrgico em useMoverCandidato:
 *   Em vez de clonar TODAS as colunas (O(n_colunas × n_candidatos)),
 *   apenas as referências das colunas de origem e destino são substituídas.
 *   As demais colunas mantêm a mesma referência de objeto, o que permite
 *   ao React.memo das KanbanColuna ignorar o re-render com segurança.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '../services/api';
import api from '../services/api';

// ── Chave de query ────────────────────────────────────────────────────────────
export const kanbanKey = (vagaId) => ['kanban', vagaId ?? 'all'];

// ── Fetcher ───────────────────────────────────────────────────────────────────
function fetchKanban({ queryKey, signal }) {
  const [, vagaId] = queryKey;
  // Endpoints espelhados do recrutamentoService original:
  //   todas as vagas  → GET /recrutamento/kanban
  //   vaga específica → GET /modulos/{moduloId}/kanban
  const url = vagaId === 'all' ? '/recrutamento/kanban' : `/modulos/${vagaId}/kanban`;
  return apiGet(url, { signal });
}

// ── Hook principal ────────────────────────────────────────────────────────────
/**
 * @param {string|'all'|null} vagaId
 * @param {import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useKanban(vagaId, options = {}) {
  return useQuery({
    queryKey: kanbanKey(vagaId),
    queryFn: fetchKanban,
    enabled: !!vagaId,
    ...options,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Mover candidato entre fases com optimistic update cirúrgico.
 *
 * Algoritmo de clone mínimo:
 *  1. Shallow-copy do objeto raiz (uma linha: { ...old })
 *  2. Substituir apenas as entradas das colunas afetadas
 *  3. Criar novos arrays SOMENTE para origem e destino
 *  Resultado: O(n_origem + n_destino) em vez de O(n_total)
 */
export function useMoverCandidato(vagaId) {
  const queryClient = useQueryClient();

  return useMutation({
    // Endpoint espelhado do recrutamentoService.moverFaseDaVaga
    mutationFn: ({ moduloId, candidatoId, faseId }) =>
      api
        .put(`/modulos/${moduloId}/candidatos/${candidatoId}/fase`, { fase_id: faseId })
        .then((r) => r.data?.data ?? r.data),

    // ── Optimistic update cirúrgico ───────────────────────────────────────
    onMutate: async ({ candidatoId, sourceFaseId, faseId }) => {
      const key = kanbanKey(vagaId);
      await queryClient.cancelQueries({ queryKey: key });

      const snapshot = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old) => {
        if (!old) return old;

        const srcCol = old[sourceFaseId];
        const dstCol = old[faseId];
        if (!srcCol || !dstCol) return old;

        // Localiza o candidato na coluna de origem
        const candidato = srcCol.candidatos.find((c) => c.id === candidatoId);
        if (!candidato) return old;

        // ── Clone cirúrgico: apenas as duas colunas afetadas ─────────────
        const novaOrigem = {
          ...srcCol,
          candidatos: srcCol.candidatos.filter((c) => c.id !== candidatoId),
          total: Math.max(0, (srcCol.total ?? srcCol.candidatos.length) - 1),
        };

        const novoDestino = {
          ...dstCol,
          candidatos: [...dstCol.candidatos, { ...candidato, fase_atual_id: faseId }],
          total: (dstCol.total ?? dstCol.candidatos.length) + 1,
        };

        // Shallow-copy do mapa raiz preservando referências das demais colunas
        return {
          ...old,
          [sourceFaseId]: novaOrigem,
          [faseId]:       novoDestino,
        };
      });

      return { snapshot };
    },

    // ── Rollback em caso de erro ──────────────────────────────────────────
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(kanbanKey(vagaId), ctx.snapshot);
      }
      // TODO(Issue#17): Substituir por toast/notificação visual quando sistema de notificações for implementado
      console.error('[Kanban] Falha ao mover candidato:', _err?.response?.data?.message || _err.message);
    },

    // ── Revalida após settled para garantir consistência com o servidor ───
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKey(vagaId) });
    },
  });
}

export function useCriarEtapa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduloId, nome }) =>
      api.post(`/modulos/${moduloId}/fases`, { nome }).then((r) => r.data?.data ?? r.data),
    onSuccess: (_data, { moduloId }) => {
      queryClient.invalidateQueries({ queryKey: kanbanKey(moduloId) });
      queryClient.invalidateQueries({ queryKey: kanbanKey('all') });
    },
  });
}

export function useAdicionarCandidato(vagaId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados) =>
      api
        .post(`/publico/candidatura/${dados.modulo_id}`, dados)
        .then((r) => r.data?.data ?? r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKey(vagaId) });
      queryClient.invalidateQueries({ queryKey: kanbanKey('all') });
    },
  });
}

export function useAtualizarCandidato(vagaId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduloId, candidatoId, payload }) =>
      api
        .put(`/modulos/${moduloId}/candidatos/${candidatoId}`, payload)
        .then((r) => r.data?.data ?? r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKey(vagaId) });
      queryClient.invalidateQueries({ queryKey: kanbanKey('all') });
    },
  });
}

