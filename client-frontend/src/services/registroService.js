import api from './api';

export const registroService = {
  getAll: async (moduloId, busca, signal) => {
    const response = await api.get(`/modulos/${moduloId}/registros`, {
      params: busca ? { busca } : {},
      signal,
    });
    return response.data?.data || response.data;
  },

  create: async (moduloId, data) => {
    const response = await api.post(`/modulos/${moduloId}/registros`, data);
    return response.data?.data || response.data;
  },

  /** Itens de uma planilha, já convertidos: [{ linha, dados }]. Responde { criados, erros }. */
  importar: async (moduloId, itens) => {
    const response = await api.post(`/modulos/${moduloId}/registros/importar`, { itens });
    return response.data?.data || response.data;
  },

  update: async (moduloId, registroId, data, config) => {
    const response = await api.put(`/modulos/${moduloId}/registros/${registroId}`, data, config);
    return response.data?.data || response.data;
  },

  delete: async (moduloId, registroId) => {
    const response = await api.delete(`/modulos/${moduloId}/registros/${registroId}`);
    return response.data?.data || response.data;
  }
};
