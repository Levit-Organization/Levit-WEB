import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, FileInput, Input, Skeleton, Textarea } from '../components/ui';
import { recrutamentoService } from '../services/recrutamentoService';
import { mensagemDeErro } from '../lib/queryClient';
import { mascararTelefone } from '../utils/masks';
import { CANDIDATO_VAZIO, CURRICULO_ACCEPT, CURRICULO_DICA, validarCandidato } from '../utils/candidato';

function Moldura({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg bg-surface rounded-2xl border border-divider shadow-sm p-6 sm:p-9">{children}</div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-light-text">
        <img src="/Logo.png" alt="" className="h-4 w-4 object-contain" />
        Candidatura feita pelo Levit
      </p>
    </div>
  );
}

function Situacao({ icone, titulo, texto }) {
  return (
    <div className="text-center py-6">
      <span className="material-icons text-[40px] text-primary" aria-hidden="true">{icone}</span>
      <h1 className="text-xl font-bold text-ink mt-2">{titulo}</h1>
      <p className="text-sm text-light-text mt-2">{texto}</p>
    </div>
  );
}

/**
 * Página pública da vaga: o link que a empresa divulga. A pessoa preenche os
 * dados, anexa o currículo e entra na primeira etapa do quadro.
 */
export default function Candidatura() {
  const { id } = useParams();
  const consulta = useQuery({
    queryKey: ['vaga-publica', id],
    queryFn: ({ signal }) => recrutamentoService.getVagaPublica(id, signal),
    retry: false,
    staleTime: Infinity,
  });
  const vaga = consulta.data;

  const [dados, setDados] = useState(CANDIDATO_VAZIO);
  const [curriculo, setCurriculo] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const mudar = (campo, valor) => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = validarCandidato(dados, curriculo);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    setErroGeral('');
    try {
      await recrutamentoService.candidatar(id, dados, curriculo);
      setEnviado(true);
    } catch (err) {
      setErroGeral(mensagemDeErro(err, 'Não foi possível enviar a candidatura. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  };

  if (consulta.isLoading) {
    return (
      <Moldura>
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-64" />
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-11 w-full" />)}
        </div>
      </Moldura>
    );
  }

  if (consulta.isError) {
    return (
      <Moldura>
        <Situacao
          icone="work_off"
          titulo="Vaga indisponível"
          texto="Esta vaga não existe mais ou ainda não está recebendo candidaturas. Confira o link com quem o enviou."
        />
      </Moldura>
    );
  }

  if (enviado) {
    return (
      <Moldura>
        <Situacao
          icone="task_alt"
          titulo="Candidatura enviada"
          texto={`Obrigado, ${dados.nome.trim().split(/\s+/)[0]}. ${vaga.empresa || 'A empresa'} vai analisar e entrar em contato pelo e-mail informado.`}
        />
      </Moldura>
    );
  }

  return (
    <Moldura>
      {vaga.empresa && <p className="text-sm text-light-text">{vaga.empresa}</p>}
      <h1 className="text-2xl font-bold text-ink mt-0.5">{vaga.vaga}</h1>

      <form onSubmit={enviar} noValidate className="mt-7 flex flex-col gap-4">
        {erroGeral && <Alert variant="error">{erroGeral}</Alert>}
        <Input
          label="Nome completo"
          name="nome"
          autoComplete="name"
          value={dados.nome}
          onChange={(e) => mudar('nome', e.target.value)}
          error={erros.nome}
          required
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={dados.email}
          onChange={(e) => mudar('email', e.target.value)}
          error={erros.email}
          required
        />
        <Input
          label="Telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={dados.telefone}
          onChange={(e) => mudar('telefone', mascararTelefone(e.target.value))}
          placeholder="(11) 90000-0000"
          error={erros.telefone}
        />
        <FileInput
          label="Currículo"
          name="curriculo"
          accept={CURRICULO_ACCEPT}
          hint={CURRICULO_DICA}
          value={curriculo}
          onChange={(arquivo) => {
            setCurriculo(arquivo);
            setErros((atual) => ({ ...atual, curriculo: undefined }));
          }}
          error={erros.curriculo}
        />
        <Textarea
          label="Mensagem"
          name="mensagem"
          hint="Opcional"
          value={dados.mensagem}
          onChange={(e) => mudar('mensagem', e.target.value)}
        />
        <Button type="submit" loading={enviando} className="mt-2 justify-center">
          {enviando ? 'Enviando...' : 'Enviar candidatura'}
        </Button>
      </form>
    </Moldura>
  );
}
