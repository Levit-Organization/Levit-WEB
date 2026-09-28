/**
 * src/hooks/useModulos.js
 *
 * Hook centralizado para a lista de módulos da empresa.
 * - staleTime: 60s → evita re-fetch ao navegar entre abas do app
 * - AbortSignal repassado ao Axios para cancelar requisições obsoletas
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '../services/api';
import api from '../services/api';

// ── Chave de query canônica ───────────────────────────────────────────────────
export const MODULOS_KEY = ['modulos'];

// ── Fetcher ───────────────────────────────────────────────────────────────────
function fetchModulos({ signal }) {
  return apiGet('/modulos', { signal });
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useModulos(options = {}) {
  return useQuery({
    queryKey: MODULOS_KEY,
    queryFn: fetchModulos,
    staleTime: 60_000,
    ...options,
  });
}

// ── Selectors derivados (evitam recalcular no componente) ─────────────────────
export function useVagas() {
  return useModulos({
    select: (data) => data?.filter((m) => m.tipo === 'recrutamento') ?? [],
  });
}

export function useOutrosModulos() {
  return useModulos({
    select: (data) => data?.filter((m) => m.tipo !== 'recrutamento') ?? [],
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useCriarModulo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/modulos', data).then((r) => r.data?.data ?? r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULOS_KEY }),
  });
}

export function useAtualizarModulo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      api.put(`/modulos/${id}`, data).then((r) => r.data?.data ?? r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULOS_KEY }),
  });
}

export function useDeletarModulo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/modulos/${id}`).then((r) => r.data?.data ?? r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULOS_KEY }),
  });
}
