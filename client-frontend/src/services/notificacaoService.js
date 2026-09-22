import api from './api';

/**
 false pq ainda não existe backend de notificações
 */
const USAR_API_NOTIFICACOES = false;

function normalizarNotificacao(item = {}) {
  return {
    id: item.id,
    titulo: item.titulo ?? item.title ?? 'Notificação',
    mensagem: item.mensagem ?? item.message ?? '',
    tipo: item.tipo ?? item.type ?? 'sistema',
    lida: Boolean(item.lida ?? item.read ?? false),
    criado_em:
      item.criado_em ??
      item.created_at ??
      item.createdAt ??
      null,
    url: item.url ?? item.href ?? null,
  };
}

function extrairLista(payload) {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.notificacoes)) {
    return data.notificacoes;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

const notificacaoService = {
  apiAtiva: USAR_API_NOTIFICACOES,

  async listar({ limit = 8 } = {}) {
    // Sem backend:
    // nenhuma notificação placeholder será exibida.
    if (!USAR_API_NOTIFICACOES) {
      return [];
    }

    const response = await api.get('/notificacoes', {
      params: { limit },
    });

    return extrairLista(response.data).map(
      normalizarNotificacao
    );
  },

  async marcarComoLida(id) {
    if (!USAR_API_NOTIFICACOES) {
      return {
        id,
        lida: true,
      };
    }

    const response = await api.patch(
      `/notificacoes/${id}/lida`
    );

    return response.data?.data ?? response.data;
  },

  async marcarTodasComoLidas() {
    if (!USAR_API_NOTIFICACOES) {
      return {
        sucesso: true,
      };
    }

    const response = await api.patch(
      '/notificacoes/lidas'
    );

    return response.data?.data ?? response.data;
  },
};

export { notificacaoService };
export default notificacaoService;