import { describe, expect, it } from 'vitest';
import { descreverVariacao, gerarCsv, periodoDoAtalho, rotuloMes, SECOES_PADRAO, textoDoPeriodo } from './relatorios';

describe('periodoDoAtalho', () => {
  it('calcula os atalhos com datas inclusivas', () => {
    expect(periodoDoAtalho('7d', '2026-10-11')).toEqual(['2026-10-05', '2026-10-11']);
    expect(periodoDoAtalho('mes', '2026-10-11')).toEqual(['2026-10-01', '2026-10-11']);
    expect(periodoDoAtalho('mes-passado', '2026-10-11')).toEqual(['2026-09-01', '2026-09-30']);
    expect(periodoDoAtalho('mes-passado', '2026-01-15')).toEqual(['2025-12-01', '2025-12-31']);
    expect(periodoDoAtalho('outro', '2026-10-11')).toBeNull();
  });
});

describe('descreverVariacao', () => {
  it('diz se a variação é boa conforme o sentido do indicador', () => {
    expect(descreverVariacao({ atual: 12, anterior: 10, variacao: 20 })).toEqual({ texto: '+20%', direcao: 'up', bom: true });
    expect(descreverVariacao({ atual: 12, anterior: 10, variacao: 20 }, false).bom).toBe(false);
    expect(descreverVariacao({ atual: 9, anterior: 10, variacao: -2.5 }).texto).toBe('−2,5%');
  });

  it('trata falta de base de comparação', () => {
    expect(descreverVariacao({ atual: 5, anterior: 0, variacao: null }).texto).toBe('novo');
    expect(descreverVariacao({ atual: 0, anterior: 0, variacao: 0 }).texto).toBe('igual');
    expect(descreverVariacao(undefined)).toBeNull();
  });
});

describe('formatação', () => {
  it('mostra mês e período em português', () => {
    expect(rotuloMes('2026-10')).toBe('out/26');
    expect(textoDoPeriodo({ inicio: '2026-10-01', fim: '2026-10-07' })).toBe('01/10 a 07/10/2026');
    expect(textoDoPeriodo({ inicio: '2025-12-20', fim: '2026-01-05' })).toBe('20/12/2025 a 05/01/2026');
  });

  it('não inclui o ranking por pessoa no padrão', () => {
    expect(SECOES_PADRAO).not.toContain('ranking');
    expect(SECOES_PADRAO).toContain('resumo');
  });
});

describe('gerarCsv', () => {
  it('usa ponto e vírgula, aspas quando precisa e bloqueia fórmulas', () => {
    const csv = gerarCsv(['Status', 'Itens'], [['A; fazer', 3], ['=HYPERLINK("x")', 1], ['-5', 2]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"A; fazer";3');
    expect(csv).toContain(`"'=HYPERLINK(""x"")";1`);
    expect(csv).toContain('-5;2'); // número negativo continua número
  });
});
