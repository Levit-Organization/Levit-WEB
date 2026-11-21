import axios from 'axios';
import { queryClient } from '../lib/queryClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const SESSION_EXPIRED_EVENT = 'levit:session-expired';

/**
 * Sessão por cookie HttpOnly: o token JWT nunca passa pelo JavaScript (um XSS
 * não consegue levá-lo embora). O navegador manda o cookie sozinho; nas
 * escritas, o servidor exige também o X-CSRF-Token recebido no login.
 */
export const CSRF_KEY = 'levit_csrf';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Levit-Sessao': 'cookie',
  },
});

api.interceptors.request.use((config) => {
  const csrf = localStorage.getItem(CSRF_KEY);
  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
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
    // 401 com sessão salva = sessão expirada. Sem sessão (ex.: senha errada no
    // login) é só uma resposta de erro comum e a tela trata.
    if (error.response?.status === 401 && localStorage.getItem(CSRF_KEY)) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default api;
