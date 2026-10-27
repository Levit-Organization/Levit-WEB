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

  /** Registro feito pela equipe. */
  adicionarCandidato: async (moduloId, dados, curriculo) => {
    const response = await api.post(`/modulos/${moduloId}/candidatos`, formularioDoCandidato(dados, curriculo), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  /** Página pública da vaga: o nome dela e da empresa. */
  getVagaPublica: async (moduloId, signal) => {
    const response = await api.get(`/publico/vagas/${moduloId}`, { signal });
    return response.data?.data || response.data;
  },

  /** O próprio candidato se inscrevendo pelo link da vaga. */
  candidatar: async (moduloId, dados, curriculo) => {
    const response = await api.post(`/publico/candidatura/${moduloId}`, formularioDoCandidato(dados, curriculo), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  baixarCurriculo: async (moduloId, candidato) => {
    const response = await api.get(`/modulos/${moduloId}/candidatos/${candidato.id}/curriculo`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = candidato.curriculo_nome || `Currículo - ${candidato.nome}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      window.URL.revokeObjectURL(url);
    }
  },
};

function formularioDoCandidato(dados, curriculo) {
  const form = new FormData();
  ['nome', 'email', 'telefone', 'mensagem'].forEach((campo) => form.append(campo, (dados[campo] || '').trim()));
  if (curriculo) form.append('curriculo', curriculo);
  return form;
}
