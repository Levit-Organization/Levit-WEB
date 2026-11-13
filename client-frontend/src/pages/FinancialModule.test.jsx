import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import FinancialModule from './FinancialModule';
import { moduloService } from '../services/moduloService';
import { financeiroService } from '../services/financeiroService';

vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/moduloService', () => ({ moduloService: { getById: vi.fn(), getAll: vi.fn() } }));
vi.mock('../services/financeiroService', () => ({
  financeiroService: {
    listarCategorias: vi.fn(),
    criarCategoria: vi.fn(),
    listarLancamentos: vi.fn(),
    criarLancamento: vi.fn(),
  },
}));

const ANO = String(new Date().getFullYear());
const ANO_PASSADO = String(new Date().getFullYear() - 1);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
// O Testing Library normaliza o espaço fixo do Intl para espaço comum.
const brl = (valor) => BRL.format(valor).replace(/\s/g, ' ');

const categorias = [
  { id: 'k1', nome: 'Fixo' },
  { id: 'k2', nome: 'Variável' },
  { id: 'k3', nome: 'Investimento' },
  { id: 'k4', nome: 'Receita' },
];

const lancamentos = [
  {
    id: 'l1',
    data_lancamento: `${ANO}-03-10`,
    descricao: 'Venda balcão',
    tipo: 'entrada',
    valor: '1000.00',
    categoria_id: 'k4',
    categoria_nome: 'Receita',
    saldo_acumulado: '1000.00',
    conciliado: true,
    criado_em: `${ANO}-03-10 09:00:00`,
  },
  {
    id: 'l2',
    data_lancamento: `${ANO}-03-15`,
    descricao: 'Aluguel',
    tipo: 'saida',
    valor: '200.00',
    categoria_id: 'k1',
    categoria_nome: 'Fixo',
    saldo_acumulado: '800.00',
    conciliado: 'f',
    criado_em: `${ANO}-03-15 09:00:00`,
  },
  {
    id: 'l3',
    data_lancamento: `${ANO}-05-02`,
    descricao: 'Material de escritório',
    tipo: 'saida',
    valor: '50.50',
    categoria_id: null,
    categoria_nome: null,
    saldo_acumulado: '-80.25',
    conciliado: 't',
    criado_em: `${ANO}-05-02 09:00:00`,
  },
  {
    id: 'l4',
    data_lancamento: `${ANO_PASSADO}-12-20`,
    descricao: 'Venda antiga',
    tipo: 'entrada',
    valor: '300.00',
    categoria_id: 'k4',
    categoria_nome: 'Receita',
    saldo_acumulado: '300.00',
    conciliado: true,
    criado_em: `${ANO_PASSADO}-12-20 09:00:00`,
  },
];

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <MemoryRouter initialEntries={['/modulos/f1/financeiro']}>
          <Routes>
            <Route path="/modulos/:id/financeiro" element={<FinancialModule />} />
          </Routes>
        </MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const resumo = (rotulo) => within(screen.getByText(rotulo, { selector: 'p' }).parentElement);
const descricoes = () =>
  screen
    .queryAllByRole('row')
    .filter((linha) => within(linha).queryAllByRole('cell').length > 0)
    .map((linha) => within(linha).getAllByRole('cell')[1].textContent);

async function esperarLancamentos() {
  await screen.findByText('Venda balcão');
}

describe('FinancialModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moduloService.getById.mockResolvedValue({ id: 'f1', nome: 'Caixa da loja', icone: 'savings', tipo: 'financeiro' });
    financeiroService.listarCategorias.mockResolvedValue(categorias);
    financeiroService.listarLancamentos.mockResolvedValue({ lancamentos });
    financeiroService.criarCategoria.mockResolvedValue({});
  });

  it('mostra o nome, os totais do ano e os lançamentos agrupados por mês', async () => {
    renderizar();
    await esperarLancamentos();

    expect(await screen.findByRole('heading', { level: 1, name: 'Caixa da loja' })).toBeInTheDocument();
    expect(financeiroService.listarLancamentos).toHaveBeenCalledWith('f1');
    expect(financeiroService.criarCategoria).not.toHaveBeenCalled();

    expect(resumo('Entradas').getByText(brl(1000))).toBeInTheDocument();
    expect(resumo('Saídas').getByText(brl(250.5))).toBeInTheDocument();
    expect(resumo('Saldo').getByText(brl(749.5))).toBeInTheDocument();

    // Só os meses com lançamento, em ordem; dentro do mês, do mais recente ao mais antigo.
    const meses = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(meses).toEqual([`Março ${ANO}`, `Maio ${ANO}`]);
    expect(screen.getByText('2 lançamentos')).toBeInTheDocument();
    expect(screen.getByText('1 lançamento')).toBeInTheDocument();
    expect(descricoes()).toEqual(['Aluguel', 'Venda balcão', 'Material de escritório']);

    const marco = screen.getByRole('button', { name: new RegExp(`Março ${ANO}`) });
    expect(marco).toHaveAttribute('aria-expanded', 'true');
    expect(within(marco).getByText(`+${brl(1000)}`)).toBeInTheDocument();
    expect(within(marco).getByText(`-${brl(200)}`)).toBeInTheDocument();
    expect(within(marco).getByText(`+${brl(800)}`)).toBeInTheDocument();

    const titulos = within(screen.getAllByRole('table')[0]).getAllByRole('columnheader').map((th) => th.textContent);
    expect(titulos).toEqual(['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo acum.', 'Conciliado']);

    const aluguel = within(screen.getByText('Aluguel').closest('tr'));
    expect(aluguel.getByText(`15/03/${ANO}`)).toBeInTheDocument();
    expect(aluguel.getByText('Saída')).toBeInTheDocument();
    expect(aluguel.getByText('Fixo')).toBeInTheDocument();
    expect(aluguel.getByText(`-${brl(200)}`)).toBeInTheDocument();
    expect(aluguel.getByText(brl(800))).toBeInTheDocument();
    expect(aluguel.getByText('Pendente')).toBeInTheDocument();

    const venda = within(screen.getByText('Venda balcão').closest('tr'));
    expect(venda.getByText('Entrada')).toBeInTheDocument();
    expect(venda.getByText('Sim')).toBeInTheDocument();

    const material = within(screen.getByText('Material de escritório').closest('tr'));
    expect(material.getByText('Sem categoria')).toBeInTheDocument();
    expect(material.getByText('Sim')).toBeInTheDocument();
    expect(material.getByText(brl(-80.25))).toHaveClass('text-danger');
  });

  it('sem o nome da tabela, o título cai em "Financeiro"', async () => {
    moduloService.getById.mockRejectedValue(new Error('rede'));
    renderizar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
  });

  it('cria as categorias padrão que faltam na primeira visita', async () => {
    financeiroService.listarCategorias.mockResolvedValueOnce({ data: [{ id: 'k1', nome: 'fixo' }] });
    renderizar();
    await esperarLancamentos();

    expect(financeiroService.criarCategoria).toHaveBeenCalledTimes(3);
    expect(financeiroService.criarCategoria).toHaveBeenCalledWith('Variável', { skipInvalidate: true });
    expect(financeiroService.criarCategoria).toHaveBeenCalledWith('Investimento', { skipInvalidate: true });
    expect(financeiroService.criarCategoria).toHaveBeenCalledWith('Receita', { skipInvalidate: true });
    expect(financeiroService.listarCategorias).toHaveBeenCalledTimes(2);

    const opcoes = within(screen.getByLabelText('Filtrar por categoria')).getAllByRole('option');
    expect(opcoes.map((o) => [o.value, o.textContent])).toEqual([
      ['all', 'Todas as categorias'],
      ['k1', 'Fixo'],
      ['k2', 'Variável'],
      ['k3', 'Investimento'],
      ['k4', 'Receita'],
    ]);
  });

  it('busca filtra os lançamentos e os totais; sem resultado, explica', async () => {
    renderizar();
    await esperarLancamentos();

    const busca = screen.getByRole('searchbox', { name: 'Buscar lançamento' });
    await userEvent.type(busca, 'ALUG');
    await waitFor(() => expect(descricoes()).toEqual(['Aluguel']));
    expect(resumo('Entradas').getByText(brl(0))).toBeInTheDocument();
    expect(resumo('Saídas').getByText(brl(200))).toBeInTheDocument();
    expect(resumo('Saldo').getByText(brl(-200))).toBeInTheDocument();

    // Também acha pela categoria e pelo tipo.
    await userEvent.clear(busca);
    await userEvent.type(busca, 'receita');
    await waitFor(() => expect(descricoes()).toEqual(['Venda balcão']));
    await userEvent.clear(busca);
    await userEvent.type(busca, 'saida');
    await waitFor(() => expect(descricoes()).toEqual(['Aluguel', 'Material de escritório']));

    await userEvent.clear(busca);
    await userEvent.type(busca, 'zzz');
    expect(await screen.findByText('Nenhum lançamento encontrado')).toBeInTheDocument();
    expect(screen.getByText('Tente outra busca ou outra categoria.')).toBeInTheDocument();
    // Filtrando, o estado vazio não oferece criar.
    expect(screen.getAllByRole('button', { name: 'Novo lançamento' })).toHaveLength(1);
  });

  it('filtra por categoria', async () => {
    renderizar();
    await esperarLancamentos();

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'k1');
    await waitFor(() => expect(descricoes()).toEqual(['Aluguel']));
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([`Março ${ANO}`]);

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'k3');
    expect(await screen.findByText('Nenhum lançamento encontrado')).toBeInTheDocument();
  });

  it('troca o ano pelos anos que têm lançamento', async () => {
    renderizar();
    await esperarLancamentos();

    const ano = screen.getByLabelText('Ano');
    expect(ano).toHaveValue(ANO);
    expect(within(ano).getAllByRole('option').map((o) => o.textContent)).toEqual([ANO, ANO_PASSADO]);

    await userEvent.selectOptions(ano, ANO_PASSADO);
    expect(await screen.findByText('Venda antiga')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([`Dezembro ${ANO_PASSADO}`]);
    expect(resumo('Entradas').getByText(brl(300))).toBeInTheDocument();
  });

  it('ano sem lançamentos convida a criar o primeiro', async () => {
    financeiroService.listarLancamentos.mockResolvedValue({ data: { lancamentos: [] } });
    renderizar();

    expect(await screen.findByText(`Nenhum lançamento em ${ANO}`)).toBeInTheDocument();
    expect(screen.getByText('Registre entradas e saídas para ver o saldo de cada mês.')).toBeInTheDocument();
    expect(screen.getByLabelText('Ano')).toHaveValue(ANO);

    const botoes = screen.getAllByRole('button', { name: 'Novo lançamento' });
    expect(botoes).toHaveLength(2);
    await userEvent.click(botoes[1]);
    expect(screen.getByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument();
  });

  it('erro ao carregar mostra a mensagem e tenta de novo', async () => {
    financeiroService.listarLancamentos.mockRejectedValueOnce({ response: { data: { message: 'Falha no servidor.' } } });
    renderizar();

    expect(await screen.findByText('Falha no servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await esperarLancamentos();
    expect(financeiroService.listarLancamentos).toHaveBeenCalledTimes(2);
  });

  it('erro sem mensagem da API usa o texto padrão', async () => {
    financeiroService.listarLancamentos.mockRejectedValue(new Error('rede'));
    renderizar();
    expect(await screen.findByText('Erro ao carregar os lançamentos.')).toBeInTheDocument();
  });

  it('recolhe e expande o mês', async () => {
    renderizar();
    await esperarLancamentos();

    const marco = screen.getByRole('button', { name: new RegExp(`Março ${ANO}`) });
    await userEvent.click(marco);
    expect(marco).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Aluguel')).not.toBeInTheDocument();
    expect(screen.getByText('Material de escritório')).toBeInTheDocument();

    await userEvent.click(marco);
    expect(marco).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
  });

  it('mostra 50 lançamentos por vez dentro do mês', async () => {
    const muitos = Array.from({ length: 60 }, (_, i) => ({
      id: `m${i}`,
      data_lancamento: `${ANO}-02-${String((i % 28) + 1).padStart(2, '0')}`,
      descricao: `Item ${i}`,
      tipo: 'saida',
      valor: '1',
      categoria_id: null,
      categoria_nome: null,
      saldo_acumulado: '0',
      conciliado: false,
      criado_em: `${ANO}-02-01 0${i % 10}:00:00`,
    }));
    financeiroService.listarLancamentos.mockResolvedValue({ lancamentos: muitos });
    renderizar();
    await screen.findByText(`Fevereiro ${ANO}`);

    expect(descricoes()).toHaveLength(50);
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar mais 10 de 10 lançamentos' }));
    expect(descricoes()).toHaveLength(60);
    expect(screen.queryByRole('button', { name: /Mostrar mais/ })).not.toBeInTheDocument();
  });

  it('valida e cria um lançamento', async () => {
    financeiroService.criarLancamento.mockResolvedValue({ id: 'l9' });
    renderizar();
    await esperarLancamentos();

    await userEvent.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    const painel = screen.getByRole('dialog', { name: 'Novo lançamento' });
    expect(within(painel).getByLabelText(/^Data/)).toHaveValue(new Date().toISOString().split('T')[0]);
    expect(within(painel).getByLabelText('Tipo')).toHaveValue('saida');

    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar lançamento' }));
    expect(within(painel).getByText('Informe uma descrição.')).toBeInTheDocument();
    expect(within(painel).getByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(financeiroService.criarLancamento).not.toHaveBeenCalled();

    // Corrigir o campo apaga o erro dele.
    await userEvent.type(within(painel).getByLabelText(/^Descrição/), '  Venda online  ');
    expect(within(painel).queryByText('Informe uma descrição.')).not.toBeInTheDocument();
    await userEvent.type(within(painel).getByLabelText(/^Valor/), '99.9');
    await userEvent.selectOptions(within(painel).getByLabelText('Tipo'), 'entrada');
    await userEvent.selectOptions(within(painel).getByLabelText('Categoria'), 'k4');
    await userEvent.click(within(painel).getByRole('switch', { name: 'Lançamento conciliado' }));
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar lançamento' }));

    expect(financeiroService.criarLancamento).toHaveBeenCalledWith('f1', {
      descricao: 'Venda online',
      data: new Date().toISOString().split('T')[0],
      tipo: 'entrada',
      valor: 99.9,
      conciliado: true,
      categoria_id: 'k4',
    });
    expect(await screen.findByText('Lançamento salvo.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo lançamento' })).not.toBeInTheDocument());
  });

  it('sem categoria, o lançamento vai com categoria nula', async () => {
    financeiroService.criarLancamento.mockResolvedValue({ id: 'l9' });
    renderizar();
    await esperarLancamentos();

    await userEvent.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    const painel = screen.getByRole('dialog', { name: 'Novo lançamento' });
    await userEvent.type(within(painel).getByLabelText(/^Descrição/), 'Taxa');
    await userEvent.type(within(painel).getByLabelText(/^Valor/), '5');
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar lançamento' }));

    expect(financeiroService.criarLancamento).toHaveBeenCalledWith('f1', expect.objectContaining({
      descricao: 'Taxa',
      tipo: 'saida',
      valor: 5,
      conciliado: false,
      categoria_id: null,
    }));
  });

  it('erro ao salvar fica no painel', async () => {
    financeiroService.criarLancamento.mockRejectedValue({ response: { data: { message: 'Valor acima do limite.' } } });
    renderizar();
    await esperarLancamentos();

    await userEvent.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    const painel = screen.getByRole('dialog', { name: 'Novo lançamento' });
    await userEvent.type(within(painel).getByLabelText(/^Descrição/), 'Compra');
    await userEvent.type(within(painel).getByLabelText(/^Valor/), '10');
    await userEvent.click(within(painel).getByRole('button', { name: 'Salvar lançamento' }));

    expect(await within(painel).findByText('Valor acima do limite.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument();
  });

  it('cancelar sem alterar fecha o painel na hora', async () => {
    renderizar();
    await esperarLancamentos();

    await userEvent.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo lançamento' })).not.toBeInTheDocument());
  });
});
