import { describe, expect, it } from 'vitest';
import { MAX_MENSAGEM, desde, diasAte, filtrarMembros, validarMembro } from './equipe';

describe('desde', () => {
  it('formata a data do backend em pt-BR', () => {
    expect(desde('2026-10-12 10:00:00')).toMatch(/^12 de out\.? de 2026$/);
  });

  it('data vazia ou inválida vira null', () => {
    expect(desde(null)).toBeNull();
    expect(desde('ontem')).toBeNull();
  });
});

describe('diasAte', () => {
  const agora = new Date('2026-11-12T12:00:00').getTime();

  it('conta os dias que faltam, arredondando para cima', () => {
    expect(diasAte('2026-11-15 12:00:00', agora)).toBe(3);
    expect(diasAte('2026-11-12 18:00:00', agora)).toBe(1);
  });

  it('data passada dá número negativo ou zero', () => {
    expect(diasAte('2026-11-10 12:00:00', agora)).toBe(-2);
  });

  it('data inválida vira null', () => {
    expect(diasAte('', agora)).toBeNull();
  });
});

describe('validarMembro', () => {
  const valido = { email: 'ana@acme.com', cargo: 'c1', mensagem: '' };

  it('formulário completo não tem erros', () => {
    expect(validarMembro(valido)).toEqual({});
  });

  it('exige e-mail válido e cargo', () => {
    expect(validarMembro({ ...valido, email: '  ', cargo: '' })).toEqual({
      email: 'Informe o e-mail.',
      cargo: 'Selecione um cargo para o colaborador.',
    });
    expect(validarMembro({ ...valido, email: 'ana@acme' }).email).toBe('Esse e-mail não parece válido.');
  });

  it('limita o tamanho da mensagem', () => {
    expect(validarMembro({ ...valido, mensagem: 'a'.repeat(MAX_MENSAGEM) })).toEqual({});
    expect(validarMembro({ ...valido, mensagem: 'a'.repeat(MAX_MENSAGEM + 1) }).mensagem).toBe(
      `Use no máximo ${MAX_MENSAGEM} caracteres.`
    );
  });
});

describe('filtrarMembros', () => {
  const roles = [
    { id: 1, nome: 'Admin' },
    { id: 2, nome: 'Vendas' },
  ];
  const ana = { id: 'a', nome: 'Ana Souza', email: 'ana@acme.com', cargo_id: 1, cargo: 'Admin' };
  const beto = { id: 'b', nome: 'Beto', email: 'beto@acme.com', cargo: { id: 2, nome: 'Vendas' } };
  const caio = { id: 'c', nome: 'Caio', email: 'caio@acme.com', cargo: 'vendas' };
  const membros = [ana, beto, caio];

  it('sem filtro devolve todos', () => {
    expect(filtrarMembros(membros, roles, '', '')).toEqual(membros);
  });

  it('busca por nome ou e-mail', () => {
    expect(filtrarMembros(membros, roles, 'souza', '')).toEqual([ana]);
    expect(filtrarMembros(membros, roles, 'beto@', '')).toEqual([beto]);
  });

  it('filtra pelo id do cargo, em qualquer formato, ou pelo nome do cargo', () => {
    expect(filtrarMembros(membros, roles, '', '1')).toEqual([ana]);
    expect(filtrarMembros(membros, roles, '', 2)).toEqual([beto, caio]);
  });

  it('combina busca e cargo', () => {
    expect(filtrarMembros(membros, roles, 'caio', '2')).toEqual([caio]);
    expect(filtrarMembros(membros, roles, 'ana', '2')).toEqual([]);
  });
});
