import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

function calcularForcaSenha(senha) {
  let forca = 0;
  if (senha.length >= 8) forca++;
  if (/[A-Z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[^A-Za-z0-9]/.test(senha)) forca++;
  return forca; // 0-4
}

const FORCA_LABELS = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
const FORCA_COLORS = ['bg-divider', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'];
const FORCA_TEXT_COLORS = ['text-light-text', 'text-danger', 'text-warning', 'text-info', 'text-success'];

export default function Register() {
  const navigate = useNavigate();
  const { registrar, autenticado } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (autenticado) {
    return <Navigate to="/dashboard" replace />;
  }

  const forcaSenha = calcularForcaSenha(senha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setCarregando(true);

    try {
      await registrar({
        nome,
        email,
        senha,
        cnpj_cpf: cnpjCpf,
        nome_empresa: nomeEmpresa || nome,
      });
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors).flat();
        setErro(msgs.join(' '));
      } else {
        setErro(data?.message || 'Erro ao registrar. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthLayout bgImage="/Criar conta.png">
      <h2 className="text-xl font-bold text-ink mt-2">Criar a sua conta</h2>
      <p className="text-sm text-light-text mb-6 text-center mt-1">Comece a organizar a sua empresa hoje.</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {erro && <Alert variant="error">{erro}</Alert>}

        <Input
          label="Nome completo"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Camila Moraes"
          required
        />

        <Input
          label="E-mail corporativo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="camila@empresa.com"
          required
        />

        <Input
          label="CPF ou CNPJ"
          type="text"
          value={cnpjCpf}
          onChange={(e) => setCnpjCpf(e.target.value)}
          placeholder="XXX.XXX.XXX-XX | XX.XXX.XXX/XXXX-XX"
          required
        />

        <Input
          label="Nome da empresa"
          type="text"
          value={nomeEmpresa}
          onChange={(e) => setNomeEmpresa(e.target.value)}
          placeholder="Empresa XYZ Ltda"
          required
        />

        <div>
          <Input
            label="Palavra-passe"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Crie uma palavra-passe forte"
            className="mb-2"
            required
          />
          {/* Indicador de força da senha dinâmico */}
          <div className="flex gap-1 h-1.5 mb-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`flex-1 rounded-full transition-colors duration-300 ${
                  senha.length > 0 && forcaSenha >= level
                    ? FORCA_COLORS[forcaSenha]
                    : 'bg-divider'
                }`}
              />
            ))}
          </div>
          {senha.length > 0 && (
            <p className={`text-2xs font-medium ${FORCA_TEXT_COLORS[forcaSenha]}`}>
              {FORCA_LABELS[forcaSenha] || 'Muito fraca'}
            </p>
          )}
        </div>

        <Input
          label="Confirmar palavra-passe"
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          placeholder="Repita a palavra-passe"
          required
        />

        <Button type="submit" loading={carregando} className="w-full justify-center mt-4">
          {carregando ? 'Criando conta...' : 'Criar conta gratuita'}
        </Button>
      </form>

      <p className="mt-6 text-xs text-ink-soft">
        Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Faça login</Link>
      </p>
    </AuthLayout>
  );
}
