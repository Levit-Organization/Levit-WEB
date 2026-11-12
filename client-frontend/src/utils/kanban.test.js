import { describe, expect, it } from 'vitest';
import {
  contarCandidatos,
  filtrarColunasPorNome,
  localizarCandidato,
  moverCandidatoNoFunil,
  normalizarBusca,
} from './kanban';

const ana = { id: 'a', nome: 'Ana' };
const beto = { id: 'b', nome: 'Beto' };

const funil = () => ({
  novo: { fase: 'Novo', candidatos: [ana, beto], total: 2 },
  entrevista: { fase: 'Entrevista', candidatos: [], total: 0 },
  contratado: { fase: 'Contratado', candidatos: [], total: 0 },
});

describe('moverCandidatoNoFunil', () => {
  it('move o candidato e ajusta os totais', () => {
    const resultado = moverCandidatoNoFunil(funil(), ana, 'novo', 'entrevista');
    expect(resultado.novo.candidatos).toEqual([beto]);
    expect(resultado.novo.total).toBe(1);
    expect(resultado.entrevista.candidatos).toEqual([ana]);
    expect(resultado.entrevista.total).toBe(1);
  });

  it('não muta o funil original', () => {
    const original = funil();
    moverCandidatoNoFunil(original, ana, 'novo', 'entrevista');
    expect(original.novo.candidatos).toHaveLength(2);
    expect(original.entrevista.candidatos).toHaveLength(0);
  });

  it('mantém a referência das colunas que não mudaram (React.memo)', () => {
    const original = funil();
    const resultado = moverCandidatoNoFunil(original, ana, 'novo', 'entrevista');
    expect(resultado.contratado).toBe(original.contratado);
  });

  it('não duplica o candidato se ele já estiver no destino', () => {
    const original = funil();
    original.entrevista = { fase: 'Entrevista', candidatos: [ana], total: 1 };
    const resultado = moverCandidatoNoFunil(original, ana, 'novo', 'entrevista');
    expect(resultado.entrevista.candidatos).toHaveLength(1);
  });

  it('retorna o mesmo funil se origem = destino ou coluna não existe', () => {
    const original = funil();
    expect(moverCandidatoNoFunil(original, ana, 'novo', 'novo')).toBe(original);
    expect(moverCandidatoNoFunil(original, ana, 'novo', 'inexistente')).toBe(original);
    expect(moverCandidatoNoFunil(null, ana, 'novo', 'entrevista')).toBeNull();
  });

  it('o total da origem nunca fica negativo', () => {
    const original = funil();
    original.novo.total = 0;
    expect(moverCandidatoNoFunil(original, ana, 'novo', 'entrevista').novo.total).toBe(0);
  });

  it('rollback: mover de volta restaura as listas', () => {
    const ida = moverCandidatoNoFunil(funil(), ana, 'novo', 'entrevista');
    const volta = moverCandidatoNoFunil(ida, ana, 'entrevista', 'novo');
    expect(volta.novo.candidatos.map((c) => c.id).sort()).toEqual(['a', 'b']);
    expect(volta.entrevista.candidatos).toEqual([]);
  });
});

describe('localizarCandidato', () => {
  it('acha o candidato com coluna e nome da fase', () => {
    expect(localizarCandidato(funil(), 'b')).toEqual({ candidato: beto, colId: 'novo', fase: 'Novo' });
  });

  it('retorna null quando não existe ou faltam argumentos', () => {
    expect(localizarCandidato(funil(), 'x')).toBeNull();
    expect(localizarCandidato(null, 'a')).toBeNull();
    expect(localizarCandidato(funil(), '')).toBeNull();
  });
});

describe('normalizarBusca', () => {
  it('tira acentos e deixa em minúsculas', () => {
    expect(normalizarBusca('ÁNA Conceição')).toBe('ana conceicao');
  });

  it('valor vazio vira texto vazio', () => {
    expect(normalizarBusca(null)).toBe('');
    expect(normalizarBusca(undefined)).toBe('');
  });
});

describe('contarCandidatos', () => {
  it('soma os candidatos de todas as colunas', () => {
    expect(contarCandidatos(Object.entries(funil()))).toBe(2);
  });

  it('coluna sem lista conta como zero', () => {
    expect(contarCandidatos([['x', { fase: 'X' }], ['novo', funil().novo]])).toBe(2);
    expect(contarCandidatos([])).toBe(0);
  });
});

describe('filtrarColunasPorNome', () => {
  it('sem termo devolve as mesmas colunas', () => {
    const colunas = Object.entries(funil());
    expect(filtrarColunasPorNome(colunas, '')).toBe(colunas);
  });

  it('filtra pelo nome ignorando acento e ajusta o total de cada coluna', () => {
    const novo = { fase: 'Novo', candidatos: [ana, beto, { id: 'c', nome: 'Bétânia' }], total: 3 };
    const colunas = Object.entries({ ...funil(), novo });
    const resultado = Object.fromEntries(filtrarColunasPorNome(colunas, 'bet'));
    expect(resultado.novo.candidatos.map((c) => c.id)).toEqual(['b', 'c']);
    expect(resultado.novo.total).toBe(2);
    expect(resultado.entrevista).toEqual({ fase: 'Entrevista', candidatos: [], total: 0 });
  });

  it('não muta as colunas originais', () => {
    const colunas = Object.entries(funil());
    filtrarColunasPorNome(colunas, 'ana');
    expect(colunas[0][1].candidatos).toHaveLength(2);
  });
});
