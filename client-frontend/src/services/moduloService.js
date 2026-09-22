import api from './api';

export const moduloService = {
  // Modules
  getAll: async () => {
    const response = await api.get('/modulos');
    return response.data?.data || response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/modulos/${id}`);
    return response.data?.data || response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/modulos', data);
    return response.data?.data || response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/modulos/${id}`, data);
    return response.data?.data || response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/modulos/${id}`);
    return response.data?.data || response.data;
  },

  // Module Fields
  addField: async (moduleId, data) => {
    const response = await api.post(`/modulos/${moduleId}/campos`, data);
    return response.data?.data || response.data;
  },

  updateField: async (moduleId, fieldId, data) => {
    const response = await api.put(`/modulos/${moduleId}/campos/${fieldId}`, data);
    return response.data?.data || response.data;
  },

  deleteField: async (moduleId, fieldId) => {
    const response = await api.delete(`/modulos/${moduleId}/campos/${fieldId}`);
    return response.data?.data || response.data;
  },

  reorderFields: async (moduleId, camposIds) => {
    const response = await api.put(`/modulos/${moduleId}/campos/reordenar`, { ordem: camposIds });
    return response.data?.data || response.data;
  }
};
