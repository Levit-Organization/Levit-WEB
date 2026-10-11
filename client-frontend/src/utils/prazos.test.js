import { describe, expect, it } from 'vitest';
import { hojeISO, iniciais, itemConcluido, opcaoDeConclusao, situacaoDoPrazo } from './prazos';

describe('opcaoDeConclusao', () => {
  it('reconhece fim de trabalho sem ligar para acento e maiúsculas', () => {
    ['Concluído', 'ENTREGUE', 'Pago', ' finalizada ', 'Publicado'].forEach((o) => expect(opcaoDeConclusao(o)).toBe(true));
  });
  it('não confunde etapas em andamento', () => {
    ['A fazer', 'Em andamento', 'Aguardando cliente', 'Aprovação do cliente', '', null].forEach((o) =>
      expect(opcaoDeConclusao(o)).toBe(false)
    );
  });
});

describe('itemConcluido', () => {
  const campos = [{ id: 's', tipo: 'selecao' }, { id: 't', tipo: 'texto' }];
  it('olha só as colunas de lista', () => {
    expect(itemConcluido({ s: 'Entregue' }, campos)).toBe(true);
    expect(itemConcluido({ t: 'Entregue', s: 'A fazer' }, campos)).toBe(false);
  });
});

describe('situacaoDoPrazo', () => {
  const hoje = '2026-10-11';
  it('atrasado, hoje, amanhã e próximos dias', () => {
    expect(situacaoDoPrazo('2026-10-08', { hoje })).toEqual({ tipo: 'atrasado', rotulo: 'Atrasado há 3 dias' });
    expect(situacaoDoPrazo('2026-10-10', { hoje }).rotulo).toBe('Atrasado desde ontem');
    expect(situacaoDoPrazo('2026-10-11', { hoje }).tipo).toBe('hoje');
    expect(situacaoDoPrazo('2026-10-12', { hoje }).rotulo).toBe('Vence amanhã');
    expect(situacaoDoPrazo('2026-10-16', { hoje }).rotulo).toBe('Vence em 5 dias');
    expect(situacaoDoPrazo('2026-11-30', { hoje }).tipo).toBe('futuro');
  });
  it('item concluído não alarma', () => {
    expect(situacaoDoPrazo('2026-10-01', { hoje, concluido: true }).tipo).toBe('concluido');
  });
  it('ignora valores inválidos', () => {
    expect(situacaoDoPrazo('', { hoje })).toBeNull();
    expect(situacaoDoPrazo('ontem', { hoje })).toBeNull();
  });
});

describe('utilitários', () => {
  it('hojeISO usa a data local', () => {
    expect(hojeISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
  it('iniciais', () => {
    expect(iniciais('Ana Maria Souza')).toBe('AS');
    expect(iniciais('Ana')).toBe('A');
    expect(iniciais('')).toBe('?');
  });
});
