import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import { AuthContext } from '../context/authContext';
import { queryClient as queryClientGlobal } from '../lib/queryClient';
import Dashboard from './Dashboard';
import { moduloService } from '../services/moduloService';
import { equipeService } from '../services/equipeService';
import { automacaoService } from '../services/automacaoService';
import { prazoService } from '../services/prazoService';
import { recrutamentoService } from '../services/recrutamentoService';

// O Layout (menu, notificações, seletor de equipe) não faz parte do que se testa aqui.
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/moduloService', () => ({ moduloService: { getAll: vi.fn() } }));
vi.mock('../services/equipeService', () => ({
  equipeService: { listarMembros: vi.fn(), listarConvites: vi.fn() },
}));
vi.mock('../services/automacaoService', () => ({ automacaoService: { listarTodas: vi.fn(), listar: vi.fn() } }));
vi.mock('../services/prazoService', () => ({ prazoService: { listar: vi.fn() } }));
vi.mock('../services/recrutamentoService', () => ({
  recrutamentoService: { getKanban: vi.fn(), getKanbanDaVaga: vi.fn() },
}));

const MODULOS = [
  { id: 'm1', nome: 'Clientes', tipo: 'dados', icone: 'group', total_registros: 3 },
  { id: 'm2', nome: 'Caixa', tipo: 'financeiro', icone: 'payments', total_registros: 10 },
  { id: 'm3', nome: 'Tarefas', tipo: 'dados', total_registros: 1 },
  { id: 'v1', nome: 'Vaga antiga', tipo: 'recrutamento' },
  { id: 'v2', nome: 'Vaga de designer', tipo: 'recrutamento' },
];

const MEMBROS = [
  { id: 'u1', nome: 'Ana Souza' },
  { id: 'u2', nome: 'Bruno Lima' },
];

const CONVITES = [
  { id: 'c1', email: 'a@acme.com', expirado: true },
  { id: 'c2', email: 'b@acme.com', expirado: false },
  { id: 'c3', email: 'c@acme.com', expirado: false },
];

const AUTOMACOES = [
  { id: 'a1', nome: 'Aviso de prazo', ativo: true, estatisticas: { execucoes_7d: 4, falhas_7d: 1 } },
  { id: 'a2', nome: 'Boas-vindas', ativo: true, estatisticas: { execucoes_7d: 1, falhas_7d: 0 } },
  { id: 'a3', nome: 'Cobrança', ativo: false, pausada_por_falhas_em: '2026-11-01 10:00:00', estatisticas: { falhas_7d: 2 } },
];

const PRAZOS = {
  atrasados: [
    { registro_id: 'r1', modulo_id: 'm1', modulo_nome: 'Clientes', coluna_prazo: 'Prazo', titulo: 'Guia DAS', prazo: '2020-01-01', meu: true },
    { registro_id: 'r2', modulo_id: 'm3', modulo_nome: 'Tarefas', coluna_prazo: 'Prazo', titulo: 'Relatório', prazo: '2020-01-02', meu: false },
  ],
  hoje: [],
  proximos: [],
};

const antigo = '2020-01-01T10:00:00';
const recente = new Date().toISOString();
const KANBAN = {
  f1: { fase: 'Inscritos', candidatos: [{ id: 'k1', criado_em: antigo }, { id: 'k2', criado_em: recente }] },
  f2: { fase: 'Entrevista', candidatos: [{ id: 'k3', atualizado_em: recente }] },
  f3: { fase: 'Contratados', candidatos: [] },
};

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <AuthContext.Provider value={{ usuario: { id: 'u1', nome: 'Ana Souza' }, primeiroNome: 'Ana', empresa: { id: 'e1', nome: 'Acme' } }}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </AuthContext.Provider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const secaoAtencao = () => screen.getByRole('heading', { name: 'Precisa da sua atenção' }).closest('div').parentElement;
const cartaoDe = (titulo) => screen.getByRole('heading', { name: titulo }).closest('div').parentElement;

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClientGlobal.clear();
    moduloService.getAll.mockResolvedValue(MODULOS);
    equipeService.listarMembros.mockResolvedValue(MEMBROS);
    equipeService.listarConvites.mockResolvedValue(CONVITES);
    automacaoService.listarTodas.mockResolvedValue(AUTOMACOES);
    prazoService.listar.mockResolvedValue(PRAZOS);
    recrutamentoService.getKanbanDaVaga.mockResolvedValue(KANBAN);
  });

  it('saúda pelo primeiro nome e mostra a empresa', async () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeInTheDocument();
    expect(screen.getByText(/ · Acme$/)).toBeInTheDocument();
    await screen.findByText('Clientes');
  });

  it('resume tabelas, automações e equipe nos indicadores', async () => {
    renderizar();
    const resumo = screen.getByRole('region', { name: 'Resumo' });

    expect(await within(resumo).findByText('Tabelas')).toBeInTheDocument();
    expect(within(resumo).getByText('3')).toBeInTheDocument();
    expect(within(resumo).getByText('14 itens guardados')).toBeInTheDocument();

    expect(await within(resumo).findByText('Automações ligadas')).toBeInTheDocument();
    expect(within(resumo).getByText('5 execuções nesta semana')).toBeInTheDocument();
    expect(within(resumo).getByText('3 falhas')).toBeInTheDocument();

    expect(await within(resumo).findByText('Pessoas na equipe')).toBeInTheDocument();
  });

  it('lista o que precisa de atenção em ordem de urgência, com links', async () => {
    renderizar();
    await screen.findByText('2 itens atrasados');
    await screen.findByText('Automação pausada: Cobrança');
    await screen.findByText('1 candidato parado há mais de 14 dias');
    await screen.findByText('1 convite venceu sem resposta');

    const links = within(secaoAtencao()).getAllByRole('link');
    expect(links.map((l) => l.querySelector('.font-semibold').textContent)).toEqual([
      '2 itens atrasados',
      'Automação pausada: Cobrança',
      '1 candidato parado há mais de 14 dias',
      '1 convite venceu sem resposta',
      '2 convites aguardando resposta',
    ]);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/modulos/m1/registros',
      '/automacoes',
      '/recrutamento',
      '/team',
      '/team',
    ]);
    expect(within(secaoAtencao()).getByText('1 está com você. Veja em Prazos.')).toBeInTheDocument();
    expect(within(secaoAtencao()).getByText('Em Vaga de designer.')).toBeInTheDocument();
    expect(within(secaoAtencao()).getByText('Reenvie para a pessoa receber um link novo.')).toBeInTheDocument();
  });

  it('mostra os prazos atrasados no painel de prazos', async () => {
    renderizar();
    expect(await screen.findByText('Guia DAS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prazos' })).toBeInTheDocument();
  });

  it('lista as tabelas com destino por tipo e contagem de itens', async () => {
    renderizar();
    const clientes = (await screen.findByRole('heading', { name: 'Clientes' })).closest('a');
    expect(clientes).toHaveAttribute('href', '/modulos/m1/registros');
    expect(within(clientes).getByText('3 itens')).toBeInTheDocument();

    const caixa = screen.getByRole('heading', { name: 'Caixa' }).closest('a');
    expect(caixa).toHaveAttribute('href', '/modulos/m2/financeiro');
    expect(within(caixa).getByText('Entradas e saídas')).toBeInTheDocument();

    const tarefas = screen.getByRole('heading', { name: 'Tarefas' }).closest('a');
    expect(within(tarefas).getByText('1 item')).toBeInTheDocument();

    // Vagas não aparecem entre as tabelas.
    expect(screen.queryByRole('heading', { name: 'Vaga antiga' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nova tabela/ })).toHaveAttribute('href', '/modulos/novo');
    expect(screen.queryByText(/Ver todas as/)).not.toBeInTheDocument();
  });

  it('mostra só seis tabelas e um link para ver todas', async () => {
    moduloService.getAll.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, nome: `Tabela ${i}`, tipo: 'dados', total_registros: 0 }))
    );
    renderizar();
    await screen.findByRole('heading', { name: 'Tabela 0' });
    expect(screen.getByRole('heading', { name: 'Tabela 5' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tabela 6' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas as 8 tabelas' })).toHaveAttribute('href', '/modulos');
  });

  it('resume a última vaga aberta com candidatos por etapa', async () => {
    renderizar();
    const cartao = cartaoDe('Recrutamento');
    expect(await within(cartao).findByText('Vaga de designer')).toBeInTheDocument();
    expect(recrutamentoService.getKanbanDaVaga).toHaveBeenCalledWith('v2', expect.anything());
    expect(cartao).toHaveTextContent('Vaga de designer · 3 candidatos · 2 vagas abertas');
    expect(within(cartao).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Inscritos: 2',
      'Entrevista: 1',
      'Contratados: 0',
    ]);
    expect(within(cartao).getByRole('link', { name: 'Abrir quadro' })).toHaveAttribute('href', '/recrutamento');
  });

  it('resume a equipe', async () => {
    renderizar();
    const cartao = cartaoDe('Equipe');
    expect(await within(cartao).findByText('2 pessoas')).toBeInTheDocument();
    expect(within(cartao).getByRole('link', { name: 'Ver equipe' })).toHaveAttribute('href', '/team');
  });

  it('mostra os estados vazios quando ainda não há nada', async () => {
    moduloService.getAll.mockResolvedValue([]);
    equipeService.listarMembros.mockResolvedValue([MEMBROS[0]]);
    equipeService.listarConvites.mockResolvedValue([]);
    automacaoService.listarTodas.mockResolvedValue([]);
    prazoService.listar.mockResolvedValue({ atrasados: [], hoje: [], proximos: [] });
    renderizar();

    expect(await screen.findByText('Comece pela primeira tabela')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tarefas da equipe/ })).toHaveAttribute('href', '/modulos/novo');
    expect(screen.getByRole('link', { name: /Obrigações dos clientes/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Estoque/ })).not.toBeInTheDocument();

    expect(await screen.findByText('Tudo em dia')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma vaga aberta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir vaga' })).toBeInTheDocument();
    expect(await screen.findByText('Só você por aqui. Convide quem trabalha com você.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Convidar/ })).toHaveAttribute('href', '/team');
    expect(recrutamentoService.getKanbanDaVaga).not.toHaveBeenCalled();

    const resumo = screen.getByRole('region', { name: 'Resumo' });
    expect(within(resumo).getByText('0 itens guardados')).toBeInTheDocument();
    expect(within(resumo).getByText('Tabelas')).toBeInTheDocument();
    expect(await within(resumo).findByText('Pessoa na equipe')).toBeInTheDocument();
    expect(within(resumo).getByText('0 execuções nesta semana')).toBeInTheDocument();
  });

  it('mostra erro ao carregar as tabelas e tenta de novo', async () => {
    moduloService.getAll.mockRejectedValue({ response: { status: 500, data: { message: 'Servidor fora do ar.' } } });
    renderizar();

    expect(await screen.findByText('Servidor fora do ar.')).toBeInTheDocument();
    moduloService.getAll.mockResolvedValue(MODULOS);
    await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
  });

  it('avisa quando o cargo não tem acesso à equipe nem à vaga', async () => {
    equipeService.listarMembros.mockRejectedValue({ response: { status: 403 } });
    recrutamentoService.getKanbanDaVaga.mockRejectedValue({ response: { status: 403 } });
    renderizar();

    expect(await screen.findByText('Seu cargo não tem acesso à lista da equipe.')).toBeInTheDocument();
    expect(await screen.findByText('Seu cargo não tem acesso a esta vaga.')).toBeInTheDocument();
  });
});
