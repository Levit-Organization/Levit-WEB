import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from './FeedbackProvider';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';
import api, { CSRF_KEY } from '../services/api';

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal();
  original.default.post = vi.fn();
  original.default.get = vi.fn().mockResolvedValue({ data: { data: [] } });
  return original;
});

const capturado = { auth: null };
function Espiao() {
  const valor = useAuth();
  useEffect(() => {
    capturado.auth = valor;
  });
  return <p>{valor.autenticado ? `logado: ${valor.primeiroNome}` : 'deslogado'}</p>;
}

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <AuthProvider>
          <Espiao />
        </AuthProvider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const respostaDeLogin = {
  csrf: 'c'.repeat(64),
  usuario: { id: 'u1', nome: 'Ana Souza', email: 'ana@acme.com' },
  empresa: { id: 'e1', nome: 'Acme' },
  equipes: [],
};

describe('AuthProvider (sessão em cookie HttpOnly)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.clearAllMocks());

  it('o login guarda só o CSRF e os dados de exibição, nunca um token', async () => {
    api.post.mockResolvedValueOnce({ data: { data: respostaDeLogin } });
    renderizar();

    await act(() => capturado.auth.login('ana@acme.com', 'segredo'));

    expect(screen.getByText('logado: Ana')).toBeInTheDocument();
    expect(localStorage.getItem(CSRF_KEY)).toBe(respostaDeLogin.csrf);
    expect(localStorage.getItem('levit_token')).toBeNull();
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/eyJ/); // nada parecido com um JWT
  });

  it('descarta a sessão da versão antiga (token no localStorage)', () => {
    localStorage.setItem('levit_token', 'eyJ.antigo.token');
    localStorage.setItem('levit_user', JSON.stringify(respostaDeLogin.usuario));
    localStorage.setItem('levit_empresa', JSON.stringify(respostaDeLogin.empresa));

    renderizar();

    expect(screen.getByText('deslogado')).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it('restaura a sessão salva ao recarregar a página', () => {
    localStorage.setItem(CSRF_KEY, respostaDeLogin.csrf);
    localStorage.setItem('levit_user', JSON.stringify(respostaDeLogin.usuario));
    localStorage.setItem('levit_empresa', JSON.stringify(respostaDeLogin.empresa));

    renderizar();

    expect(screen.getByText('logado: Ana')).toBeInTheDocument();
  });

  it('o logout limpa a sessão mesmo se a API falhar', async () => {
    localStorage.setItem(CSRF_KEY, respostaDeLogin.csrf);
    localStorage.setItem('levit_user', JSON.stringify(respostaDeLogin.usuario));
    localStorage.setItem('levit_empresa', JSON.stringify(respostaDeLogin.empresa));
    api.post.mockRejectedValueOnce(new Error('rede'));
    renderizar();

    await act(() => capturado.auth.logout());

    expect(screen.getByText('deslogado')).toBeInTheDocument();
    expect(localStorage.getItem(CSRF_KEY)).toBeNull();
  });
});

describe('cliente da API', () => {
  it('pede sessão por cookie e envia o CSRF salvo', async () => {
    localStorage.setItem(CSRF_KEY, 'abc');
    const [interceptor] = api.interceptors.request.handlers.filter(Boolean);
    const config = await interceptor.fulfilled({ headers: {} });

    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['X-Levit-Sessao']).toBe('cookie');
    expect(config.headers['X-CSRF-Token']).toBe('abc');
    expect(config.headers.Authorization).toBeUndefined();
  });
});
