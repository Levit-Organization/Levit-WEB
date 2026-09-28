/**
 * src/hooks/useRegistros.js
 *
 * Hook para buscar registros de um módulo com suporte a paginação e filtros.
 * - placeholderData: keepPreviousData → mantém dados da página anterior enquanto
 *   carrega a próxima, eliminando telas brancas na paginação.
 * - AbortSignal propagado ao Axios para cancelar requisições stale.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { apiGet } from '../services/api';
import api from '../services/api';

// ── Chave de query ────────────────────────────────────────────────────────────
export const registrosKey = (moduloId, params = {}) => ['registros', moduloId, params];

// ── Fetcher ───────────────────────────────────────────────────────────────────
function fetchRegistros({ queryKey, signal }) {
  const [, moduloId, { page = 1, perPage = 50, busca = '' } = {}] = queryKey;
  const params = { page, per_page: perPage };
  if (busca) params.busca = busca;
  return apiGet(`/modulos/${moduloId}/registros`, { params, signal });
}

// ── Hook principal ────────────────────────────────────────────────────────────
/**
 * @param {string} moduloId
 * @param {{ page?: number, perPage?: number, busca?: string }} [params]
 * @param {import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useRegistros(moduloId, params = {}, options = {}) {
  return useQuery({
    queryKey: registrosKey(moduloId, params),
    queryFn: fetchRegistros,
    placeholderData: keepPreviousData,
    enabled: !!moduloId,
    ...options,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useCriarRegistro(moduloId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados) =>
      api.post(`/modulos/${moduloId}/registros`, { dados }).then((r) => r.data?.data ?? r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['registros', moduloId] }),
  });
}

export function useAtualizarRegistro(moduloId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ registroId, dados }) =>
      api
        .put(`/modulos/${moduloId}/registros/${registroId}`, { dados })
        .then((r) => r.data?.data ?? r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['registros', moduloId] }),
  });
}

export function useDeletarRegistro(moduloId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registroId) =>
      api
        .delete(`/modulos/${moduloId}/registros/${registroId}`)
        .then((r) => r.data?.data ?? r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['registros', moduloId] }),
  });
}
