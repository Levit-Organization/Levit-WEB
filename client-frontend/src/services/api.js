import axios from 'axios';
import { queryClient } from '../lib/queryClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const SESSION_EXPIRED_EVENT = 'levit:session-expired';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: inject JWT token into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('levit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Qualquer escrita bem-sucedida deixa o cache de leitura desatualizado. As
// invalidações são agrupadas: um fluxo com várias chamadas seguidas (ex.: criar
// módulo + campos) gera uma única rodada de refetch das telas ativas.
let invalidacaoPendente = null;
function agendarInvalidacao() {
  if (invalidacaoPendente) return;
  invalidacaoPendente = setTimeout(() => {
    invalidacaoPendente = null;
    queryClient.invalidateQueries();
  }, 50);
}

const METODOS_DE_ESCRITA = ['post', 'put', 'patch', 'delete'];

api.interceptors.response.use(
  (response) => {
    const metodo = response.config?.method?.toLowerCase();
    const ehAuth = response.config?.url?.startsWith('/auth/');
    if (METODOS_DE_ESCRITA.includes(metodo) && !ehAuth && !response.config?.skipInvalidate) {
      agendarInvalidacao();
    }
    return response;
  },
  (error) => {
    // 401 com token salvo = sessão expirada. Sem token (ex.: senha errada no
    // login) é só uma resposta de erro comum e a tela trata.
    if (error.response?.status === 401 && localStorage.getItem('levit_token')) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default api;
