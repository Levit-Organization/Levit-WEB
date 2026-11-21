import api from './api';

export const prazoService = {
  /** Atrasados, vencendo hoje e nos próximos 7 dias, de todas as tabelas visíveis. */
  listar: async ({ escopo = 'todos', signal } = {}) => {
    const response = await api.get('/itens/prazos', { params: { escopo }, signal });
    return response.data?.data || response.data;
  },
};
