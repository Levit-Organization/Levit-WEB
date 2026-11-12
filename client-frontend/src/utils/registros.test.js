import { describe, expect, it } from 'vitest';
import { colunasDaTabela, compararRegistros, proximaOrdem } from './registros';

const campos = [
  { id: 'c1', nome: 'Cliente', tipo: 'texto' },
  { id: 'c2', nome: 'Valor', tipo: 'numero' },
  { id: 'c3', nome: 'Status', tipo: 'selecao' },
  { id: 'c4', nome: 'Contato', tipo: 'vinculo', modulo_vinculado_id: 'm2' },
  { id: 'c5', nome: 'Início', tipo: 'data' },
  { id: 'c6', nome: 'Notas', tipo: 'texto' },
  { id: 'c7', nome: 'Dono', tipo: 'responsavel' },
  { id: 'c8', nome: 'Entrega', tipo: 'prazo' },
];

describe('colunasDaTabela', () => {
  const colunas = colunasDaTabela(campos, { u1: 'Ana' }, { m2: { x1: 'João' } });

  it('mostra as cinco primeiras, mais Responsável e Prazo, e fecha com "Criado em"', () => {
    expect(colunas.map((c) => c.key)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c7', 'c8', 'criado_em']);
  });

  it('lê o nome da pessoa, o título do item ligado e o valor cru', () => {
    const registro = { dados: { c1: 'ACME', c4: 'x1', c7: 'u1' }, criado_em: '2026-01-10' };
    const ler = (key) => colunas.find((c) => c.key === key).ler(registro);
    expect(ler('c1')).toBe('ACME');
    expect(ler('c4')).toBe('João');
    expect(ler('c7')).toBe('Ana');
    expect(ler('c2')).toBeUndefined();
    expect(ler('criado_em')).toBe('2026-01-10');
  });
});

describe('compararRegistros', () => {
  const numero = { tipo: 'numero', ler: (r) => r.v };
  const texto = { tipo: 'texto', ler: (r) => r.v };
  const ordenar = (valores, coluna, direcao) =>
    valores.map((v) => ({ v })).sort((a, b) => compararRegistros(a, b, coluna, direcao)).map((r) => r.v);

  it('números pelo valor, nos dois sentidos', () => {
    expect(ordenar([300, 50, 1200], numero, 'asc')).toEqual([50, 300, 1200]);
    expect(ordenar([300, 50, 1200], numero, 'desc')).toEqual([1200, 300, 50]);
  });

  it('texto pela ordem do pt-BR, sem diferenciar acento e com números naturais', () => {
    expect(ordenar(['item 10', 'Ábaco', 'item 2', 'zebra'], texto, 'asc')).toEqual(['Ábaco', 'item 2', 'item 10', 'zebra']);
  });

  it('vazios (e números inválidos) ficam sempre no fim', () => {
    expect(ordenar([null, 5, '', 1, 'x'], numero, 'asc')).toEqual([1, 5, null, '', 'x']);
    expect(ordenar([null, 5, 1], numero, 'desc')).toEqual([5, 1, null]);
  });
});

describe('proximaOrdem', () => {
  it('alterna crescente, decrescente e sem ordem; outra coluna recomeça', () => {
    expect(proximaOrdem(null, 'c1')).toEqual({ key: 'c1', direcao: 'asc' });
    expect(proximaOrdem({ key: 'c1', direcao: 'asc' }, 'c1')).toEqual({ key: 'c1', direcao: 'desc' });
    expect(proximaOrdem({ key: 'c1', direcao: 'desc' }, 'c1')).toBeNull();
    expect(proximaOrdem({ key: 'c1', direcao: 'desc' }, 'c2')).toEqual({ key: 'c2', direcao: 'asc' });
  });
});
