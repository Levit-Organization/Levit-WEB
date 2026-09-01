import api from './api';

export const cargoService = {
  listarCargos: async () => {
    const response = await api.get('/cargos');
    return response.data;
  },

  criarCargo: async (nome, permissoes) => {
    const response = await api.post('/cargos', { nome, permissoes });
    return response.data;
  },
};
