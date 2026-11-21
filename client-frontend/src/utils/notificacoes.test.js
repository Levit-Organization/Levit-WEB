import { describe, expect, it } from 'vitest';
import { agruparPorDia } from './notificacoes';

describe('agruparPorDia', () => {
  const agora = new Date('2026-10-10T15:00:00');

  it('separa em Hoje, Ontem e data, mantendo a ordem', () => {
    const grupos = agruparPorDia(
      [
        { id: 1, criado_em: '2026-10-10 14:00:00' },
        { id: 2, criado_em: '2026-10-10 08:00:00' },
        { id: 3, criado_em: '2026-10-09 22:00:00' },
        { id: 4, criado_em: '2026-10-01 10:00:00' },
      ],
      agora
    );

    expect(grupos.map((g) => g.rotulo)).toEqual(['Hoje', 'Ontem', '01 de outubro']);
    expect(grupos[0].itens.map((n) => n.id)).toEqual([1, 2]);
  });

  it('lista vazia não gera grupos', () => {
    expect(agruparPorDia([], agora)).toEqual([]);
  });
});
