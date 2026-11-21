import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import { AuthContext } from '../context/authContext';
import ModuleRecords from './ModuleRecords';
import { moduloService } from '../services/moduloService';
import { registroService } from '../services/registroService';
import { equipeService } from '../services/equipeService';

vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/moduloService', () => ({ moduloService: { getById: vi.fn(), getAll: vi.fn() } }));
vi.mock('../services/registroService', () => ({
  registroService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    titulos: vi.fn(),
    ligados: vi.fn(),
  },
}));
vi.mock('../services/equipeService', () => ({ equipeService: { listarPessoas: vi.fn() } }));

// Sete colunas: a tabela mostra as cinco primeiras e, além delas, sempre o Responsável.
const modulo = {
  id: 'm1',
  nome: 'Clientes',
  icone: 'group',
  tipo: 'dados',
  campos: [
    { id: 'c1', nome: 'Cliente', tipo: 'texto' },
    { id: 'c2', nome: 'Valor', tipo: 'numero' },
    { id: 'c3', nome: 'Status', tipo: 'selecao', opcoes: ['Novo', 'Fechado'] },
    { id: 'c4', nome: 'Contato', tipo: 'vinculo', modulo_vinculado_id: 'm2', modulo_vinculado: { nome: 'Contatos' } },
    { id: 'c5', nome: 'Início', tipo: 'data' },
    { id: 'c6', nome: 'Notas', tipo: 'texto' },
    { id: 'c7', nome: 'Dono', tipo: 'responsavel' },
  ],
};

const registros = [
  { id: 'r1', dados: { c1: 'ACME', c2: 300, c3: 'Novo', c4: 'x1', c6: 'vip', c7: 'u1' }, criado_em: '2026-01-10T10:00:00' },
  { id: 'r2', dados: { c1: 'Padaria Sol', c2: 50, c3: 'Fechado', c7: 'u2' }, criado_em: '2026-01-11T10:00:00' },
  { id: 'r3', dados: { c1: 'Bistrô', c2: 1200 }, criado_em: '2026-01-12T10:00:00' },
];

const pessoas = [
  { id: 'u1', nome: 'Ana Lima' },
  { id: 'u2', nome: 'Bruno Reis' },
];

function renderizar(caminho = '/modulos/m1/registros') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <AuthContext.Provider value={{ autenticado: true, usuario: { id: 'u1', nome: 'Ana Lima' } }}>
          <MemoryRouter initialEntries={[caminho]}>
            <Routes>
              <Route path="/modulos/:id/registros" element={<ModuleRecords />} />
              <Route path="/recrutamento" element={<p>Tela de recrutamento</p>} />
              <Route path="/modulos/:id/financeiro" element={<p>Tela financeira</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const linhas = () => screen.getAllByRole('row').slice(1);
const primeiraColuna = () => linhas().map((l) => within(l).getAllByRole('cell')[0].textContent);
const cabecalho = (nome) => screen.getByRole('columnheader', { name: new RegExp(`^${nome}`) });

async function esperarTabela() {
  await screen.findByRole('cell', { name: 'ACME' });
}

describe('ModuleRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    moduloService.getById.mockResolvedValue(modulo);
    registroService.getAll.mockResolvedValue(registros);
    registroService.titulos.mockResolvedValue([{ id: 'x1', titulo: 'João' }]);
    registroService.ligados.mockResolvedValue([]);
    equipeService.listarPessoas.mockResolvedValue(pessoas);
  });

  it('mostra o nome, a contagem, as colunas e os itens', async () => {
    renderizar();
    await esperarTabela();

    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByText('3 itens')).toBeInTheDocument();

    const titulos = screen.getAllByRole('columnheader').map((th) => th.textContent.replace(/(unfold_more|arrow_upward|arrow_downward)$/, ''));
    expect(titulos).toEqual(['Cliente', 'Valor', 'Status', 'Contato', 'Início', 'Dono', 'Criado em', 'Ações']);

    const acme = within(linhas()[0]);
    expect(acme.getByText('300')).toBeInTheDocument();
    expect(acme.getByText('Novo')).toBeInTheDocument();
    expect(await acme.findByRole('link', { name: 'João' })).toHaveAttribute('href', '/modulos/m2/registros?item=x1');
    expect(await acme.findByText('Ana Lima')).toBeInTheDocument();
    expect(acme.getByText('10/01/2026')).toBeInTheDocument();
    // Coluna vazia vira "--".
    expect(within(linhas()[2]).getAllByText('--').length).toBeGreaterThan(0);
    expect(registroService.getAll).toHaveBeenCalledWith('m1', '', expect.anything(), null);
  });

  it('falha ao abrir a tabela mostra o erro com "Tentar novamente"', async () => {
    moduloService.getById.mockRejectedValue({ response: { data: { message: 'Sem acesso a esta tabela.' } } });
    renderizar();
    expect(await screen.findByText('Não foi possível abrir esta tabela')).toBeInTheDocument();
    expect(screen.getByText('Sem acesso a esta tabela.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('falha ao carregar os itens mostra o erro na área da tabela', async () => {
    registroService.getAll.mockRejectedValue(new Error('rede'));
    renderizar();
    expect(await screen.findByText('Erro ao carregar os itens.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument();
  });

  it('tabela vazia convida a criar o primeiro item', async () => {
    registroService.getAll.mockResolvedValue([]);
    renderizar();
    expect(await screen.findByText('Nenhum item ainda')).toBeInTheDocument();
    expect(screen.getByText('0 itens')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Criar primeiro item' }));
    expect(screen.getByRole('dialog', { name: 'Novo item' })).toBeInTheDocument();
  });

  it('tipos especiais redirecionam para a tela própria', async () => {
    moduloService.getById.mockResolvedValue({ ...modulo, tipo: 'financeiro' });
    renderizar();
    expect(await screen.findByText('Tela financeira')).toBeInTheDocument();
  });

  it('cria um item pelo painel lateral', async () => {
    registroService.create.mockResolvedValue({ id: 'r9' });
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Novo item' }));
    const painel = screen.getByRole('dialog', { name: 'Novo item' });
    // Todas as colunas aparecem no formulário, com o tipo ao lado do nome.
    expect(within(painel).getByLabelText(/^NotasTexto/)).toBeInTheDocument();
    await userEvent.type(within(painel).getByLabelText(/^ClienteTexto/), 'Nova Loja');
    await userEvent.type(within(painel).getByLabelText(/^ValorNúmero/), '42');
    await userEvent.selectOptions(within(painel).getByLabelText(/^StatusSeleção/), 'Fechado');
    await userEvent.selectOptions(within(painel).getByLabelText(/^DonoPessoa da equipe/), 'u2');
    await userEvent.click(within(painel).getByRole('button', { name: 'Criar item' }));

    expect(registroService.create).toHaveBeenCalledWith('m1', {
      dados: { c1: 'Nova Loja', c2: '42', c3: 'Fechado', c7: 'u2' },
    });
    expect(await screen.findByText('Item criado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo item' })).not.toBeInTheDocument());
  });

  it('erro ao salvar fica no painel', async () => {
    registroService.create.mockRejectedValue({ response: { data: { message: 'Valor inválido.' } } });
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Novo item' }));
    const painel = screen.getByRole('dialog', { name: 'Novo item' });
    await userEvent.type(within(painel).getByLabelText(/^ClienteTexto/), 'X');
    await userEvent.click(within(painel).getByRole('button', { name: 'Criar item' }));

    expect(await within(painel).findByText('Valor inválido.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo item' })).toBeInTheDocument();
  });

  it('edita um item existente', async () => {
    registroService.update.mockResolvedValue({});
    renderizar();
    await esperarTabela();

    await userEvent.click(within(linhas()[1]).getByRole('button', { name: 'Editar item' }));
    const painel = screen.getByRole('dialog', { name: 'Editar item' });
    const nome = within(painel).getByLabelText(/^ClienteTexto/);
    expect(nome).toHaveValue('Padaria Sol');
    await userEvent.clear(nome);
    await userEvent.type(nome, 'Padaria Lua');
    await userEvent.click(within(painel).getByRole('button', { name: 'Atualizar' }));

    expect(registroService.update).toHaveBeenCalledWith('m1', 'r2', {
      dados: { c1: 'Padaria Lua', c2: 50, c3: 'Fechado', c7: 'u2' },
    });
    expect(await screen.findByText('Item atualizado.')).toBeInTheDocument();
  });

  it('link direto (?item=) abre o item', async () => {
    renderizar('/modulos/m1/registros?item=r3');
    const painel = await screen.findByRole('dialog', { name: 'Editar item' });
    expect(within(painel).getByLabelText(/^ClienteTexto/)).toHaveValue('Bistrô');
  });

  it('exclui depois de confirmar e tira a linha da tabela', async () => {
    registroService.delete.mockResolvedValue({});
    renderizar();
    await esperarTabela();

    await userEvent.click(within(linhas()[0]).getByRole('button', { name: 'Excluir item' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir item?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(registroService.delete).toHaveBeenCalledWith('m1', 'r1');
    expect(await screen.findByText('Item excluído.')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'ACME' })).not.toBeInTheDocument();
  });

  it('cancelar a confirmação não exclui', async () => {
    renderizar();
    await esperarTabela();

    await userEvent.click(within(linhas()[0]).getByRole('button', { name: 'Excluir item' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(registroService.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('cell', { name: 'ACME' })).toBeInTheDocument();
  });

  it('ordena pela coluna: crescente, decrescente e volta ao original', async () => {
    renderizar();
    await esperarTabela();

    await userEvent.click(within(cabecalho('Valor')).getByRole('button'));
    expect(cabecalho('Valor')).toHaveAttribute('aria-sort', 'ascending');
    expect(primeiraColuna()).toEqual(['Padaria Sol', 'ACME', 'Bistrô']);

    await userEvent.click(within(cabecalho('Valor')).getByRole('button'));
    expect(cabecalho('Valor')).toHaveAttribute('aria-sort', 'descending');
    expect(primeiraColuna()).toEqual(['Bistrô', 'ACME', 'Padaria Sol']);

    await userEvent.click(within(cabecalho('Valor')).getByRole('button'));
    expect(cabecalho('Valor')).toHaveAttribute('aria-sort', 'none');
    expect(primeiraColuna()).toEqual(['ACME', 'Padaria Sol', 'Bistrô']);

    // Texto: ordem alfabética do pt-BR; vazios sempre no fim.
    await userEvent.click(within(cabecalho('Status')).getByRole('button'));
    expect(primeiraColuna()).toEqual(['Padaria Sol', 'ACME', 'Bistrô']);
  });

  it('pagina de 25 em 25', async () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i + 1}`,
      dados: { c1: `Cliente ${String(i + 1).padStart(2, '0')}` },
      criado_em: '2026-01-10T10:00:00',
    }));
    registroService.getAll.mockResolvedValue(muitos);
    renderizar();
    await screen.findByRole('cell', { name: 'Cliente 01' });

    expect(linhas()).toHaveLength(25);
    expect(screen.getByText('Mostrando 1–25 de 30 registros')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(linhas()).toHaveLength(5);
    expect(primeiraColuna()[0]).toBe('Cliente 26');
    expect(screen.getByText('Mostrando 26–30 de 30 registros')).toBeInTheDocument();
  });

  it('busca manda o termo para a API e explica quando nada bate', async () => {
    renderizar();
    await esperarTabela();

    registroService.getAll.mockResolvedValue([]);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar itens' }), 'zzz');

    expect(await screen.findByText('Nenhum resultado')).toBeInTheDocument();
    expect(screen.getByText('Nada bate com "zzz" nesta tabela. Tente outro termo.')).toBeInTheDocument();
    expect(registroService.getAll).toHaveBeenLastCalledWith('m1', 'zzz', expect.anything(), null);
  });

  it('pesquisa avançada: filtro completo vai para a API e dá para limpar', async () => {
    renderizar();
    await esperarTabela();

    const botaoFiltrar = screen.getByRole('button', { name: 'Filtrar' });
    expect(botaoFiltrar).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(botaoFiltrar);
    expect(botaoFiltrar).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar filtro' }));
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por'), 'c3');
    registroService.getAll.mockResolvedValue([]);
    await userEvent.selectOptions(screen.getByLabelText('Valor'), 'Fechado');

    expect(screen.getByRole('button', { name: 'Filtros (1)' })).toBeInTheDocument();
    expect(await screen.findByText('Nenhum item atende a todos os filtros. Ajuste ou limpe os filtros.')).toBeInTheDocument();
    expect(registroService.getAll).toHaveBeenLastCalledWith('m1', '', expect.anything(), {
      logica: 'e',
      regras: [{ campo: 'c3', operador: 'igual', valor: 'Fechado' }],
    });

    registroService.getAll.mockResolvedValue(registros);
    const vazio = screen.getByText('Nenhum resultado').closest('div');
    await userEvent.click(within(vazio).getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByRole('cell', { name: 'ACME' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument();
  });

  it('"Só os meus" mostra apenas os itens da pessoa logada', async () => {
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Só os meus' }));
    expect(primeiraColuna()).toEqual(['ACME']);
    expect(screen.getByText('1 de 3 itens com você')).toBeInTheDocument();
  });

  it('"Só os meus" sem nenhum item da pessoa oferece ver todos', async () => {
    registroService.getAll.mockResolvedValue(registros.slice(1));
    renderizar();
    await screen.findByRole('cell', { name: 'Padaria Sol' });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Só os meus' }));
    expect(screen.getByText('Nenhum item com você')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(screen.getByRole('cell', { name: 'Padaria Sol' })).toBeInTheDocument();
  });

  it('troca para quadro e lembra a escolha por tabela', async () => {
    renderizar();
    await esperarTabela();

    const grupo = screen.getByRole('group', { name: 'Como ver os itens' });
    expect(within(grupo).getByRole('button', { name: /Lista/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(grupo).getByRole('button', { name: /Quadro/ }));

    expect(within(grupo).getByRole('button', { name: /Quadro/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Novo, 1 item' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('levit_visao_m1'))).toEqual({ visao: 'quadro' });
  });

  it('mover no quadro troca o valor na hora e volta se a API recusar', async () => {
    localStorage.setItem('levit_visao_m1', JSON.stringify({ visao: 'quadro' }));
    registroService.update.mockResolvedValueOnce({}).mockRejectedValueOnce({ response: { data: { message: 'Sem permissão.' } } });
    renderizar();
    await screen.findByRole('region', { name: 'Fechado, 1 item' });

    await userEvent.selectOptions(screen.getByLabelText('Status de ACME'), 'Fechado');
    expect(screen.getByRole('region', { name: 'Fechado, 2 itens' })).toBeInTheDocument();
    expect(registroService.update).toHaveBeenCalledWith(
      'm1',
      'r1',
      { dados: { ...registros[0].dados, c3: 'Fechado' } },
      { skipInvalidate: true }
    );

    await userEvent.selectOptions(screen.getByLabelText('Status de Padaria Sol'), 'Novo');
    expect(await screen.findByText('Sem permissão.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Fechado, 2 itens' })).toBeInTheDocument();
  });

  it('abre em quadro quando a escolha já estava salva', async () => {
    localStorage.setItem('levit_visao_m1', JSON.stringify({ visao: 'quadro' }));
    renderizar();
    expect(await screen.findByRole('region', { name: 'Fechado, 1 item' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
