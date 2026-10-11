import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AuthLayout from './AuthLayout';
import { Alert, Avatar, Button, Input, Skeleton } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useFeedback';
import { conviteService } from '../services/conviteService';
import { mensagemDeErro } from '../lib/queryClient';

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

function dataLegivel(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? '' : formatoData.format(data);
}

/** Mesma regra do backend: 8+ caracteres, com letras e números. */
function validar({ nome, senha, confirmacao }) {
  const erros = {};
  if (nome.trim().length < 3) erros.nome = 'Escreva seu nome completo (pelo menos 3 letras).';
  if (senha.length < 8) erros.senha = 'Use pelo menos 8 caracteres.';
  else if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) erros.senha = 'Misture letras e números.';
  if (confirmacao !== senha) erros.confirmacao = 'As senhas não são iguais.';
  return erros;
}

function Situacao({ icone, titulo, texto, children }) {
  return (
    <div className="w-full text-center mt-4">
      <span className="material-icons text-[40px] text-light-text" aria-hidden="true">{icone}</span>
      <h1 className="text-xl font-bold text-ink mt-2">{titulo}</h1>
      <p className="text-sm text-light-text mt-2">{texto}</p>
      <div className="mt-6 flex flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * Página que o link do e-mail abre. Mostra quem convidou, para qual equipe e
 * a mensagem; a pessoa escolhe nome e senha e já entra na equipe.
 */
export default function AceitarConvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { autenticado, usuario, aceitarConvite, logout } = useAuth();

  const consulta = useQuery({
    queryKey: ['convite-publico', token],
    queryFn: ({ signal }) => conviteService.detalhes(token, signal),
    retry: false,
    staleTime: Infinity,
  });
  const convite = consulta.data;

  const [form, setForm] = useState({ nome: '', senha: '', confirmacao: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const aceitar = async (e) => {
    e.preventDefault();
    const encontrados = validar(form);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    setErroGeral('');
    try {
      await aceitarConvite(token, form.nome.trim(), form.senha);
      toast.success(`Bem-vindo(a) à equipe ${convite.empresa}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErroGeral(mensagemDeErro(err, 'Não foi possível aceitar o convite. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  };

  if (consulta.isLoading) {
    return (
      <AuthLayout>
        <div className="w-full flex flex-col gap-3 mt-4" aria-busy="true" aria-label="Carregando convite">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-24 w-full rounded-lg mt-2" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </AuthLayout>
    );
  }

  if (consulta.isError) {
    const naoExiste = consulta.error?.response?.status === 404;
    return (
      <AuthLayout>
        <Situacao
          icone="link_off"
          titulo={naoExiste ? 'Este convite não existe mais' : 'Não foi possível abrir o convite'}
          texto={
            naoExiste
              ? 'O link pode ter sido cancelado ou trocado por um convite mais novo. Peça para quem convidou enviar de novo.'
              : mensagemDeErro(consulta.error, 'Verifique sua conexão e tente de novo.')
          }
        >
          {!naoExiste && <Button onClick={() => consulta.refetch()} className="w-full justify-center">Tentar de novo</Button>}
          <Link to="/" className="text-sm text-primary font-medium hover:underline">Conhecer o Levit</Link>
        </Situacao>
      </AuthLayout>
    );
  }

  if (convite.status === 'aceito') {
    return (
      <AuthLayout>
        <Situacao icone="task_alt" titulo="Convite já aceito" texto={`Este convite para a equipe ${convite.empresa} já foi usado. É só entrar com seu e-mail e senha.`}>
          <Button to="/login" className="w-full justify-center">Entrar</Button>
        </Situacao>
      </AuthLayout>
    );
  }

  if (convite.status === 'expirado') {
    return (
      <AuthLayout>
        <Situacao
          icone="schedule"
          titulo="Este convite expirou"
          texto={`O convite para a equipe ${convite.empresa} venceu em ${dataLegivel(convite.expira_em)}. Peça para ${convite.convidado_por || 'quem convidou'} enviar um novo.`}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full mt-3">
        <div className="flex flex-col items-center text-center">
          <Avatar name={convite.convidado_por || convite.empresa} size="lg" />
          <h1 className="text-xl font-bold text-ink mt-3 text-balance">
            {convite.convidado_por || 'Alguém da equipe'} convidou você para a equipe {convite.empresa}
          </h1>
          <p className="text-sm text-light-text mt-1">
            Você vai entrar como <strong className="text-ink-soft">{convite.cargo}</strong>
          </p>
        </div>

        {convite.mensagem && (
          <figure className="mt-5 rounded-lg bg-primary-50 border-l-[3px] border-primary px-4 py-3">
            <blockquote className="text-sm text-ink-soft whitespace-pre-wrap break-words">{convite.mensagem}</blockquote>
            {convite.convidado_por && <figcaption className="text-xs text-light-text mt-1.5">{convite.convidado_por}</figcaption>}
          </figure>
        )}

        {autenticado ? (
          <div className="mt-6 flex flex-col gap-3">
            <Alert variant="info">
              Você está conectado como {usuario?.email}. Para aceitar este convite com {convite.email}, saia desta conta primeiro.
            </Alert>
            <Button variant="secondary" onClick={logout} className="w-full justify-center">Sair desta conta</Button>
          </div>
        ) : (
          <form onSubmit={aceitar} noValidate className="mt-6 flex flex-col gap-4">
            {erroGeral && <div role="alert"><Alert variant="error">{erroGeral}</Alert></div>}

            <Input label="E-mail" name="email" type="email" value={convite.email} readOnly disabled hint="É com ele que você vai entrar no Levit." />
            <Input
              label="Seu nome"
              name="nome"
              autoComplete="name"
              value={form.nome}
              onChange={(e) => mudar('nome', e.target.value)}
              error={erros.nome}
              placeholder="Como a equipe vai ver você"
              required
            />
            <Input
              label="Crie uma senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              value={form.senha}
              onChange={(e) => mudar('senha', e.target.value)}
              error={erros.senha}
              hint={erros.senha ? undefined : 'Pelo menos 8 caracteres, com letras e números.'}
              required
            />
            <Input
              label="Repita a senha"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
              value={form.confirmacao}
              onChange={(e) => mudar('confirmacao', e.target.value)}
              error={erros.confirmacao}
              required
            />

            <Button type="submit" loading={enviando} className="w-full justify-center mt-1">
              {enviando ? 'Entrando na equipe...' : 'Aceitar convite e entrar'}
            </Button>
            <p className="text-xs text-light-text text-center">
              Convite válido até {dataLegivel(convite.expira_em)}.
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
