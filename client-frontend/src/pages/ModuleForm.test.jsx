import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import ModuleForm from './ModuleForm';
import { moduloService } from '../services/moduloService';

vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/moduloService', () => ({
  moduloService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addField: vi.fn(),
    updateField: vi.fn(),
    deleteField: vi.fn(),
    reorderFields: vi.fn(),
  },
}));

const outrasTabelas = [
  { id: 'm1', nome: 'Clientes', tipo: 'dados' },
  { id: 'm2', nome: 'Contatos', tipo: 'dados' },
  { id: 'v1', nome: 'Vaga Dev', tipo: 'recrutamento' },
];

const existente = {
  id: 'm1',
  nome: 'Clientes',
  icone: 'group',
  tipo: 'dados',
  campos: [
    { id: 'c1', nome: 'Nome', tipo: 'texto', opcoes: null },
    { id: 'c2', nome: 'Status', tipo: 'selecao', opcoes: ['Novo', 'Fechado'] },
    { id: 'c3', nome: 'Contato', tipo: 'vinculo', opcoes: { multiplo: true }, modulo_vinculado_id: 'm2', modulo_vinculado: { nome: 'Contatos' } },
  ],
};

function renderizar(caminho = '/modulos/novo') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <MemoryRouter initialEntries={[caminho]}>
          <Routes>
            <Route path="/modulos/novo" element={<ModuleForm />} />
            <Route path="/modulos/:id/editar" element={<ModuleForm />} />
            <Route path="/modulos" element={<p>Lista de tabelas</p>} />
          </Routes>
        </MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const nomesDasColunas = () => screen.queryAllByPlaceholderText('Nome da coluna');
const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar tabela' }));

async function adicionarColuna(nome) {
  await userEvent.click(screen.getByRole('button', { name: 'Coluna' }));
  const campos = nomesDasColunas();
  await userEvent.type(campos[campos.length - 1], nome);
}

describe('ModuleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moduloService.getAll.mockResolvedValue(outrasTabelas);
    moduloService.getById.mockResolvedValue(existente);
    moduloService.create.mockResolvedValue({ id: 'novo' });
    moduloService.update.mockResolvedValue({});
    moduloService.addField.mockResolvedValue({});
    moduloService.updateField.mockResolvedValue({});
    moduloService.deleteField.mockResolvedValue({});
    moduloService.reorderFields.mockResolvedValue({});
  });

  describe('nova tabela', () => {
    it('começa vazia, com modelos e o convite para a primeira coluna', () => {
      renderizar();
      expect(screen.getByRole('heading', { level: 1, name: 'Nova tabela' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Comece por um modelo' })).toBeInTheDocument();
      expect(screen.getByText('Nenhuma coluna ainda')).toBeInTheDocument();
      expect(screen.getByLabelText(/Nome da tabela/)).toHaveValue('');
      expect(screen.getByLabelText('O que você quer organizar?')).toHaveValue('dados');
    });

    it('monta colunas (com opções de lista), reordena, remove e cria a tabela', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da tabela/), 'Pedidos');

      await userEvent.click(screen.getByRole('button', { name: /Adicionar primeira coluna/ }));
      await userEvent.type(nomesDasColunas()[0], 'Cliente');
      await adicionarColuna('Status');
      await adicionarColuna('Rascunho');
      expect(screen.getAllByText('Novo')).toHaveLength(3);

      // Status vira lista de opções.
      await userEvent.selectOptions(screen.getAllByDisplayValue('Texto')[1], 'selecao');
      expect(screen.getByText('Opções da lista')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: '+ Adicionar opção' }));
      await userEvent.click(screen.getByRole('button', { name: '+ Adicionar opção' }));
      await userEvent.click(screen.getByRole('button', { name: '+ Adicionar opção' }));
      await userEvent.type(screen.getByPlaceholderText('Opção 1'), 'Aberto');
      await userEvent.type(screen.getByPlaceholderText('Opção 2'), 'Lixo');
      await userEvent.type(screen.getByPlaceholderText('Opção 3'), 'Pago');
      await userEvent.click(within(screen.getByPlaceholderText('Opção 2').parentElement).getByRole('button'));

      // Status sobe para o topo; Rascunho sai.
      await userEvent.click(screen.getAllByTitle('Mover para cima')[1]);
      expect(nomesDasColunas().map((c) => c.value)).toEqual(['Status', 'Cliente', 'Rascunho']);
      expect(screen.getAllByTitle('Mover para cima')[0]).toBeDisabled();
      expect(screen.getAllByTitle('Mover para baixo')[2]).toBeDisabled();
      await userEvent.click(screen.getAllByTitle('Remover coluna')[2]);
      expect(nomesDasColunas()).toHaveLength(2);

      await salvar();

      expect(moduloService.create).toHaveBeenCalledWith({
        nome: 'Pedidos',
        icone: 'extension',
        tipo: 'dados',
        campos: [
          { nome: 'Status', tipo: 'selecao', opcoes: ['Aberto', 'Pago'] },
          { nome: 'Cliente', tipo: 'texto' },
        ],
      });
      expect(await screen.findByText('Lista de tabelas')).toBeInTheDocument();
      expect(moduloService.getAll).toHaveBeenCalled();
      expect(moduloService.reorderFields).not.toHaveBeenCalled();
      expect(screen.getByText('Tabela criada.')).toBeInTheDocument();
    });

    it('coluna de ligação escolhe a tabela de destino e se aceita vários itens', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da tabela/), 'Pedidos');
      await adicionarColuna('Cliente');
      await userEvent.selectOptions(screen.getByDisplayValue('Texto'), 'vinculo');

      const destino = screen.getByLabelText(/Liga à tabela/);
      // Só tabelas de lista entram como destino.
      await waitFor(() => expect(within(destino).getAllByRole('option')).toHaveLength(3));
      expect(within(destino).queryByRole('option', { name: 'Vaga Dev' })).not.toBeInTheDocument();
      await userEvent.selectOptions(destino, 'm1');
      await userEvent.click(screen.getByRole('checkbox', { name: /vários itens/ }));
      await salvar();

      expect(moduloService.create).toHaveBeenCalledWith({
        nome: 'Pedidos',
        icone: 'extension',
        tipo: 'dados',
        campos: [{ nome: 'Cliente', tipo: 'vinculo', modulo_vinculado_id: 'm1', opcoes: { multiplo: true } }],
      });
    });

    it('aplica um modelo; trocar depois de editar pede confirmação', async () => {
      renderizar();
      const modelo = screen.getByRole('button', { name: /Obrigações dos clientes/ });
      await userEvent.click(modelo);

      expect(modelo).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/Nome da tabela/)).toHaveValue('Obrigações dos clientes');
      expect(nomesDasColunas().map((c) => c.value)).toEqual([
        'Cliente', 'Obrigação', 'Competência', 'Responsável', 'Vencimento', 'Repete', 'Status',
      ]);

      // Sem editar nada, trocar de modelo não pergunta.
      await userEvent.click(screen.getByRole('button', { name: /Carteira de clientes/ }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Nome da tabela/)).toHaveValue('Carteira de clientes');

      await userEvent.type(screen.getByLabelText(/Nome da tabela/), ' 2026');
      await userEvent.click(screen.getByRole('button', { name: /Obrigações dos clientes/ }));
      const dialogo = screen.getByRole('alertdialog', { name: 'Usar o modelo "Obrigações dos clientes"?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Manter o que fiz' }));
      expect(screen.getByLabelText(/Nome da tabela/)).toHaveValue('Carteira de clientes 2026');
    });

    it('troca o ícone pelo seletor', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da tabela/), 'Loja');
      await userEvent.click(screen.getByRole('button', { name: /Alterar ícone/ }));
      await userEvent.click(screen.getByTitle('star'));
      expect(screen.queryByTitle('star')).not.toBeInTheDocument();
      await salvar();
      expect(moduloService.create).toHaveBeenCalledWith(expect.objectContaining({ icone: 'star' }));
    });

    it('vaga de recrutamento exige pelo menos uma etapa', async () => {
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da tabela/), 'Vaga Design');
      await userEvent.selectOptions(screen.getByLabelText('O que você quer organizar?'), 'recrutamento');

      expect(screen.getByRole('heading', { name: 'Etapas do quadro' })).toBeInTheDocument();
      expect(screen.getByText('Adicione pelo menos uma etapa para criar a vaga.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar tabela' })).toBeDisabled();

      await userEvent.type(screen.getByPlaceholderText('Ex: Triagem'), 'Triagem');
      await userEvent.click(screen.getByRole('button', { name: /^add\s*Etapa$/ }));
      await userEvent.click(screen.getByRole('button', { name: /^add\s*Etapa$/ }));
      await userEvent.type(screen.getAllByPlaceholderText('Ex: Entrevista')[1], 'Proposta');
      await userEvent.click(screen.getAllByTitle('Remover etapa')[0]);
      await salvar();

      expect(moduloService.create).toHaveBeenCalledWith({
        nome: 'Vaga Design',
        icone: 'extension',
        tipo: 'recrutamento',
        campos: [],
        fases: ['Proposta'],
      });
    });

    it('financeiro e arquivos não pedem colunas', async () => {
      renderizar();
      await userEvent.selectOptions(screen.getByLabelText('O que você quer organizar?'), 'financeiro');
      expect(screen.getByRole('heading', { name: 'Tabela financeira' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Colunas da tabela' })).not.toBeInTheDocument();

      await userEvent.selectOptions(screen.getByLabelText('O que você quer organizar?'), 'arquivo');
      expect(screen.getByRole('heading', { name: 'Tabela de arquivos' })).toBeInTheDocument();
    });

    it('erros de validação da API aparecem juntos', async () => {
      moduloService.create.mockRejectedValue({ response: { data: { errors: { nome: 'Nome já existe.', campos: 'Coluna repetida.' } } } });
      renderizar();
      await userEvent.type(screen.getByLabelText(/Nome da tabela/), 'Clientes');
      await salvar();
      expect(await screen.findByText('Nome já existe. | Coluna repetida.')).toBeInTheDocument();
      expect(screen.queryByText('Lista de tabelas')).not.toBeInTheDocument();
    });
  });

  describe('editar tabela', () => {
    it('carrega os dados; tipo da tabela e das colunas existentes ficam travados', async () => {
      renderizar('/modulos/m1/editar');
      expect(await screen.findByDisplayValue('Clientes')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Editar tabela' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Comece por um modelo' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('O que você quer organizar?')).toBeDisabled();
      expect(nomesDasColunas().map((c) => c.value)).toEqual(['Nome', 'Status', 'Contato']);
      expect(screen.getByDisplayValue('Texto')).toBeDisabled();
      expect(screen.getByText('Contatos')).toBeInTheDocument();
      expect(screen.getByText(/vários itens por vez/)).toBeInTheDocument();
      expect(moduloService.getById).toHaveBeenCalledWith('m1');
    });

    it('salva só o que mudou: renomeia, muda opções e adiciona coluna nova', async () => {
      renderizar('/modulos/m1/editar');
      await screen.findByDisplayValue('Clientes');

      await userEvent.type(screen.getByDisplayValue('Nome'), ' completo');
      await userEvent.type(screen.getByDisplayValue('Fechado'), ' ok');
      await adicionarColuna('Cidade');
      await salvar();

      expect(moduloService.update).toHaveBeenCalledWith('m1', { nome: 'Clientes', icone: 'group', tipo: 'dados' });
      expect(moduloService.updateField).toHaveBeenCalledTimes(2);
      expect(moduloService.updateField).toHaveBeenCalledWith('m1', 'c1', { nome: 'Nome completo' });
      expect(moduloService.updateField).toHaveBeenCalledWith('m1', 'c2', { opcoes: ['Novo', 'Fechado ok'] });
      expect(moduloService.addField).toHaveBeenCalledWith('m1', { nome: 'Cidade', tipo: 'texto' });
      expect(await screen.findByText('Lista de tabelas')).toBeInTheDocument();
      expect(screen.getByText('Tabela atualizada.')).toBeInTheDocument();
    });

    it('reordenar colunas salvas grava a ordem na hora', async () => {
      renderizar('/modulos/m1/editar');
      await screen.findByDisplayValue('Clientes');
      await userEvent.click(screen.getAllByTitle('Mover para baixo')[0]);
      expect(moduloService.reorderFields).toHaveBeenCalledWith('m1', ['c2', 'c1', 'c3']);
      expect(nomesDasColunas().map((c) => c.value)).toEqual(['Status', 'Nome', 'Contato']);
    });

    it('excluir coluna salva pede confirmação e chama a API', async () => {
      renderizar('/modulos/m1/editar');
      await screen.findByDisplayValue('Clientes');

      await userEvent.click(screen.getAllByTitle('Remover coluna')[0]);
      const dialogo = screen.getByRole('alertdialog', { name: 'Excluir a coluna "Nome"?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir coluna' }));

      expect(moduloService.deleteField).toHaveBeenCalledWith('m1', 'c1');
      expect(await screen.findByText('Coluna excluída com sucesso.')).toBeInTheDocument();
      expect(nomesDasColunas().map((c) => c.value)).toEqual(['Status', 'Contato']);
    });

    it('falha ao excluir coluna mantém a coluna e avisa', async () => {
      moduloService.deleteField.mockRejectedValue(new Error('409'));
      renderizar('/modulos/m1/editar');
      await screen.findByDisplayValue('Clientes');

      await userEvent.click(screen.getAllByTitle('Remover coluna')[1]);
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir coluna' }));

      expect(await screen.findByText('Erro ao excluir a coluna. Ela pode ter itens preenchidos.')).toBeInTheDocument();
      expect(nomesDasColunas()).toHaveLength(3);
    });

    it('tabela inexistente avisa', async () => {
      moduloService.getById.mockResolvedValue(null);
      renderizar('/modulos/m9/editar');
      expect(await screen.findByText('Tabela não encontrada.')).toBeInTheDocument();
    });

    it('erro ao carregar avisa', async () => {
      moduloService.getById.mockRejectedValue(new Error('rede'));
      renderizar('/modulos/m1/editar');
      expect(await screen.findByText('Erro ao carregar tabela.')).toBeInTheDocument();
    });

    it('vaga existente aponta para a tela de recrutamento', async () => {
      moduloService.getById.mockResolvedValue({ id: 'v1', nome: 'Vaga Dev', icone: 'groups', tipo: 'recrutamento', campos: [] });
      renderizar('/modulos/v1/editar');
      expect(await screen.findByRole('link', { name: 'Recrutamento' })).toHaveAttribute('href', '/recrutamento');
      expect(screen.queryByRole('heading', { name: 'Etapas do quadro' })).not.toBeInTheDocument();
    });
  });
});
