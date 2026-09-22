import api from './api';

export const financeiroService = {
  // === CATEGORIAS ===
  listarCategorias: async () => {
    const response = await api.get('/financeiro/categorias');
    return response.data?.data || response.data;
  },

  criarCategoria: async (nome) => {
    const response = await api.post('/financeiro/categorias', { nome });
    return response.data?.data || response.data;
  },

  excluirCategoria: async (id) => {
    const response = await api.delete(`/financeiro/categorias/${id}`);
    return response.data?.data || response.data;
  },

  // === LANÇAMENTOS ===
  listarLancamentos: async (moduloId, categoriaId = null) => {
    const params = categoriaId ? { categoria_id: categoriaId } : {};
    const response = await api.get(`/modulos/${moduloId}/lancamentos`, { params });
    return response.data?.data || response.data;
  },

  criarLancamento: async (moduloId, dados) => {
    const response = await api.post(`/modulos/${moduloId}/lancamentos`, dados);
    return response.data?.data || response.data;
  },

  atualizarLancamento: async (moduloId, lancamentoId, dados) => {
    const response = await api.put(`/modulos/${moduloId}/lancamentos/${lancamentoId}`, dados);
    return response.data?.data || response.data;
  },

  excluirLancamento: async (moduloId, lancamentoId) => {
    const response = await api.delete(`/modulos/${moduloId}/lancamentos/${lancamentoId}`);
    return response.data?.data || response.data;
  }
};
