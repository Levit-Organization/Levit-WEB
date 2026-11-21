import api from './api';

export const equipeService = {
  /** Só id e nome de todos da empresa: para escolher o responsável de um item. */
  listarPessoas: async () => {
    const response = await api.get('/equipe/pessoas');
    return response.data?.data || response.data;
  },

  listarMembros: async () => {
    const response = await api.get('/equipe');
    return response.data?.data || response.data;
  },

  convidarMembro: async (email, cargo_id, mensagem) => {
    const response = await api.post('/equipe/convidar', { email, cargo_id, ...(mensagem ? { mensagem } : {}) });
    return response.data?.data || response.data;
  },

  listarConvites: async () => {
    const response = await api.get('/equipe/convites');
    return response.data?.data || response.data;
  },

  reenviarConvite: async (id) => {
    const response = await api.post(`/equipe/convites/${id}/reenviar`);
    return response.data?.data || response.data;
  },

  cancelarConvite: async (id) => {
    const response = await api.delete(`/equipe/convites/${id}`);
    return response.data?.data || response.data;
  },

  removerMembro: async (id) => {
    const response = await api.delete(`/equipe/${id}`);
    return response.data?.data || response.data;
  },

  atualizarMembro: async (id, dados) => {
    const response = await api.put(`/equipe/${id}`, dados);
    return response.data?.data || response.data;
  },
};
