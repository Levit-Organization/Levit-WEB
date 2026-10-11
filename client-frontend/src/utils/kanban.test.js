import { describe, expect, it } from 'vitest';
import { localizarCandidato, moverCandidatoNoFunil } from './kanban';

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
