import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { SESSION_EXPIRED_EVENT } from '../services/api';
import { modulosQuery } from '../hooks/queries';
import { useToast } from '../hooks/useFeedback';
import { AuthContext } from './authContext';

const STORAGE_KEYS = ['levit_token', 'levit_user', 'levit_empresa'];

function limparSessao() {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function lerJson(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/** Lê a sessão salva. Dados incompletos ou corrompidos invalidam tudo (nunca meia-sessão). */
function lerSessao() {
  const token = localStorage.getItem('levit_token');
  const usuario = lerJson('levit_user');
  const empresa = lerJson('levit_empresa');

  if (!token || !usuario || !empresa) {
    if (token || usuario || empresa) limparSessao();
    return { usuario: null, empresa: null };
  }
  return { usuario, empresa };
}

function salvarSessao({ token, usuario, empresa }) {
  localStorage.setItem('levit_token', token);
  localStorage.setItem('levit_user', JSON.stringify(usuario));
  localStorage.setItem('levit_empresa', JSON.stringify(empresa));
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [sessao, setSessao] = useState(lerSessao);
  const { usuario, empresa } = sessao;
  const autenticado = !!usuario;

  const encerrarSessao = useCallback(() => {
    limparSessao();
    queryClient.clear();
    setSessao({ usuario: null, empresa: null });
  }, [queryClient]);

  // Valida o token no servidor logo na carga: a lista de módulos é necessária
  // em quase toda tela, então a chamada não é desperdício — ela já aquece o
  // cache e, se o token expirou, o 401 dispara o encerramento abaixo.
  useEffect(() => {
    if (autenticado) queryClient.prefetchQuery(modulosQuery);
  }, [autenticado, queryClient]);

  // Sessão expirada (401 com token salvo): volta ao login com aviso, sem recarregar a página.
  useEffect(() => {
    const onExpired = () => {
      encerrarSessao();
      toast.warning('Sua sessão expirou. Entre novamente para continuar.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [encerrarSessao, toast]);

  // Logout (ou login) em outra aba reflete nesta.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'levit_token' && event.key !== null) return;
      queryClient.clear();
      setSessao(lerSessao());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  const iniciarSessao = useCallback(
    (data) => {
      queryClient.clear(); // nunca mostra cache de outra conta
      salvarSessao(data);
      setSessao({ usuario: data.usuario, empresa: data.empresa });
      return data;
    },
    [queryClient]
  );

  const login = useCallback(
    async (email, senha) => {
      const res = await api.post('/auth/login', { email, senha });
      const { token, usuario: usr, empresa: emp } = res.data.data;
      return iniciarSessao({ token, usuario: usr, empresa: emp });
    },
    [iniciarSessao]
  );

  const registrar = useCallback(
    async (dados) => {
      const res = await api.post('/auth/registrar', dados);
      const { token, usuario: usr, empresa: emp } = res.data.data;
      return iniciarSessao({ token, usuario: usr, empresa: emp });
    },
    [iniciarSessao]
  );

  /** Aceita o convite da equipe: cria a conta e já entra nela. */
  const aceitarConvite = useCallback(
    async (token, nome, senha) => {
      const res = await api.post('/publico/convite/aceitar', { token, nome, senha });
      const { token: jwt, usuario: usr, empresa: emp } = res.data.data;
      return iniciarSessao({ token: jwt, usuario: usr, empresa: emp });
    },
    [iniciarSessao]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      encerrarSessao();
    }
  }, [encerrarSessao]);

  const value = useMemo(() => {
    const partes = usuario?.nome ? usuario.nome.split(' ').filter(Boolean) : [];
    return {
      usuario,
      empresa,
      // Sessão é lida de forma síncrona; mantido por compatibilidade com quem consome.
      loading: false,
      autenticado,
      iniciais: partes.length ? partes.map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '?',
      primeiroNome: partes[0] || 'Usuário',
      login,
      registrar,
      aceitarConvite,
      logout,
    };
  }, [usuario, empresa, autenticado, login, registrar, aceitarConvite, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
