import api from './api';

export const recrutamentoService = {
  getKanban: async (signal) => {
    const response = await api.get('/recrutamento/kanban', { signal });
    return response.data?.data || response.data;
  },
  
  moverFase: async (id, novaFase) => {
    const response = await api.put(`/recrutamento/candidatos/${id}/fase`, { fase: novaFase });
    return response.data?.data || response.data;
  },

  getKanbanDaVaga: async (moduloId, signal) => {
    const response = await api.get(`/modulos/${moduloId}/kanban`, { signal });
    return response.data?.data || response.data;
  },

  // skipInvalidate: a tela já aplicou a mudança de forma otimista; refazer o
  // fetch do funil inteiro a cada arraste só causaria tremor visual.
  moverFaseDaVaga: async (moduloId, candidatoId, faseId) => {
    const response = await api.put(
      `/modulos/${moduloId}/candidatos/${candidatoId}/fase`,
      { fase_id: faseId },
      { skipInvalidate: true }
    );
    return response.data?.data || response.data;
  },

  criarEtapa: async (moduloId, nome) => {
    const response = await api.post(`/modulos/${moduloId}/fases`, { nome });
    return response.data?.data || response.data;
  },

  adicionarCandidato: async (moduloId, dados) => {
    const response = await api.post(`/publico/candidatura/${moduloId}`, dados);
    return response.data?.data || response.data;
  },
};
