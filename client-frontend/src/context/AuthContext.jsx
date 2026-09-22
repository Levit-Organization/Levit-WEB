import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('levit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [empresa, setEmpresa] = useState(() => {
    const saved = localStorage.getItem('levit_empresa');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Validate that stored auth data is still present
  const carregarPerfil = useCallback(async () => {
    const token = localStorage.getItem('levit_token');
    if (!token) {
      setUsuario(null);
      setEmpresa(null);
      setLoading(false);
      return;
    }

    // Use stored data from localStorage (already loaded in initial state)
    // If user/empresa data is missing but token exists, clear everything
    const savedUser = localStorage.getItem('levit_user');
    const savedEmpresa = localStorage.getItem('levit_empresa');

    if (!savedUser || !savedEmpresa) {
      localStorage.removeItem('levit_token');
      localStorage.removeItem('levit_user');
      localStorage.removeItem('levit_empresa');
      setUsuario(null);
      setEmpresa(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const login = async (email, senha) => {
    const res = await api.post('/auth/login', { email, senha });
    const { token, usuario: usr, empresa: emp } = res.data.data;
    localStorage.setItem('levit_token', token);
    localStorage.setItem('levit_user', JSON.stringify(usr));
    localStorage.setItem('levit_empresa', JSON.stringify(emp));
    setUsuario(usr);
    setEmpresa(emp);
    return res.data.data;
  };

  const registrar = async (dados) => {
    const res = await api.post('/auth/registrar', dados);
    const { token, usuario: usr, empresa: emp } = res.data.data;
    localStorage.setItem('levit_token', token);
    localStorage.setItem('levit_user', JSON.stringify(usr));
    localStorage.setItem('levit_empresa', JSON.stringify(emp));
    setUsuario(usr);
    setEmpresa(emp);
    return res.data.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('levit_token');
      localStorage.removeItem('levit_user');
      localStorage.removeItem('levit_empresa');
      setUsuario(null);
      setEmpresa(null);
    }
  };

  // Helper: get user initials
  const iniciais = usuario?.nome
    ? usuario.nome.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Helper: get first name
  const primeiroNome = usuario?.nome
    ? usuario.nome.split(' ')[0]
    : 'Usuário';

  const autenticado = !!usuario;

  return (
    <AuthContext.Provider value={{
      usuario,
      empresa,
      loading,
      autenticado,
      iniciais,
      primeiroNome,
      login,
      registrar,
      logout,
      carregarPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
