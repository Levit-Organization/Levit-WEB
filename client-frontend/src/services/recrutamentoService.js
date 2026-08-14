import api from './api';

export const recrutamentoService = {
  getKanban: async () => {
    const response = await api.get('/recrutamento/kanban');
    return response.data?.data || response.data;
  },
  
  moverFase: async (id, novaFase) => {
    const response = await api.put(`/recrutamento/candidatos/${id}/fase`, { fase: novaFase });
    return response.data?.data || response.data;
  }
};
