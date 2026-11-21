import { describe, expect, it } from 'vitest';
import {
  destinoDaTabela,
  itensDeAtencao,
  plural,
  resumirAutomacoes,
  resumirVaga,
  saudacaoDaHora,
  separarModulos,
} from './dashboard';

describe('plural', () => {
  it('usa o singular só para 1', () => {
    expect(plural(1, 'item', 'itens')).toBe('1 item');
    expect(plural(0, 'item', 'itens')).toBe('0 itens');
    expect(plural(3, 'item', 'itens')).toBe('3 itens');
  });
});

describe('destinoDaTabela', () => {
  it('leva cada tipo à sua tela', () => {
    expect(destinoDaTabela({ id: 'm1', tipo: 'financeiro' })).toBe('/modulos/m1/financeiro');
    expect(destinoDaTabela({ id: 'm2', tipo: 'recrutamento' })).toBe('/recrutamento');
    expect(destinoDaTabela({ id: 'm3', tipo: 'dados' })).toBe('/modulos/m3/registros');
  });
});

describe('saudacaoDaHora', () => {
  it('troca ao meio-dia e às 18h', () => {
    expect(saudacaoDaHora(0)).toBe('Bom dia');
    expect(saudacaoDaHora(11)).toBe('Bom dia');
    expect(saudacaoDaHora(12)).toBe('Boa tarde');
    expect(saudacaoDaHora(17)).toBe('Boa tarde');
    expect(saudacaoDaHora(18)).toBe('Boa noite');
  });
});

describe('separarModulos', () => {
  it('separa vagas das tabelas e soma os itens das tabelas', () => {
    const r = separarModulos([
      { id: 'a', tipo: 'dados', total_registros: '2' },
      { id: 'b', tipo: 'recrutamento', total_registros: 9 },
      { id: 'c', tipo: 'financeiro' },
    ]);
    expect(r.tabelas.map((m) => m.id)).toEqual(['a', 'c']);
    expect(r.vagas.map((m) => m.id)).toEqual(['b']);
    expect(r.totalItens).toBe(2);
  });
});

describe('resumirVaga', () => {
  it('conta candidatos e parados (pela última atualização ou criação)', () => {
    const parado = (data) => data === 'velho';
    const r = resumirVaga(
      {
        f1: { fase: 'A', candidatos: [{ criado_em: 'velho' }, { atualizado_em: 'novo', criado_em: 'velho' }] },
        f2: { fase: 'B' },
      },
      parado
    );
    expect(r.fasesDaVaga.map(([id]) => id)).toEqual(['f1', 'f2']);
    expect(r.totalCandidatosVaga).toBe(2);
    expect(r.paradosVaga).toBe(1);
  });

  it('sem quadro, tudo zerado', () => {
    expect(resumirVaga(null)).toEqual({ fasesDaVaga: [], totalCandidatosVaga: 0, paradosVaga: 0 });
  });
});

describe('resumirAutomacoes', () => {
  it('soma ligadas, execuções e falhas e separa as pausadas por falhas', () => {
    const pausada = { id: 3, ativo: false, pausada_por_falhas_em: 'x', estatisticas: { falhas_7d: 2 } };
    const r = resumirAutomacoes([
      { id: 1, ativo: true, estatisticas: { execucoes_7d: 4, falhas_7d: 1 } },
      { id: 2, ativo: false },
      pausada,
      { id: 4, ativo: true, pausada_por_falhas_em: 'x' },
    ]);
    expect(r).toEqual({ ativas: 2, execucoes: 4, falhas: 3, pausadas: [pausada] });
  });
});

describe('itensDeAtencao', () => {
  const vazio = { atrasados: [], pausadas: [], paradosVaga: 0, vagaDestaque: null, convites: [] };

  it('sem pendências, lista vazia', () => {
    expect(itensDeAtencao(vazio)).toEqual([]);
  });

  it('ordena por urgência', () => {
    const itens = itensDeAtencao({
      atrasados: [{ modulo_id: 'm9', meu: false }],
      pausadas: [{ id: 'a1', nome: 'X' }],
      paradosVaga: 2,
      vagaDestaque: { nome: 'Dev' },
      convites: [{ expirado: true }, { expirado: true }, { expirado: false }],
    });
    expect(itens.map((i) => i.id)).toEqual(['atrasados', 'aut-a1', 'parados', 'convites-vencidos', 'convites']);
    expect(itens[0]).toMatchObject({ titulo: '1 item atrasado', texto: 'Nenhum com você. Veja em Prazos.', to: '/modulos/m9/registros' });
    expect(itens[2]).toMatchObject({ titulo: '2 candidatos parados há mais de 14 dias', texto: 'Em Dev.' });
    expect(itens[3].titulo).toBe('2 convites venceram sem resposta');
    expect(itens[4].titulo).toBe('1 convite aguardando resposta');
  });

  it('conta os atrasados que são da pessoa', () => {
    const [item] = itensDeAtencao({ ...vazio, atrasados: [{ modulo_id: 'm1', meu: true }, { modulo_id: 'm2', meu: true }] });
    expect(item.texto).toBe('2 estão com você. Veja em Prazos.');
  });
});
