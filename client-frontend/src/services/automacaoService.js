import api from './api';

export const automacaoService = {
  listar: async (moduloId) => {
    const response = await api.get(`/modulos/${moduloId}/automacoes`);
    return response.data?.data || response.data;
  },

  criar: async (moduloId, dados) => {
    const response = await api.post(`/modulos/${moduloId}/automacoes`, dados);
    return response.data?.data || response.data;
  },

  alternarAtivo: async (moduloId, automacaoId, ativo) => {
    const response = await api.put(`/modulos/${moduloId}/automacoes/${automacaoId}/ativo`, { ativo });
    return response.data?.data || response.data;
  },

  excluir: async (moduloId, automacaoId) => {
    const response = await api.delete(`/modulos/${moduloId}/automacoes/${automacaoId}`);
    return response.data?.data || response.data;
  },
};
