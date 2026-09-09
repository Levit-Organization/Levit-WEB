import api from './api';

function baixarBlob(blob, nomeArquivoPadrao, contentDisposition) {
  const match = /filename="?([^"]+)"?/.exec(contentDisposition || '');
  const nomeArquivo = match?.[1] || nomeArquivoPadrao;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function extrairErroBlob(error) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const texto = await data.text();
      return JSON.parse(texto)?.message || 'Erro ao exportar os dados.';
    } catch {
      return 'Erro ao exportar os dados.';
    }
  }
  return error.response?.data?.message || 'Erro ao exportar os dados.';
}

export const backupService = {
  exportarJson: async () => {
    const response = await api.get('/backup/json', { responseType: 'blob' });
    baixarBlob(response.data, `backup_levit_${Date.now()}.json`, response.headers['content-disposition']);
  },

  exportarCsv: async (moduloId, nomeModulo = 'modulo') => {
    const response = await api.get(`/modulos/${moduloId}/exportar-csv`, { responseType: 'blob' });
    baixarBlob(response.data, `${nomeModulo}_${Date.now()}.csv`, response.headers['content-disposition']);
  },
};
