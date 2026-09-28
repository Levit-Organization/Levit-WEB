/**
 * src/hooks/useEquipe.js
 *
 * Hook para membros da equipe com retenção de cache e suporte a cargo.
 * - staleTime: 2 min → dados de equipe mudam com pouca frequência
 * - AbortSignal propagado ao Axios
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '../services/api';
import api from '../services/api';

// ── Chave de query ────────────────────────────────────────────────────────────
export const EQUIPE_KEY = ['equipe'];

// ── Hook principal ────────────────────────────────────────────────────────────
export function useEquipe(options = {}) {
  return useQuery({
    queryKey: EQUIPE_KEY,
    queryFn: ({ signal }) => apiGet('/equipe', { signal }),
    staleTime: 2 * 60_000,
    ...options,
  });
}

// ── Selectors derivados ───────────────────────────────────────────────────────
export function useMembrosAtivos() {
  return useEquipe({
    select: (data) => (data ?? []).filter((m) => m.status !== 'Pendente'),
  });
}

export function useConvitesPendentes() {
  return useEquipe({
    select: (data) => (data ?? []).filter((m) => m.status === 'Pendente'),
  });
}

// ── Cargos ────────────────────────────────────────────────────────────────────
export const CARGOS_KEY = ['cargos'];

export function useCargos(options = {}) {
  return useQuery({
    queryKey: CARGOS_KEY,
    queryFn: ({ signal }) => apiGet('/cargos', { signal }),
    staleTime: 5 * 60_000,
    ...options,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useConvidarMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, cargo_id }) =>
      api.post('/equipe/convidar', { email, cargo_id }).then((r) => r.data?.data ?? r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EQUIPE_KEY }),
  });
}

export function useAtualizarMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }) =>
      api.put(`/equipe/${id}`, dados).then((r) => r.data?.data ?? r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EQUIPE_KEY }),
  });
}

export function useRemoverMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      api.delete(`/equipe/${id}`).then((r) => r.data?.data ?? r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EQUIPE_KEY }),
  });
}
