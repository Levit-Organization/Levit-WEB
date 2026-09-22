import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Input, Button, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Token de recuperação não fornecido na URL.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Token inválido.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      const res = await api.post('/auth/reset-password', { token, senha });
      setMessage(res.data.message || 'Senha redefinida com sucesso.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      let errorMsg = err.response?.data?.message || 'Ocorreu um erro. Tente novamente.';
      if (err.response?.data?.errors?.senha) {
        errorMsg = err.response.data.errors.senha;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-ink mt-2">Redefinir Senha</h2>
      <p className="text-sm text-light-text mb-6 text-center mt-1">Recuperar conta</p>

      {message && (
        <div className="mb-4 w-full">
          <Alert variant="success">{message}</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4 w-full">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Nova Palavra-passe"
            type="password"
            placeholder="Crie sua nova Palavra-passe"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mb-2"
          />
          {/* Indicador de força da senha - Simplificado para este MVP */}
          <div className="flex gap-1 h-1.5 mb-1">
            <div className={`flex-1 rounded-full ${senha.length > 3 ? 'bg-success' : 'bg-divider'}`}></div>
            <div className={`flex-1 rounded-full ${senha.length > 5 ? 'bg-success' : 'bg-divider'}`}></div>
            <div className={`flex-1 rounded-full ${senha.length > 7 ? 'bg-success' : 'bg-divider'}`}></div>
            <div className={`flex-1 rounded-full ${/[A-Za-z]/.test(senha) && /\d/.test(senha) ? 'bg-success' : 'bg-divider'}`}></div>
          </div>
          <p className="text-2xs text-light-text">Mínimo de 8 caracteres, com letras e números.</p>
        </div>

        <Input
          label="Confirmar palavra-passe"
          type="password"
          placeholder="Repita a palavra-passe"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
        />

        <Button type="submit" loading={loading} disabled={!token} className="w-full justify-center mt-4">
          {loading ? 'Redefinindo...' : 'Redefinir Senha'}
        </Button>

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Voltar para o Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
