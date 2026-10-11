import api from './api';

const dados = (response) => response.data?.data ?? response.data;

/** Baixa um blob como arquivo, com o nome sugerido. */
function salvarArquivo(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nome);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const relatorioService = {
  listar: async () => dados(await api.get('/relatorios')),
  criar: async (relatorio) => dados(await api.post('/relatorios', relatorio)),
  atualizar: async (id, relatorio) => dados(await api.put(`/relatorios/${id}`, relatorio)),
  excluir: async (id) => {
    await api.delete(`/relatorios/${id}`);
  },
  envios: async (id) => dados(await api.get(`/relatorios/${id}/envios`)),
  enviarAgora: async (id) => dados(await api.post(`/relatorios/${id}/enviar-agora`)),

  /** PDF de um período (datas AAAA-MM-DD, inclusivas). */
  baixarPdf: async ({ inicio, fim, titulo = 'Relatório de atividades' }) => {
    try {
      const response = await api.get('/relatorios/pdf', { params: { inicio, fim, titulo }, responseType: 'blob' });
      salvarArquivo(new Blob([response.data], { type: 'application/pdf' }), `relatorio-${inicio}-a-${fim}.pdf`);
    } catch (erro) {
      // Erros vêm como blob: converte para a mensagem da API aparecer na tela.
      const blob = erro?.response?.data;
      if (blob instanceof Blob) {
        try {
          erro.response.data = JSON.parse(await blob.text());
        } catch {
          // mantém o erro original
        }
      }
      throw erro;
    }
  },
};
