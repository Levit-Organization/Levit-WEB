import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import AutomacaoForm from './AutomacaoForm';
import { automacaoService } from '../services/automacaoService';
import { moduloService } from '../services/moduloService';
import { equipeService } from '../services/equipeService';
import { cargoService } from '../services/cargoService';
import { recrutamentoService } from '../services/recrutamentoService';
import { registroService } from '../services/registroService';

vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/automacaoService', () => ({
  automacaoService: { listar: vi.fn(), listarTodas: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), simular: vi.fn() },
}));
vi.mock('../services/moduloService', () => ({ moduloService: { getAll: vi.fn(), getById: vi.fn() } }));
vi.mock('../services/equipeService', () => ({ equipeService: { listarMembros: vi.fn(), listarPessoas: vi.fn() } }));
vi.mock('../services/cargoService', () => ({ cargoService: { listarCargos: vi.fn() } }));
vi.mock('../services/recrutamentoService', () => ({ recrutamentoService: { getKanbanDaVaga: vi.fn(), getKanban: vi.fn() } }));
vi.mock('../services/registroService', () => ({ registroService: { getAll: vi.fn(), titulos: vi.fn() } }));

const clientes = {
  id: 'm1',
  nome: 'Clientes',
  tipo: 'dados',
  campos: [
    { id: 'c1', nome: 'Nome', tipo: 'texto' },
    { id: 'c2', nome: 'Status', tipo: 'selecao', opcoes: ['Novo', 'Fechado'] },
    { id: 'c3', nome: 'Dono', tipo: 'responsavel' },
  ],
};
const vaga = { id: 'v1', nome: 'Vaga Dev', tipo: 'recrutamento', campos: [] };
const modulos = [clientes, { id: 'm2', nome: 'Contatos', tipo: 'dados', campos: [] }, vaga, { id: 'f1', nome: 'Caixa', tipo: 'financeiro' }];

const salva = {
  id: 'a1',
  nome: 'Avisar fechamento',
  ativo: false,
  gatilhos: ['atualizacao'],
  condicoes: { logica: 'ou', regras: [{ campo: 'c2', operador: 'mudou_para', valor: 'Fechado' }] },
  acoes: [{ tipo: 'webhook', configuracao: JSON.stringify({ url: 'https://exemplo.com/gancho' }) }],
};

function renderizar(caminho = '/automacoes/nova') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <MemoryRouter initialEntries={[caminho]}>
          <Routes>
            <Route path="/automacoes/nova" element={<AutomacaoForm />} />
            <Route path="/automacoes/:moduloId/:id/editar" element={<AutomacaoForm />} />
            <Route path="/automacoes" element={<p>Lista de automações</p>} />
          </Routes>
        </MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const botaoSalvar = () => screen.getByRole('button', { name: 'Salvar automação' });

async function escolherTabela(id) {
  const select = screen.getByLabelText(/Tabela de origem/);
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
  await userEvent.selectOptions(select, id);
}

async function preencherEmail({ destinatario = 'rh@empresa.com' } = {}) {
  if (destinatario) await userEvent.type(screen.getByLabelText(/Destinatário/), destinatario);
  await userEvent.type(screen.getByLabelText(/Assunto/), 'Novo cliente');
  await userEvent.type(screen.getByLabelText(/Modelo de mensagem/), 'Chegou um cliente.');
}

describe('AutomacaoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moduloService.getAll.mockResolvedValue(modulos);
    moduloService.getById.mockImplementation(async (id) => modulos.find((m) => m.id === id));
    automacaoService.criar.mockResolvedValue({ id: 'nova' });
    automacaoService.atualizar.mockResolvedValue({});
    automacaoService.listarTodas.mockResolvedValue([]);
    automacaoService.listar.mockResolvedValue([salva]);
    automacaoService.simular.mockResolvedValue({ registro: null, condicoes: null, passos: [] });
    equipeService.listarMembros.mockResolvedValue([{ id: 'u1', nome: 'Ana', email: 'ana@x.com' }]);
    cargoService.listarCargos.mockResolvedValue([{ id: 'k1', nome: 'Comercial' }]);
    recrutamentoService.getKanbanDaVaga.mockResolvedValue({});
    registroService.getAll.mockResolvedValue([]);
  });

  describe('nova automação', () => {
    it('começa com "Novo item" e uma ação de e-mail; salvar e testar ficam travados', async () => {
      renderizar();
      expect(screen.getByRole('heading', { level: 1, name: 'Nova automação' })).toBeInTheDocument();
      expect(screen.getByTitle('Novo item')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/Destinatário/)).toBeInTheDocument();
      expect(screen.getByText('Opcional. Sem condição, roda sempre.')).toBeInTheDocument();
      expect(botaoSalvar()).toBeDisabled();
      expect(screen.getByRole('button', { name: /Testar/ })).toBeDisabled();

      // O último gatilho não sai.
      await userEvent.click(screen.getByTitle('Novo item'));
      expect(screen.getByTitle('Novo item')).toHaveAttribute('aria-pressed', 'true');
    });

    it('monta e salva uma automação de e-mail', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da automação/), 'Avisar RH');
      await escolherTabela('m1');
      await userEvent.click(screen.getByTitle('Atualização'));
      await preencherEmail();
      await waitFor(() => expect(screen.getByText('Variáveis disponíveis: {{Nome}}, {{Status}}, {{Dono}}')).toBeInTheDocument());

      await userEvent.click(botaoSalvar());

      expect(automacaoService.criar).toHaveBeenCalledWith('m1', {
        nome: 'Avisar RH',
        gatilhos: ['criacao', 'atualizacao'],
        condicoes: null,
        acoes: [{ tipo: 'enviar_email', configuracao: { destinatario: 'rh@empresa.com', assunto: 'Novo cliente', corpo: 'Chegou um cliente.' } }],
        ativo: true,
      });
      expect(await screen.findByText('Lista de automações')).toBeInTheDocument();
      expect(screen.getByText('Automação criada.')).toBeInTheDocument();
    });

    it('e-mail para o responsável do item dispensa o endereço', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da automação/), 'Avisar dono');
      await escolherTabela('m1');
      const chip = await screen.findByRole('button', { name: /Dono do item/ });
      await userEvent.click(chip);

      expect(chip).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByLabelText(/Destinatário/)).not.toBeInTheDocument();
      expect(screen.getByText('Vai para o e-mail da conta da pessoa.')).toBeInTheDocument();

      await preencherEmail({ destinatario: '' });
      await userEvent.click(botaoSalvar());
      expect(automacaoService.criar).toHaveBeenCalledWith('m1', expect.objectContaining({
        acoes: [{ tipo: 'enviar_email', configuracao: { destinatario: '', destinatario_campo_id: 'c3', assunto: 'Novo cliente', corpo: 'Chegou um cliente.' } }],
      }));
    });

    it('condição de mudança liga o gatilho de atualização e vai no payload', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da automação/), 'Status mudou');
      await escolherTabela('m1');
      await userEvent.click(screen.getByRole('switch', { name: 'Usar condições' }));
      await userEvent.selectOptions(screen.getByLabelText(/^Coluna/), 'c2');
      await userEvent.selectOptions(screen.getByLabelText(/^Operador/), 'mudou');

      expect(screen.getByTitle('Atualização')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(/Condições de mudança só valem quando o item é/)).toBeInTheDocument();

      await preencherEmail();
      await userEvent.click(botaoSalvar());
      expect(automacaoService.criar).toHaveBeenCalledWith('m1', expect.objectContaining({
        gatilhos: ['criacao', 'atualizacao'],
        condicoes: { logica: 'e', regras: [{ campo: 'c2', operador: 'mudou', valor: null, valor_de: null }] },
      }));
    });

    it('várias ações: webhook e notificação para um cargo; dá para remover', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da automação/), 'Integrações');
      await escolherTabela('m1');

      await userEvent.click(screen.getAllByTitle('Avisar outro sistema')[0]);
      await userEvent.type(screen.getByLabelText(/Endereço do outro sistema/), 'https://exemplo.com/gancho');

      await userEvent.click(screen.getByTitle('Adicionar outra ação'));
      expect(screen.getByText('3.2')).toBeInTheDocument();
      await userEvent.click(screen.getAllByTitle('Notificação')[1]);
      await userEvent.selectOptions(screen.getByLabelText(/Quem recebe/), 'cargo');
      const cargo = screen.getByLabelText(/^Cargo/);
      await waitFor(() => expect(within(cargo).getByRole('option', { name: 'Comercial' })).toBeInTheDocument());
      await userEvent.selectOptions(cargo, 'k1');
      await userEvent.type(screen.getByLabelText(/^Título/), 'Cliente novo');

      await userEvent.click(screen.getByTitle('Adicionar outra ação'));
      expect(screen.getAllByTitle('Remover ação')).toHaveLength(3);
      await userEvent.click(screen.getAllByTitle('Remover ação')[2]);
      expect(screen.queryByText('3.3')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('switch', { name: 'Ativar ao salvar' }));
      await userEvent.click(botaoSalvar());

      expect(automacaoService.criar).toHaveBeenCalledWith('m1', {
        nome: 'Integrações',
        gatilhos: ['criacao'],
        condicoes: null,
        acoes: [
          { tipo: 'webhook', configuracao: { url: 'https://exemplo.com/gancho' } },
          { tipo: 'notificacao', configuracao: { destinatarios: 'cargo', destino_id: 'k1', titulo: 'Cliente novo', mensagem: '' } },
        ],
        ativo: false,
      });
    });

    it('vaga de recrutamento troca gatilhos e ações para candidatos', async () => {
      renderizar();
      await escolherTabela('v1');

      expect(screen.getByText('Vaga de recrutamento: a automação trabalha com candidatos.')).toBeInTheDocument();
      expect(screen.getByTitle('Novo candidato')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTitle('Mudou de etapa')).toBeInTheDocument();
      expect(screen.queryByTitle('Novo item')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Atualizar coluna')).not.toBeInTheDocument();
      expect(screen.getByText('Para escrever ao candidato, use {{E-mail}}.')).toBeInTheDocument();
    });

    it('trocar de tabela reinicia gatilhos e condições', async () => {
      renderizar();
      await escolherTabela('m1');
      await userEvent.click(screen.getByTitle('Exclusão'));
      await userEvent.click(screen.getByRole('switch', { name: 'Usar condições' }));
      expect(screen.getByLabelText(/^Coluna/)).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByLabelText(/Tabela de origem/), 'm2');
      expect(screen.getByTitle('Exclusão')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTitle('Novo item')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('switch', { name: 'Usar condições' })).toHaveAttribute('aria-checked', 'false');
    });

    it('testar abre a simulação quando a definição está completa', async () => {
      renderizar();
      await escolherTabela('m1');
      await preencherEmail();
      const testar = screen.getByRole('button', { name: /Testar/ });
      expect(testar).toBeEnabled();
      // Ainda sem nome: dá para testar, mas não salvar.
      expect(botaoSalvar()).toBeDisabled();

      await userEvent.click(testar);
      expect(await screen.findByRole('dialog', { name: 'Testar automação' })).toBeInTheDocument();
    });

    it('erros de validação da API aparecem juntos', async () => {
      automacaoService.criar.mockRejectedValue({ response: { data: { errors: { nome: 'Nome repetido.', acoes: 'URL inválida.' } } } });
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da automação/), 'Avisar RH');
      await escolherTabela('m1');
      await preencherEmail();
      await userEvent.click(botaoSalvar());

      expect(await screen.findByText('Nome repetido. | URL inválida.')).toBeInTheDocument();
      expect(screen.queryByText('Lista de automações')).not.toBeInTheDocument();
    });
  });

  describe('editar automação', () => {
    it('carrega a automação salva e atualiza no lugar', async () => {
      renderizar('/automacoes/m1/a1/editar');

      expect(await screen.findByDisplayValue('Avisar fechamento')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Editar automação' })).toBeInTheDocument();
      expect(automacaoService.listar).toHaveBeenCalledWith('m1');
      expect(screen.getByLabelText(/Tabela de origem/)).toBeDisabled();
      expect(screen.getByTitle('Atualização')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTitle('Novo item')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('switch', { name: 'Usar condições' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('switch', { name: 'Ativar ao salvar' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByLabelText(/Endereço do outro sistema/)).toHaveValue('https://exemplo.com/gancho');

      await userEvent.type(screen.getByLabelText(/Nome da automação/), '!');
      await waitFor(() => expect(botaoSalvar()).toBeEnabled());
      await userEvent.click(botaoSalvar());

      expect(automacaoService.atualizar).toHaveBeenCalledWith('m1', 'a1', {
        nome: 'Avisar fechamento!',
        gatilhos: ['atualizacao'],
        condicoes: { logica: 'ou', regras: [{ campo: 'c2', operador: 'mudou_para', valor: 'Fechado', valor_de: null }] },
        acoes: [{ tipo: 'webhook', configuracao: { url: 'https://exemplo.com/gancho' } }],
        ativo: false,
      });
      expect(automacaoService.criar).not.toHaveBeenCalled();
      expect(await screen.findByText('Automação atualizada.')).toBeInTheDocument();
    });

    it('automação que não existe mais avisa', async () => {
      automacaoService.listar.mockResolvedValue([]);
      renderizar('/automacoes/m1/a9/editar');
      expect(await screen.findByText('Automação não encontrada.')).toBeInTheDocument();
    });

    it('falha ao carregar avisa', async () => {
      automacaoService.listar.mockRejectedValue(new Error('rede'));
      renderizar('/automacoes/m1/a1/editar');
      expect(await screen.findByText('Erro ao carregar a automação.')).toBeInTheDocument();
    });
  });
});
