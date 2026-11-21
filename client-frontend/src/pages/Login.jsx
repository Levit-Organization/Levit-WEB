import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input, Button, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // Volta para a tela que a pessoa tentou abrir antes de ser mandada ao login.
  const destino = location.state?.from?.pathname || '/dashboard';
  const { login, autenticado } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Redirect if already authenticated
  if (autenticado) {
    return <Navigate to={destino} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email, senha);
      navigate(destino, { replace: true });
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
      <p className="text-sm text-light-text mb-6 text-center mt-1">Entre para continuar organizando a sua equipe</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {erro && <div role="alert"><Alert variant="error">{erro}</Alert></div>}

        <Input
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemplo@empresa.com"
          required
        />

        <Input
          label="Senha"
          type="password"
          name="senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="********"
          required
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Esqueceu da senha?</Link>
        </div>

        <Button type="submit" loading={carregando} className="w-full justify-center mt-2">
          {carregando ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-xs text-ink-soft">
        Não tem conta? <Link to="/register" className="text-primary font-medium hover:underline">Registre-se grátis</Link>
      </p>
    </AuthLayout>
  );
}
