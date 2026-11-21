import api from './api';

/**
 * Com `responseType: 'blob'`, a mensagem de erro do servidor também chega como
 * blob. Ela é lida de volta para JSON para que a tela mostre o motivo real.
 */
async function lerErroDoBlob(erro) {
  const dados = erro?.response?.data;
  if (dados instanceof Blob) {
    try {
      erro.response.data = JSON.parse(await dados.text());
    } catch {
      erro.response.data = null;
    }
  }
  return erro;
}

export const arquivoService = {
  /** `onProgress` recebe de 0 a 100; `signal` permite cancelar o envio. */
  upload: async (moduloId, file, { onProgress, signal } = {}) => {
    const formData = new FormData();
    formData.append('arquivo', file);

    const response = await api.post(`/modulos/${moduloId}/arquivos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
      onUploadProgress: (evento) => {
        if (onProgress && evento.total) onProgress(Math.round((evento.loaded / evento.total) * 100));
      },
    });
    return response.data?.data || response.data;
  },

  /** Conteúdo do arquivo. `tipo` força o tipo do blob (usado na visualização). */
  obter: async (moduloId, registroId, { tipo, signal } = {}) => {
    try {
      const response = await api.get(`/modulos/${moduloId}/arquivos/${registroId}`, { responseType: 'blob', signal });
      return tipo ? new Blob([response.data], { type: tipo }) : response.data;
    } catch (erro) {
      throw await lerErroDoBlob(erro);
    }
  },

  downloadFile: async (moduloId, registroId, fileName) => {
    const blob = await arquivoService.obter(moduloId, registroId);
    salvarBlob(blob, fileName);
  },

  delete: async (moduloId, registroId) => {
    const response = await api.delete(`/modulos/${moduloId}/arquivos/${registroId}`);
    return response.data?.data || response.data;
  },
};

export function salvarBlob(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome || 'arquivo';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // O clique já começou o download; liberar no próximo ciclo evita cortá-lo em alguns navegadores.
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }
}
