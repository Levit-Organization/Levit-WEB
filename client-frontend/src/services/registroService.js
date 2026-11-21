import api from './api';

export const registroService = {
  /** `filtros`: pesquisa avançada ({ logica, regras }), já no formato da API. */
  getAll: async (moduloId, busca, signal, filtros) => {
    const params = {};
    if (busca) params.busca = busca;
    if (filtros) params.filtros = JSON.stringify(filtros);
    const response = await api.get(`/modulos/${moduloId}/registros`, { params, signal });
    return response.data?.data || response.data;
  },

  /** Itens de outras tabelas que apontam para este: [{ campo_id, campo_nome, modulo, total, itens }]. */
  ligados: async (moduloId, registroId, signal) => {
    const response = await api.get(`/modulos/${moduloId}/registros/${registroId}/ligados`, { signal });
    return response.data?.data || response.data;
  },

  /** Nome de cada item da tabela: [{ id, titulo }], para escolher e mostrar itens ligados. */
  titulos: async (moduloId, signal) => {
    const response = await api.get(`/modulos/${moduloId}/titulos`, { signal });
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
