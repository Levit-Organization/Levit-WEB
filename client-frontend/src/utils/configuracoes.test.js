import { describe, expect, it } from 'vitest';
import { erroDaImagem, erroDaNovaSenha, trocarIconeNaLista } from './configuracoes';
import { TAMANHO_MAXIMO_IMAGEM } from './avatarStorage';

describe('erroDaImagem', () => {
  it('aceita imagens de até 2 MB', () => {
    expect(erroDaImagem({ type: 'image/jpeg', size: TAMANHO_MAXIMO_IMAGEM })).toBeNull();
  });

  it('recusa o que não é imagem', () => {
    expect(erroDaImagem({ type: 'application/pdf', size: 10 })).toBe('Escolha um arquivo de imagem.');
  });

  it('recusa imagem maior que 2 MB', () => {
    expect(erroDaImagem({ type: 'image/png', size: TAMANHO_MAXIMO_IMAGEM + 1 })).toBe('A imagem precisa ter no máximo 2 MB.');
  });
});

describe('erroDaNovaSenha', () => {
  it('exige pelo menos 8 caracteres antes de comparar', () => {
    expect(erroDaNovaSenha({ nova: '1234567', confirmar: 'x' })).toBe('A nova senha precisa ter pelo menos 8 caracteres.');
  });

  it('exige que a confirmação seja igual', () => {
    expect(erroDaNovaSenha({ nova: '12345678', confirmar: '12345679' })).toBe('A confirmação não corresponde à nova senha.');
  });

  it('aceita senha válida e confirmada', () => {
    expect(erroDaNovaSenha({ nova: '12345678', confirmar: '12345678' })).toBeNull();
  });
});

describe('trocarIconeNaLista', () => {
  it('troca só o ícone da tabela indicada, sem mexer na lista original', () => {
    const lista = [
      { id: 'a', icone: 'group' },
      { id: 'b', icone: 'work' },
    ];
    const nova = trocarIconeNaLista(lista, 'b', 'star');
    expect(nova).toEqual([
      { id: 'a', icone: 'group' },
      { id: 'b', icone: 'star' },
    ]);
    expect(nova[0]).toBe(lista[0]);
    expect(lista[1].icone).toBe('work');
  });

  it('sem lista no cache, continua sem', () => {
    expect(trocarIconeNaLista(undefined, 'a', 'star')).toBeUndefined();
  });
});
