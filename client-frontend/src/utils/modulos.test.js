import { describe, expect, it } from 'vitest';
import { agruparModelos, alteracoesDaColuna, payloadDaColuna } from './modulos';

describe('agruparModelos', () => {
  it('agrupa pelo segmento, na ordem em que aparecem; sem segmento vai para "Outros usos"', () => {
    const grupos = agruparModelos([
      { id: 'a', segmento: 'Agência' },
      { id: 'b' },
      { id: 'c', segmento: 'Agência' },
    ]);
    expect(grupos.map(([grupo, modelos]) => [grupo, modelos.map((m) => m.id)])).toEqual([
      ['Agência', ['a', 'c']],
      ['Outros usos', ['b']],
    ]);
  });
});

describe('payloadDaColuna', () => {
  it('ligação leva a tabela de destino e se aceita vários itens', () => {
    expect(payloadDaColuna({ nome: 'Cliente', tipo: 'vinculo', opcoes: null, modulo_vinculado_id: 'm1', _isNew: true })).toEqual({
      nome: 'Cliente',
      tipo: 'vinculo',
      modulo_vinculado_id: 'm1',
      opcoes: { multiplo: false },
    });
  });

  it('lista leva as opções só quando há alguma; os campos internos ficam de fora', () => {
    expect(payloadDaColuna({ nome: 'Status', tipo: 'selecao', opcoes: ['A'], _tempId: 1 })).toEqual({ nome: 'Status', tipo: 'selecao', opcoes: ['A'] });
    expect(payloadDaColuna({ nome: 'Status', tipo: 'selecao', opcoes: [] })).toEqual({ nome: 'Status', tipo: 'selecao' });
    expect(payloadDaColuna({ nome: 'Nome', tipo: 'texto', opcoes: null })).toEqual({ nome: 'Nome', tipo: 'texto' });
  });
});

describe('alteracoesDaColuna', () => {
  const original = { id: 'c1', nome: 'Status', opcoes: ['A', 'B'] };

  it('sem mudança devolve null', () => {
    expect(alteracoesDaColuna({ ...original, opcoes: ['A', 'B'] }, original)).toBeNull();
  });

  it('manda só o que mudou', () => {
    expect(alteracoesDaColuna({ ...original, nome: 'Etapa' }, original)).toEqual({ nome: 'Etapa' });
    expect(alteracoesDaColuna({ ...original, opcoes: ['A'] }, original)).toEqual({ opcoes: ['A'] });
    expect(alteracoesDaColuna({ ...original, nome: 'Etapa', opcoes: null }, original)).toEqual({ nome: 'Etapa', opcoes: null });
  });
});
