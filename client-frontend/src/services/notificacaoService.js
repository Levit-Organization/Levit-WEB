import api from './api';

// As escritas aqui atualizam o cache na mão (otimista): não precisam disparar
// o refetch global de todas as telas.
const SEM_INVALIDAR = { skipInvalidate: true };

export const notificacaoService = {
  listar: async ({ antesDe, naoLidas = false, limite = 20, signal } = {}) => {
    const response = await api.get('/notificacoes', {
      params: { limite, ...(antesDe ? { antes_de: antesDe } : {}), ...(naoLidas ? { nao_lidas: 1 } : {}) },
      signal,
    });
    return response.data?.data || response.data;
  },

  contagem: async (signal) => {
    const response = await api.get('/notificacoes/contagem', { signal });
    return (response.data?.data || response.data)?.nao_lidas ?? 0;
  },

  marcarLida: async (id) => {
    await api.put(`/notificacoes/${id}/lida`, null, SEM_INVALIDAR);
  },

  marcarTodasLidas: async () => {
    await api.put('/notificacoes/lidas', null, SEM_INVALIDAR);
  },

  excluir: async (id) => {
    await api.delete(`/notificacoes/${id}`, SEM_INVALIDAR);
  },
};
