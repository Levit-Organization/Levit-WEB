import api from './api';

export const arquivoService = {
  upload: async (moduloId, file) => {
    const formData = new FormData();
    formData.append('arquivo', file);

    const response = await api.post(`/modulos/${moduloId}/arquivos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data?.data || response.data;
  },

  downloadFile: async (moduloId, registroId, fileName) => {
    try {
      const response = await api.get(`/modulos/${moduloId}/arquivos/${registroId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao baixar arquivo', e);
      throw e;
    }
  },

  delete: async (moduloId, registroId) => {
    const response = await api.delete(`/modulos/${moduloId}/arquivos/${registroId}`);
    return response.data?.data || response.data;
  }
};

