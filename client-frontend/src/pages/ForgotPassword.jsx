import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Input, Button, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Se o e-mail existir em nossa base, um link de recuperação foi enviado.');
    } catch (err) {
      setError(err.response?.data?.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-ink mt-2">Redefinir Senha</h2>
      <p className="text-sm text-light-text mb-6 text-center mt-1">Será enviado um e-mail com link de redefinição</p>

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
        <Input
          label="E-Mail"
          type="email"
          placeholder="godofredo@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" loading={loading} className="w-full justify-center mt-2">
          {loading ? 'Enviando...' : 'Enviar'}
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
