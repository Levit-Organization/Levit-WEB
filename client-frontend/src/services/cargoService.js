import api from './api';

export const cargoService = {
  listarCargos: async () => {
    const response = await api.get('/cargos');
    return response.data?.data || response.data;
  },

  criarCargo: async (nome, permissoes) => {
    const response = await api.post('/cargos', { nome, permissoes });
    return response.data?.data || response.data;
  },

  listarNiveisModulo: async (cargoId) => {
    const response = await api.get(`/cargos/${cargoId}/modulos`);
    return response.data?.data || response.data;
  },

  definirNivelModulo: async (cargoId, moduloId, nivel) => {
    const response = await api.put(`/cargos/${cargoId}/modulos/${moduloId}`, { nivel });
    return response.data?.data || response.data;
  },

  removerNivelModulo: async (cargoId, moduloId) => {
    const response = await api.delete(`/cargos/${cargoId}/modulos/${moduloId}`);
    return response.data?.data || response.data;
  },
};
