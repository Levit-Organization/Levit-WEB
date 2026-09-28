/**
 * src/hooks/useLancamentos.js
 *
 * Hook para lançamentos financeiros com paginação.
 * - placeholderData: keepPreviousData → sem tela branca ao trocar página/filtro
 * - AbortSignal propagado ao Axios
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { apiGet } from '../services/api';
import api from '../services/api';

// ── Chave de query ────────────────────────────────────────────────────────────
export const lancamentosKey = (moduloId, params = {}) => ['lancamentos', moduloId, params];

// ── Fetcher ───────────────────────────────────────────────────────────────────
function fetchLancamentos({ queryKey, signal }) {
  const [, moduloId, { page = 1, perPage = 50, categoriaId = null } = {}] = queryKey;
  const params = { page, per_page: perPage };
  if (categoriaId) params.categoria_id = categoriaId;
  return apiGet(`/modulos/${moduloId}/lancamentos`, { params, signal });
}

// ── Hook principal ────────────────────────────────────────────────────────────
/**
 * @param {string} moduloId
 * @param {{ page?: number, perPage?: number, categoriaId?: string|null }} [params]
 * @param {import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useLancamentos(moduloId, params = {}, options = {}) {
  return useQuery({
    queryKey: lancamentosKey(moduloId, params),
    queryFn: fetchLancamentos,
    placeholderData: keepPreviousData,
    enabled: !!moduloId,
    ...options,
  });
}

// ── Categorias ────────────────────────────────────────────────────────────────
export const categoriasKey = () => ['financeiro', 'categorias'];

export function useCategorias(options = {}) {
  return useQuery({
    queryKey: categoriasKey(),
    queryFn: ({ signal }) => apiGet('/financeiro/categorias', { signal }),
    staleTime: 5 * 60_000,
    ...options,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useCriarLancamento(moduloId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados) =>
      api.post(`/modulos/${moduloId}/lancamentos`, dados).then((r) => r.data?.data ?? r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lancamentos', moduloId] }),
  });
}

export function useAtualizarLancamento(moduloId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lancamentoId, dados }) =>
      api
        .put(`/modulos/${moduloId}/lancamentos/${lancamentoId}`, dados)
        .then((r) => r.data?.data ?? r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lancamentos', moduloId] }),
  });
}

export function useExcluirLancamento(moduloId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lancamentoId) =>
      api
        .delete(`/modulos/${moduloId}/lancamentos/${lancamentoId}`)
        .then((r) => r.data?.data ?? r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lancamentos', moduloId] }),
  });
}
