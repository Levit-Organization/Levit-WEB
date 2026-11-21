import api from './api';

export const automacaoService = {
  /** Automações de todos os módulos que o usuário enxerga, numa só chamada. */
  listarTodas: async () => {
    const response = await api.get('/automacoes');
    return response.data?.data || response.data;
  },

  listar: async (moduloId) => {
    const response = await api.get(`/modulos/${moduloId}/automacoes`);
    return response.data?.data || response.data;
  },

  criar: async (moduloId, dados) => {
    const response = await api.post(`/modulos/${moduloId}/automacoes`, dados);
    return response.data?.data || response.data;
  },

  atualizar: async (moduloId, automacaoId, dados) => {
    const response = await api.put(`/modulos/${moduloId}/automacoes/${automacaoId}`, dados);
    return response.data?.data || response.data;
  },

  /** Página de execuções, mais recentes primeiro. `antesDe` = cursor `proximo` da página anterior. */
  execucoes: async (moduloId, automacaoId, { antesDe, limite = 20, signal } = {}) => {
    const response = await api.get(`/modulos/${moduloId}/automacoes/${automacaoId}/execucoes`, {
      params: { limite, ...(antesDe ? { antes_de: antesDe } : {}) },
      signal,
    });
    return response.data?.data || response.data;
  },

  // Simular não altera nada no servidor: não precisa invalidar o cache.
  simular: async (moduloId, entrada, signal) => {
    const response = await api.post(`/modulos/${moduloId}/automacoes/simular`, entrada, { signal, skipInvalidate: true });
    return response.data?.data || response.data;
  },

  reexecutar: async (moduloId, automacaoId, execucaoId) => {
    const response = await api.post(
      `/modulos/${moduloId}/automacoes/${automacaoId}/execucoes/${execucaoId}/reexecutar`,
      null,
      { skipInvalidate: true }
    );
    return response.data?.data || response.data;
  },

  alternarAtivo: async (moduloId, automacaoId, ativo, config) => {
    const response = await api.put(`/modulos/${moduloId}/automacoes/${automacaoId}/ativo`, { ativo }, config);
    return response.data?.data || response.data;
  },

  excluir: async (moduloId, automacaoId) => {
    const response = await api.delete(`/modulos/${moduloId}/automacoes/${automacaoId}`);
    return response.data?.data || response.data;
  },
};
