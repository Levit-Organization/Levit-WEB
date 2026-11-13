import { describe, expect, it } from 'vitest';
import {
  agruparPorMes,
  anosDisponiveis,
  categoriasFaltando,
  filtrarLancamentos,
  formatarData,
  formularioVazio,
  lancamentoParaApi,
  listaDeCategorias,
  listaDeLancamentos,
  opcoesDeCategoria,
  somarTotais,
  validarLancamento,
} from './financeiro';

const lanc = (id, data, extra = {}) => ({ id, data_lancamento: data, tipo: 'saida', valor: '10', criado_em: `${data} 10:00:00`, ...extra });

describe('formatarData', () => {
  it('troca AAAA-MM-DD por DD/MM/AAAA', () => {
    expect(formatarData('2026-03-15')).toBe('15/03/2026');
    expect(formatarData('')).toBe('');
    expect(formatarData(null)).toBe('');
  });
});

describe('listaDeCategorias e listaDeLancamentos', () => {
  it('aceitam a lista direto ou dentro de data', () => {
    expect(listaDeCategorias([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(listaDeCategorias({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(listaDeCategorias(undefined)).toEqual([]);
    expect(listaDeLancamentos({ lancamentos: [{ id: 3 }] })).toEqual([{ id: 3 }]);
    expect(listaDeLancamentos({ data: { lancamentos: [{ id: 4 }] } })).toEqual([{ id: 4 }]);
    expect(listaDeLancamentos(null)).toEqual([]);
  });
});

describe('categorias padrão', () => {
  const existentes = [{ id: 'k1', nome: 'FIXO' }, { id: 'k4', nome: 'receita' }];

  it('lista as que faltam, sem diferenciar maiúsculas', () => {
    expect(categoriasFaltando(existentes)).toEqual(['Variável', 'Investimento']);
    expect(categoriasFaltando([])).toEqual(['Fixo', 'Variável', 'Investimento', 'Receita']);
  });

  it('opções usam o id quando a categoria existe e o nome quando não', () => {
    expect(opcoesDeCategoria(existentes)).toEqual([
      { value: 'k1', label: 'Fixo' },
      { value: 'Variável', label: 'Variável' },
      { value: 'Investimento', label: 'Investimento' },
      { value: 'k4', label: 'Receita' },
    ]);
  });
});

describe('somarTotais', () => {
  it('soma entradas e saídas e calcula o saldo', () => {
    const totais = somarTotais([
      { tipo: 'entrada', valor: '100.50' },
      { tipo: 'saida', valor: '30' },
      { tipo: 'saida', valor: 'abc' },
      { tipo: 'outro', valor: '999' },
    ]);
    expect(totais).toEqual({ profit: 100.5, expenses: 30, balance: 70.5 });
    expect(somarTotais([])).toEqual({ profit: 0, expenses: 0, balance: 0 });
  });
});

describe('anosDisponiveis', () => {
  it('anos com lançamento mais o atual, do mais recente ao mais antigo, sem repetir', () => {
    const lista = [lanc('a', '2024-01-01'), lanc('b', '2026-05-01'), lanc('c', '2024-07-01')];
    expect(anosDisponiveis(lista, '2025')).toEqual(['2026', '2025', '2024']);
    expect(anosDisponiveis([], '2026')).toEqual(['2026']);
  });
});

describe('filtrarLancamentos', () => {
  const lista = [
    lanc('a', '2026-03-10', { descricao: 'Venda', tipo: 'entrada', categoria_id: 'k4', categoria_nome: 'Receita' }),
    lanc('b', '2026-03-15', { descricao: 'Aluguel', categoria_id: 'k1', categoria_nome: 'Fixo' }),
    lanc('c', '2026-03-15', { descricao: 'Água', criado_em: '2026-03-15 11:00:00' }),
    lanc('d', '2025-12-01', { descricao: 'Antigo' }),
  ];
  const ids = (filtros) => filtrarLancamentos(lista, { ano: '2026', categoria: 'all', busca: '', ...filtros }).map((l) => l.id);

  it('fica com o ano e ordena do mais recente; no mesmo dia, o criado por último primeiro', () => {
    expect(ids({})).toEqual(['c', 'b', 'a']);
    expect(ids({ ano: '2025' })).toEqual(['d']);
  });

  it('filtra pela categoria', () => {
    expect(ids({ categoria: 'k1' })).toEqual(['b']);
  });

  it('busca na descrição, na categoria e no tipo, sem diferenciar maiúsculas', () => {
    expect(ids({ busca: '  ALUG ' })).toEqual(['b']);
    expect(ids({ busca: 'receita' })).toEqual(['a']);
    expect(ids({ busca: 'entrada' })).toEqual(['a']);
    expect(ids({ busca: 'zzz' })).toEqual([]);
  });

  it('não altera a lista original', () => {
    const copia = [...lista];
    ids({});
    expect(lista).toEqual(copia);
  });
});

describe('agruparPorMes', () => {
  it('separa por mês com os totais de cada um', () => {
    const grupos = agruparPorMes([
      lanc('a', '2026-03-10', { tipo: 'entrada', valor: '100' }),
      lanc('b', '2026-03-15', { valor: '40' }),
      lanc('c', '2026-11-01', { valor: '5' }),
    ]);
    expect(Object.keys(grupos)).toHaveLength(12);
    expect(grupos['03'].lista.map((l) => l.id)).toEqual(['a', 'b']);
    expect(grupos['03'].totais).toEqual({ profit: 100, expenses: 40, balance: 60 });
    expect(grupos['11'].totais.balance).toBe(-5);
    expect(grupos['01']).toEqual({ lista: [], totais: { profit: 0, expenses: 0, balance: 0 } });
  });
});

describe('formulário de lançamento', () => {
  it('começa vazio, como saída, na data de hoje', () => {
    expect(formularioVazio()).toEqual({
      descricao: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'saida',
      valor: '',
      categoria_id: '',
      conciliado: false,
    });
  });

  it('valida descrição, data e valor', () => {
    expect(validarLancamento({ descricao: '  ', data: '', valor: '0' })).toEqual({
      descricao: 'Informe uma descrição.',
      data: 'Informe a data.',
      valor: 'Informe um valor maior que zero.',
    });
    expect(validarLancamento({ descricao: 'x', data: '2026-01-01', valor: 'abc' })).toEqual({
      valor: 'Informe um valor maior que zero.',
    });
    expect(validarLancamento({ descricao: 'x', data: '2026-01-01', valor: '0.01' })).toEqual({});
  });

  it('monta o corpo para a API', () => {
    const form = { descricao: ' Venda ', data: '2026-01-01', tipo: 'entrada', valor: '12.5', categoria_id: '', conciliado: true };
    expect(lancamentoParaApi(form)).toEqual({
      descricao: 'Venda',
      data: '2026-01-01',
      tipo: 'entrada',
      valor: 12.5,
      conciliado: true,
      categoria_id: null,
    });
    expect(lancamentoParaApi({ ...form, categoria_id: 'k1' }).categoria_id).toBe('k1');
  });
});
