import api from './api';

export const recrutamentoService = {
  getKanban: async () => {
    const response = await api.get('/recrutamento/kanban');
    return response.data?.data || response.data;
  },
  
  moverFase: async (id, novaFase) => {
    const response = await api.put(`/recrutamento/candidatos/${id}/fase`, { fase: novaFase });
    return response.data?.data || response.data;
  },

  getKanbanDaVaga: async (moduloId) => {
    const response = await api.get(`/modulos/${moduloId}/kanban`);
    return response.data?.data || response.data;
  },

  moverFaseDaVaga: async (moduloId, candidatoId, faseId) => {
    const response = await api.put(`/modulos/${moduloId}/candidatos/${candidatoId}/fase`, { fase_id: faseId });
    return response.data?.data || response.data;
  }
};
