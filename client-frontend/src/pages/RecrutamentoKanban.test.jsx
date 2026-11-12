import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import RecrutamentoKanban from './RecrutamentoKanban';
import { recrutamentoService } from '../services/recrutamentoService';
import { moduloService } from '../services/moduloService';

// O Layout (menu, notificações, seletor de equipe) não faz parte do que se testa aqui.
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/moduloService', () => ({ moduloService: { getAll: vi.fn() } }));
vi.mock('../services/recrutamentoService', () => ({
  recrutamentoService: {
    getKanban: vi.fn(),
    getKanbanDaVaga: vi.fn(),
    moverFaseDaVaga: vi.fn(),
    criarEtapa: vi.fn(),
    adicionarCandidato: vi.fn(),
    baixarCurriculo: vi.fn(),
  },
}));

const VAGAS = [
  { id: 'v1', nome: 'Desenvolvedor Front-end', tipo: 'recrutamento' },
  { id: 'v2', nome: 'Designer', tipo: 'recrutamento' },
  { id: 'm1', nome: 'Clientes', tipo: 'tabela' },
];

const ANA = {
  id: 'k1',
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  telefone: '(11) 98888-7777',
  modulo_id: 'v1',
  criado_em: '2026-11-10 10:00:00',
  tem_curriculo: true,
  curriculo_nome: 'curriculo-ana.pdf',
  mensagem: 'Tenho muito interesse na vaga.',
};
const BRUNO = { id: 'k2', nome: 'Bruno Lima', email: 'bruno@exemplo.com', modulo_id: 'v1', criado_em: '2026-11-11 10:00:00' };

const funil = () => ({
  f1: { fase: 'Triagem', candidatos: [ANA, BRUNO], total: 2 },
  f2: { fase: 'Entrevista', candidatos: [], total: 0 },
  f3: { fase: 'Proposta', candidatos: [], total: 0 },
});

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <MemoryRouter>
          <RecrutamentoKanban />
        </MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const etapa = (nome) => screen.getByRole('region', { name: `Etapa ${nome}` });

async function esperarQuadro() {
  await screen.findByRole('region', { name: 'Etapa Triagem' });
}

describe('RecrutamentoKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moduloService.getAll.mockResolvedValue(VAGAS);
    recrutamentoService.getKanbanDaVaga.mockImplementation(async () => funil());
    recrutamentoService.getKanban.mockResolvedValue({});
  });

  it('mostra o funil da primeira vaga com os candidatos em cada etapa', async () => {
    renderizar();
    await esperarQuadro();

    expect(recrutamentoService.getKanbanDaVaga).toHaveBeenCalledWith('v1', expect.anything());
    expect(screen.getByText(/^2 candidatos no quadro/)).toBeInTheDocument();
    expect(within(etapa('Triagem')).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(etapa('Triagem')).getByText('Bruno Lima')).toBeInTheDocument();
    expect(within(etapa('Entrevista')).getByText('Arraste um candidato para cá')).toBeInTheDocument();
    expect(screen.getByLabelText('Vaga')).toHaveValue('v1');
    // Só vagas de recrutamento entram no seletor.
    expect(within(screen.getByLabelText('Vaga')).queryByText('Clientes')).not.toBeInTheDocument();
  });

  it('troca de vaga e busca o funil dela', async () => {
    renderizar();
    await esperarQuadro();

    await userEvent.selectOptions(screen.getByLabelText('Vaga'), 'v2');
    await waitFor(() => expect(recrutamentoService.getKanbanDaVaga).toHaveBeenCalledWith('v2', expect.anything()));
    expect(screen.getByLabelText('Vaga')).toHaveValue('v2');
  });

  it('busca candidatos pelo nome, sem ligar para acento', async () => {
    renderizar();
    await esperarQuadro();

    await userEvent.type(screen.getByLabelText('Buscar candidato pelo nome nesta vaga'), 'ána');
    expect(screen.getByRole('status')).toHaveTextContent('1 candidato encontrado');
    expect(within(etapa('Triagem')).queryByText('Bruno Lima')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Buscar candidato pelo nome nesta vaga'));
    await userEvent.type(screen.getByLabelText('Buscar candidato pelo nome nesta vaga'), 'zzz');
    expect(screen.getByText('Ninguém com “zzz” nesta vaga.')).toBeInTheDocument();
  });

  it('move o candidato de etapa pelo seletor do cartão', async () => {
    recrutamentoService.moverFaseDaVaga.mockResolvedValue({});
    renderizar();
    await esperarQuadro();

    await userEvent.selectOptions(screen.getByLabelText('Etapa de Ana Souza'), 'f2');

    await waitFor(() => expect(recrutamentoService.moverFaseDaVaga).toHaveBeenCalledWith('v1', 'k1', 'f2'));
    await waitFor(() => expect(within(etapa('Entrevista')).getByText('Ana Souza')).toBeInTheDocument());
    expect(within(etapa('Triagem')).queryByText('Ana Souza')).not.toBeInTheDocument();
  });

  it('se a API recusar a mudança, o cartão volta e aparece o erro', async () => {
    recrutamentoService.moverFaseDaVaga.mockRejectedValue({ response: { data: { message: 'Etapa bloqueada.' } } });
    renderizar();
    await esperarQuadro();

    await userEvent.selectOptions(screen.getByLabelText('Etapa de Ana Souza'), 'f3');

    expect(await screen.findByText('Etapa bloqueada.')).toBeInTheDocument();
    await waitFor(() => expect(within(etapa('Triagem')).getByText('Ana Souza')).toBeInTheDocument());
    expect(within(etapa('Proposta')).queryByText('Ana Souza')).not.toBeInTheDocument();
  });

  it('arrasta o candidato para outra etapa', async () => {
    recrutamentoService.moverFaseDaVaga.mockResolvedValue({});
    renderizar();
    await esperarQuadro();

    const cartao = within(etapa('Triagem')).getByText('Bruno Lima').closest('[draggable]');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(cartao, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'k2');
    fireEvent.dragOver(etapa('Proposta'), { dataTransfer });
    fireEvent.drop(etapa('Proposta'), { dataTransfer });
    fireEvent.dragEnd(cartao, { dataTransfer });

    await waitFor(() => expect(recrutamentoService.moverFaseDaVaga).toHaveBeenCalledWith('v1', 'k2', 'f3'));
    await waitFor(() => expect(within(etapa('Proposta')).getByText('Bruno Lima')).toBeInTheDocument());
  });

  it('soltar na mesma etapa não chama a API', async () => {
    renderizar();
    await esperarQuadro();

    const cartao = within(etapa('Triagem')).getByText('Bruno Lima').closest('[draggable]');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(cartao, { dataTransfer });
    fireEvent.drop(etapa('Triagem'), { dataTransfer });
    fireEvent.dragEnd(cartao, { dataTransfer });

    expect(recrutamentoService.moverFaseDaVaga).not.toHaveBeenCalled();
  });

  it('abre o perfil do candidato com contato, currículo e mensagem', async () => {
    recrutamentoService.baixarCurriculo.mockResolvedValue();
    renderizar();
    await esperarQuadro();

    await userEvent.click(within(etapa('Triagem')).getByRole('button', { name: /Ana Souza/ }));
    const perfil = screen.getByRole('dialog', { name: 'Ana Souza' });

    expect(within(perfil).getByText('Desenvolvedor Front-end')).toBeInTheDocument();
    expect(within(perfil).getByText('Triagem', { selector: 'span' })).toBeInTheDocument();
    expect(within(perfil).getByLabelText('Etapa do quadro')).toHaveValue('f1');
    expect(within(perfil).getByRole('link', { name: 'ana@exemplo.com' })).toHaveAttribute('href', 'mailto:ana@exemplo.com');
    expect(within(perfil).getByRole('link', { name: '(11) 98888-7777' })).toHaveAttribute('href', 'tel:11988887777');
    expect(within(perfil).getByText('curriculo-ana.pdf')).toBeInTheDocument();
    expect(within(perfil).getByText('Tenho muito interesse na vaga.')).toBeInTheDocument();
    expect(within(perfil).getByRole('button', { name: 'Enviar e-mail' })).toBeInTheDocument();

    await userEvent.click(within(perfil).getByRole('button', { name: 'Baixar' }));
    expect(recrutamentoService.baixarCurriculo).toHaveBeenCalledWith('v1', ANA);
  });

  it('perfil sem dados opcionais mostra o que falta', async () => {
    renderizar();
    await esperarQuadro();

    await userEvent.click(within(etapa('Triagem')).getByRole('button', { name: /Bruno Lima/ }));
    const perfil = screen.getByRole('dialog', { name: 'Bruno Lima' });
    expect(within(perfil).getByText('Não informado')).toBeInTheDocument();
    expect(within(perfil).getByText('Não enviado')).toBeInTheDocument();
    expect(within(perfil).queryByText('Mensagem do candidato')).not.toBeInTheDocument();
  });

  it('move o candidato pelo perfil e o perfil acompanha a etapa nova', async () => {
    recrutamentoService.moverFaseDaVaga.mockResolvedValue({});
    renderizar();
    await esperarQuadro();

    await userEvent.click(within(etapa('Triagem')).getByRole('button', { name: /Ana Souza/ }));
    const perfil = screen.getByRole('dialog', { name: 'Ana Souza' });
    await userEvent.selectOptions(within(perfil).getByLabelText('Etapa do quadro'), 'f2');

    await waitFor(() => expect(recrutamentoService.moverFaseDaVaga).toHaveBeenCalledWith('v1', 'k1', 'f2'));
    await waitFor(() => expect(within(perfil).getByLabelText('Etapa do quadro')).toHaveValue('f2'));
  });

  it('erro ao baixar o currículo vira aviso', async () => {
    recrutamentoService.baixarCurriculo.mockRejectedValue({});
    renderizar();
    await esperarQuadro();

    await userEvent.click(within(etapa('Triagem')).getByRole('button', { name: /Ana Souza/ }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Ana Souza' })).getByRole('button', { name: 'Baixar' }));
    expect(await screen.findByText('Não foi possível baixar o currículo.')).toBeInTheDocument();
  });

  it('cria uma etapa na vaga aberta', async () => {
    recrutamentoService.criarEtapa.mockResolvedValue({});
    renderizar();
    await esperarQuadro();

    await userEvent.click(screen.getByRole('button', { name: 'Nova etapa' }));
    const modal = screen.getByRole('dialog', { name: 'Nova etapa' });
    expect(within(modal).getByRole('button', { name: 'Criar etapa' })).toBeDisabled();
    await userEvent.type(within(modal).getByLabelText(/Nome da etapa/), 'Entrevista técnica');
    await userEvent.click(within(modal).getByRole('button', { name: 'Criar etapa' }));

    expect(recrutamentoService.criarEtapa).toHaveBeenCalledWith('v1', 'Entrevista técnica');
    expect(await screen.findByText('Etapa criada com sucesso.')).toBeInTheDocument();
  });

  it('adiciona um candidato validando os campos', async () => {
    recrutamentoService.adicionarCandidato.mockResolvedValue({});
    renderizar();
    await esperarQuadro();

    await userEvent.click(screen.getByRole('button', { name: 'Novo candidato' }));
    const painel = screen.getByRole('dialog', { name: 'Novo candidato' });
    await userEvent.click(within(painel).getByRole('button', { name: 'Adicionar candidato' }));
    expect(within(painel).getByText('Escreva o nome completo.')).toBeInTheDocument();
    expect(within(painel).getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(recrutamentoService.adicionarCandidato).not.toHaveBeenCalled();

    await userEvent.type(within(painel).getByLabelText(/^Nome/), 'Carla Dias');
    await userEvent.type(within(painel).getByLabelText(/^E-mail/), 'carla@exemplo.com');
    await userEvent.type(within(painel).getByLabelText(/^Telefone/), '11977776666');
    expect(within(painel).getByLabelText(/^Telefone/)).toHaveValue('(11) 97777-6666');
    await userEvent.click(within(painel).getByRole('button', { name: 'Adicionar candidato' }));

    expect(recrutamentoService.adicionarCandidato).toHaveBeenCalledWith(
      'v1',
      { nome: 'Carla Dias', email: 'carla@exemplo.com', telefone: '(11) 97777-6666', mensagem: '', modulo_id: 'v1' },
      null
    );
    expect(await screen.findByText('Candidato adicionado com sucesso.')).toBeInTheDocument();
  });

  it('erro da API ao adicionar candidato aparece no painel', async () => {
    recrutamentoService.adicionarCandidato.mockRejectedValue({ response: { data: { message: 'E-mail já cadastrado nesta vaga.' } } });
    renderizar();
    await esperarQuadro();

    await userEvent.click(screen.getByRole('button', { name: 'Novo candidato' }));
    const painel = screen.getByRole('dialog', { name: 'Novo candidato' });
    await userEvent.type(within(painel).getByLabelText(/^Nome/), 'Carla Dias');
    await userEvent.type(within(painel).getByLabelText(/^E-mail/), 'carla@exemplo.com');
    await userEvent.click(within(painel).getByRole('button', { name: 'Adicionar candidato' }));
    expect(await within(painel).findByText('E-mail já cadastrado nesta vaga.')).toBeInTheDocument();
  });

  it('copia o link de candidatura da vaga', async () => {
    renderizar();
    await esperarQuadro();
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    await user.click(screen.getByRole('button', { name: 'Copiar link de candidatura' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/vagas/v1`);
    expect(await screen.findByText('Link copiado. Quem abrir pode se candidatar a esta vaga.')).toBeInTheDocument();
  });

  it('sem vagas, convida a criar a primeira e desabilita as ações', async () => {
    moduloService.getAll.mockResolvedValue([{ id: 'm1', nome: 'Clientes', tipo: 'tabela' }]);
    renderizar();

    expect(await screen.findByText('Nenhuma vaga criada', { selector: 'h2,h3,p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Criar vaga/ })).toHaveAttribute('href', '/modulos/novo');
    expect(screen.getByRole('button', { name: 'Nova etapa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Novo candidato' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Copiar link de candidatura' })).not.toBeInTheDocument();
    expect(recrutamentoService.getKanban).toHaveBeenCalled();
    expect(recrutamentoService.getKanbanDaVaga).not.toHaveBeenCalled();
  });

  it('vaga sem etapas oferece criar a primeira', async () => {
    recrutamentoService.getKanbanDaVaga.mockResolvedValue({});
    renderizar();

    expect(await screen.findByText('Nenhuma etapa configurada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar primeira etapa' }));
    expect(screen.getByRole('dialog', { name: 'Nova etapa' })).toBeInTheDocument();
  });

  it('falha ao carregar o quadro mostra o erro e tenta de novo', async () => {
    recrutamentoService.getKanbanDaVaga.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Servidor fora do ar.' } } });
    renderizar();

    expect(await screen.findByText('Não foi possível carregar o quadro')).toBeInTheDocument();
    expect(screen.getByText('Servidor fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await esperarQuadro();
  });

  it('sem permissão na vaga, explica e não oferece tentar de novo', async () => {
    recrutamentoService.getKanbanDaVaga.mockRejectedValue({ response: { status: 403 } });
    renderizar();

    expect(await screen.findByText('Sem acesso a este quadro')).toBeInTheDocument();
    expect(screen.getByText('Seu cargo não tem permissão para ver esta vaga.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
});
