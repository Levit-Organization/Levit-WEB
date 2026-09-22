import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

export default function Login() {
  const navigate = useNavigate();
  const { login, autenticado } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Redirect if already authenticated
  if (autenticado) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email, senha);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao fazer login. Tente novamente.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-ink mt-2">Bem-vindo de volta</h2>
      <p className="text-sm text-light-text mb-6 text-center mt-1">Acesse à sua conta para gerir os seus módulos</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {erro && <Alert variant="error">{erro}</Alert>}

        <Input
          label="E-mail corporativo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemplo@empresa.com"
          required
        />

        <Input
          label="Palavra-passe"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="********"
          required
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Esqueceu da palavra-passe?</Link>
        </div>

        <Button type="submit" loading={carregando} className="w-full justify-center mt-2">
          {carregando ? 'Entrando...' : <>Entrar no sistema &rarr;</>}
        </Button>
      </form>

      <p className="mt-6 text-xs text-ink-soft">
        Não tem conta? <Link to="/register" className="text-primary font-medium hover:underline">Registre-se grátis</Link>
      </p>
    </AuthLayout>
  );
}
