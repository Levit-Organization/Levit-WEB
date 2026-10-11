import { describe, expect, it } from 'vitest';
import { definirNaoLidasNoTitulo, definirTituloDaPagina } from './tituloDocumento';

describe('título da aba', () => {
  it('combina página e não lidas sem uma apagar a outra', () => {
    definirTituloDaPagina('Automações');
    expect(document.title).toBe('Automações · Levit');

    definirNaoLidasNoTitulo(3);
    expect(document.title).toBe('(3) Automações · Levit');

    definirTituloDaPagina('Equipe');
    expect(document.title).toBe('(3) Equipe · Levit');

    definirNaoLidasNoTitulo(150);
    expect(document.title).toBe('(99+) Equipe · Levit');

    definirNaoLidasNoTitulo(0);
    definirTituloDaPagina(null);
    expect(document.title).toBe('Levit');
  });
});
