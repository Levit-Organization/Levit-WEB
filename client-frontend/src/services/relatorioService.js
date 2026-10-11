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

  /** Indicadores do período (recrutamento, financeiro, prazos), com o período anterior. */
  indicadores: async ({ inicio, fim, signal }) => dados(await api.get('/relatorios/indicadores', { params: { inicio, fim }, signal })),
  /** Tabelas e colunas que dá para agrupar e somar. */
  tabelas: async () => dados(await api.get('/relatorios/tabelas')),
  /** Uma tabela agrupada por uma coluna (contar, somar ou média). */
  agrupar: async (params, signal) => dados(await api.get('/relatorios/agrupar', { params, signal })),

  /** PDF de um período (datas AAAA-MM-DD, inclusivas). `secoes`: partes do PDF (vazio = padrão). */
  baixarPdf: async ({ inicio, fim, titulo = 'Relatório de atividades', secoes }) => {
    try {
      const params = { inicio, fim, titulo, ...(secoes?.length ? { secoes: secoes.join(',') } : {}) };
      const response = await api.get('/relatorios/pdf', { params, responseType: 'blob' });
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
