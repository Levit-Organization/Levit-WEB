import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Input, Button, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const erroExibido = error || (token ? '' : 'Este link está incompleto. Abra de novo o link do e-mail ou peça um novo.');

  // Depois do sucesso, leva ao login; o timer é limpo se a pessoa sair antes.
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(timer);
  }, [message, navigate]);

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
      <h2 className="text-xl font-bold text-ink mt-2">Criar senha nova</h2>
      <p className="text-sm text-light-text mb-6 text-center mt-1">Escolha uma senha com pelo menos 8 caracteres, misturando letras e números.</p>

      {message && (
        <div className="mb-4 w-full">
          <Alert variant="success">{message}</Alert>
        </div>
      )}
      {erroExibido && (
        <div className="mb-4 w-full" role="alert">
          <Alert variant="error">{erroExibido}</Alert>
        </div>
      )}

      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Senha nova"
            type="password"
            name="senha"
            autoComplete="new-password"
            required
            placeholder="Sua senha nova"
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
          label="Confirmar senha"
          type="password"
          name="confirmar_senha"
          autoComplete="new-password"
          required
          placeholder="Repita a senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
        />

        <Button type="submit" loading={loading} disabled={!token} className="w-full justify-center mt-4">
          {loading ? 'Salvando...' : 'Salvar senha nova'}
        </Button>

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Voltar para o login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
