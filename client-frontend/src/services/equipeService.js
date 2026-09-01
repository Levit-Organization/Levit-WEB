import api from './api';

export const equipeService = {
  listarMembros: async () => {
    const response = await api.get('/equipe');
    return response.data;
  },

  convidarMembro: async (email, cargo_id) => {
    const response = await api.post('/equipe/convidar', { email, cargo_id });
    return response.data;
  },

  removerMembro: async (id) => {
    const response = await api.delete(`/equipe/${id}`);
    return response.data;
  },
};
