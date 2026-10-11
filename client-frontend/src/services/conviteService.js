import api from './api';

/** Rotas públicas do convite: quem recebeu o e-mail ainda não tem conta. */
export const conviteService = {
  detalhes: async (token, signal) => {
    const response = await api.get(`/publico/convite/${token}`, { signal });
    return response.data?.data || response.data;
  },
};
