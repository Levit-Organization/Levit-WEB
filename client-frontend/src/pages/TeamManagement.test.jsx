import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import { AuthContext } from '../context/authContext';
import TeamManagementContainer from './TeamManagementContainer';
import { equipeService } from '../services/equipeService';
import { cargoService } from '../services/cargoService';
import { moduloService } from '../services/moduloService';

// O Layout (menu, notificações, seletor de equipe) não faz parte do que se testa aqui.
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/equipeService', () => ({
  equipeService: {
    listarMembros: vi.fn(),
    listarConvites: vi.fn(),
    convidarMembro: vi.fn(),
    reenviarConvite: vi.fn(),
    cancelarConvite: vi.fn(),
    removerMembro: vi.fn(),
    atualizarMembro: vi.fn(),
  },
}));
vi.mock('../services/cargoService', () => ({
  cargoService: {
    listarCargos: vi.fn(),
    criarCargo: vi.fn(),
    atualizarCargo: vi.fn(),
    listarNiveisModulo: vi.fn(),
    definirNivelModulo: vi.fn(),
    removerNivelModulo: vi.fn(),
  },
}));
vi.mock('../services/moduloService', () => ({ moduloService: { getAll: vi.fn() } }));

const MEMBROS = [
  { id: 'u1', nome: 'Ana Souza', email: 'ana@acme.com', cargo_id: 'c1', cargo_nome: 'Admin', criado_em: '2026-10-12 10:00:00' },
  { id: 'u2', nome: 'Bruno Lima', email: 'bruno@acme.com', cargo_id: 'c2', cargo_nome: 'Vendas', criado_em: '2026-11-01 09:30:00' },
];
const CARGOS = [
  { id: 'c1', nome: 'Admin', acesso_total: 't', permissoes: '[]', usuarios: 1 },
  {
    id: 'c2',
    nome: 'Vendas',
    acesso_total: 'f',
    permissoes: '["ver_relatorios","exportar_dados","criar_modulos","gerenciar_equipe"]',
    usuarios: 1,
  },
];
const CONVITES = [
  { id: 'v1', email: 'caio@acme.com', cargo_nome: 'Vendas', convidado_por_nome: 'Ana Souza', expira_em: '2099-01-01 10:00:00', expirado: false },
  { id: 'v2', email: 'duda@acme.com', cargo_nome: null, expira_em: '2020-01-01 10:00:00', expirado: true },
];
const MODULOS = [{ id: 'm1', nome: 'Clientes', tipo: 'tabela' }];

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <AuthContext.Provider value={{ usuario: { id: 'u1', nome: 'Ana Souza' } }}>
          <TeamManagementContainer />
        </AuthContext.Provider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

/** Na tela inteira há a tabela (desktop) e os cartões (celular): pega o primeiro. */
const botao = (nome) => screen.getAllByRole('button', { name: nome })[0];

async function esperarCarregar() {
  await screen.findAllByText('bruno@acme.com');
}

describe('TeamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipeService.listarMembros.mockResolvedValue(MEMBROS);
    equipeService.listarConvites.mockResolvedValue(CONVITES);
    cargoService.listarCargos.mockResolvedValue(CARGOS);
    moduloService.getAll.mockResolvedValue(MODULOS);
  });

  it('lista colaboradores com cargo e data de entrada', async () => {
    renderizar();
    await esperarCarregar();

    const tabela = screen.getByRole('table');
    const linhaBruno = within(tabela).getByText('Bruno Lima').closest('tr');
    expect(within(linhaBruno).getByText('bruno@acme.com')).toBeInTheDocument();
    expect(within(linhaBruno).getByText('Vendas')).toBeInTheDocument();
    expect(within(linhaBruno).getByText(/nov\.? de 2026/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Colaboradores/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('mostra os convites pendentes com prazo e quem convidou', async () => {
    renderizar();
    await esperarCarregar();

    expect(screen.getByRole('heading', { name: 'Convites aguardando resposta' })).toBeInTheDocument();
    expect(screen.getByText('caio@acme.com')).toBeInTheDocument();
    expect(screen.getByText('Vendas · convidado por Ana Souza')).toBeInTheDocument();
    expect(screen.getByText(/^Vence em \d+ dias$/)).toBeInTheDocument();
    expect(screen.getByText('Sem cargo')).toBeInTheDocument();
    expect(screen.getByText('Expirado')).toBeInTheDocument();
  });

  it('busca por nome e filtra por cargo', async () => {
    renderizar();
    await esperarCarregar();
    const tabela = screen.getByRole('table');

    await userEvent.type(screen.getByLabelText('Buscar colaborador'), 'bruno');
    expect(within(tabela).queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(within(tabela).getByText('Bruno Lima')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Buscar colaborador'));
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por cargo'), 'c1');
    expect(within(tabela).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(tabela).queryByText('Bruno Lima')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Buscar colaborador'), 'ninguem');
    expect(within(tabela).getByText('Ninguém encontrado com esse filtro')).toBeInTheDocument();
  });

  it('convida uma pessoa com cargo e mensagem', async () => {
    equipeService.convidarMembro.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('button', { name: 'Convidar pessoa' }));
    const painel = screen.getByRole('dialog', { name: 'Convidar para a equipe' });
    await userEvent.type(within(painel).getByLabelText(/E-mail do colaborador/), ' nova@acme.com ');
    await userEvent.selectOptions(within(painel).getByLabelText(/Cargo/), 'c2');
    await userEvent.type(within(painel).getByLabelText(/Mensagem para a pessoa/), 'Bem-vinda!');
    await userEvent.click(within(painel).getByRole('button', { name: 'Enviar convite' }));

    expect(equipeService.convidarMembro).toHaveBeenCalledWith('nova@acme.com', 'c2', 'Bem-vinda!');
    expect(await screen.findByText('Convite enviado para nova@acme.com.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Convidar para a equipe' })).not.toBeInTheDocument());
  });

  it('valida e-mail e cargo antes de convidar', async () => {
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('button', { name: 'Convidar pessoa' }));
    const painel = screen.getByRole('dialog', { name: 'Convidar para a equipe' });
    await userEvent.click(within(painel).getByRole('button', { name: 'Enviar convite' }));
    expect(within(painel).getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(within(painel).getByText('Selecione um cargo para o colaborador.')).toBeInTheDocument();

    await userEvent.type(within(painel).getByLabelText(/E-mail do colaborador/), 'sem-arroba');
    await userEvent.click(within(painel).getByRole('button', { name: 'Enviar convite' }));
    expect(within(painel).getByText('Esse e-mail não parece válido.')).toBeInTheDocument();
    expect(equipeService.convidarMembro).not.toHaveBeenCalled();
  });

  it('erro da API no convite mantém o painel aberto com o que foi digitado', async () => {
    equipeService.convidarMembro.mockRejectedValue({ response: { data: { message: 'Este e-mail já está na equipe.' } } });
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('button', { name: 'Convidar pessoa' }));
    const painel = screen.getByRole('dialog', { name: 'Convidar para a equipe' });
    await userEvent.type(within(painel).getByLabelText(/E-mail do colaborador/), 'ana@acme.com');
    await userEvent.selectOptions(within(painel).getByLabelText(/Cargo/), 'c1');
    await userEvent.click(within(painel).getByRole('button', { name: 'Enviar convite' }));

    expect(await within(painel).findByText('Este e-mail já está na equipe.')).toBeInTheDocument();
    expect(within(painel).getByLabelText(/E-mail do colaborador/)).toHaveValue('ana@acme.com');
  });

  it('reenvia um convite', async () => {
    equipeService.reenviarConvite.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar convite para caio@acme.com' }));
    expect(equipeService.reenviarConvite).toHaveBeenCalledWith('v1');
    expect(await screen.findByText('Convite reenviado para caio@acme.com. O link anterior deixou de funcionar.')).toBeInTheDocument();
  });

  it('cancela um convite depois de confirmar', async () => {
    equipeService.cancelarConvite.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar convite para caio@acme.com' }));
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Cancelar o convite para caio@acme.com?' });
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Cancelar convite' }));

    await waitFor(() => expect(equipeService.cancelarConvite).toHaveBeenCalledWith('v1'));
    expect(await screen.findByText('Convite cancelado.')).toBeInTheDocument();
  });

  it('não cancela o convite se a pessoa desistir', async () => {
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar convite para caio@acme.com' }));
    const confirmacao = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Manter' }));
    await waitFor(() => expect(confirmacao).not.toBeInTheDocument());
    expect(equipeService.cancelarConvite).not.toHaveBeenCalled();
  });

  it('troca o cargo de um colaborador', async () => {
    equipeService.atualizarMembro.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(botao('Editar Bruno Lima'));
    const painel = screen.getByRole('dialog', { name: 'Editar colaborador' });
    expect(within(painel).getByLabelText(/Nome do colaborador/)).toHaveValue('Bruno Lima');
    expect(within(painel).queryByLabelText(/Mensagem para a pessoa/)).not.toBeInTheDocument();
    await userEvent.selectOptions(within(painel).getByLabelText(/Cargo/), 'c1');
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar alterações' }));

    expect(equipeService.atualizarMembro).toHaveBeenCalledWith('u2', {
      nome: 'Bruno Lima',
      email: 'bruno@acme.com',
      mensagem: '',
      cargo_id: 'c1',
    });
    expect(await screen.findByText('Colaborador atualizado.')).toBeInTheDocument();
  });

  it('não deixa a pessoa mudar o próprio cargo', async () => {
    renderizar();
    await esperarCarregar();

    await userEvent.click(botao('Editar Ana Souza'));
    const painel = screen.getByRole('dialog', { name: 'Editar colaborador' });
    expect(within(painel).getByLabelText(/Cargo/)).toBeDisabled();
    expect(within(painel).getByText(/Você não pode mudar o seu próprio cargo/)).toBeInTheDocument();
  });

  it('remove um colaborador depois de confirmar', async () => {
    equipeService.removerMembro.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(botao('Excluir Bruno Lima'));
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Remover Bruno Lima?' });
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(equipeService.removerMembro).toHaveBeenCalledWith('u2'));
    expect(await screen.findByText('Colaborador removido da equipe.')).toBeInTheDocument();
  });

  it('equipe vazia convida a primeira pessoa', async () => {
    equipeService.listarMembros.mockResolvedValue([]);
    equipeService.listarConvites.mockResolvedValue([]);
    renderizar();

    expect(await screen.findAllByText('Só você na equipe')).not.toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Convites aguardando resposta' })).not.toBeInTheDocument();

    const tabela = screen.getByRole('table');
    await userEvent.click(within(tabela).getByRole('button', { name: 'Convidar pessoa' }));
    expect(screen.getByRole('dialog', { name: 'Convidar para a equipe' })).toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro e tenta de novo', async () => {
    equipeService.listarMembros.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Servidor fora do ar.' } } });
    renderizar();

    expect(await screen.findByText('Servidor fora do ar.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findAllByText('bruno@acme.com')).not.toHaveLength(0);
    expect(equipeService.listarMembros).toHaveBeenCalledTimes(2);
  });

  it('aba de cargos mostra acesso total e as permissões resumidas', async () => {
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('tab', { name: /Cargos e permissões/ }));
    const admin = screen.getByRole('heading', { name: 'Admin' }).closest('article');
    expect(within(admin).getByText('Acesso total')).toBeInTheDocument();
    expect(within(admin).getByText('1 pessoa')).toBeInTheDocument();

    const vendas = screen.getByRole('heading', { name: 'Vendas' }).closest('article');
    expect(within(vendas).getByText('ver_relatorios')).toBeInTheDocument();
    expect(within(vendas).getByText('criar_modulos')).toBeInTheDocument();
    expect(within(vendas).queryByText('gerenciar_equipe')).not.toBeInTheDocument();
    expect(within(vendas).getByText('+1')).toHaveAttribute('title', 'gerenciar_equipe');
  });

  it('cria um cargo com permissões', async () => {
    cargoService.criarCargo.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('tab', { name: /Cargos e permissões/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar cargo' }));
    const modal = screen.getByRole('dialog', { name: 'Criar cargo' });

    await userEvent.click(within(modal).getByRole('button', { name: 'Criar cargo' }));
    expect(within(modal).getByText('Informe o nome do cargo.')).toBeInTheDocument();

    await userEvent.type(within(modal).getByLabelText(/Nome do cargo/), ' Financeiro ');
    await userEvent.click(within(modal).getByRole('checkbox', { name: 'ver_relatorios' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Criar cargo' }));

    expect(cargoService.criarCargo).toHaveBeenCalledWith('Financeiro', ['ver_relatorios']);
    expect(await screen.findByText('Cargo criado.')).toBeInTheDocument();
  });

  it('edita um cargo existente', async () => {
    cargoService.atualizarCargo.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('tab', { name: /Cargos e permissões/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Editar cargo Vendas' }));
    const modal = screen.getByRole('dialog', { name: 'Editar cargo' });
    expect(within(modal).getByRole('checkbox', { name: 'exportar_dados' })).toBeChecked();
    await userEvent.click(within(modal).getByRole('checkbox', { name: 'exportar_dados' }));
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));

    expect(cargoService.atualizarCargo).toHaveBeenCalledWith('c2', {
      nome: 'Vendas',
      permissoes: ['ver_relatorios', 'criar_modulos', 'gerenciar_equipe'],
    });
  });

  it('define o acesso por tabela de um cargo', async () => {
    cargoService.listarNiveisModulo.mockResolvedValue([{ modulo_id: 'm1', nivel: 'visualizar' }]);
    cargoService.definirNivelModulo.mockResolvedValue([{ modulo_id: 'm1', nivel: 'editar' }]);
    cargoService.removerNivelModulo.mockResolvedValue({});
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('tab', { name: /Cargos e permissões/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Acesso por tabela do cargo Vendas' }));
    expect(cargoService.listarNiveisModulo).toHaveBeenCalledWith('c2');

    const modal = screen.getByRole('dialog', { name: 'Acesso por tabela' });
    const seletor = within(modal).getByLabelText('Acesso à tabela Clientes');
    await waitFor(() => expect(seletor).toHaveValue('visualizar'));

    await userEvent.selectOptions(seletor, 'editar');
    expect(cargoService.definirNivelModulo).toHaveBeenCalledWith('c2', 'm1', 'editar');
    await waitFor(() => expect(seletor).toHaveValue('editar'));

    await userEvent.selectOptions(seletor, '');
    expect(cargoService.removerNivelModulo).toHaveBeenCalledWith('c2', 'm1');
    await waitFor(() => expect(seletor).toHaveValue(''));
  });

  it('cargo com acesso total não lista tabelas', async () => {
    renderizar();
    await esperarCarregar();

    await userEvent.click(screen.getByRole('tab', { name: /Cargos e permissões/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Acesso por tabela do cargo Admin' }));
    const modal = screen.getByRole('dialog', { name: 'Acesso por tabela' });
    expect(within(modal).getByText(/já enxerga todas as tabelas/)).toBeInTheDocument();
    expect(cargoService.listarNiveisModulo).not.toHaveBeenCalled();
  });
});
