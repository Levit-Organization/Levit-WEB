import { describe, expect, it } from 'vitest';
import { mascararCpfCnpj, mascararTelefone } from './masks';

describe('mascararTelefone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['119', '(11) 9'],
    ['1199999', '(11) 9999-9'],
    ['1133334444', '(11) 3333-4444'],
    ['11999998888', '(11) 99999-8888'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(mascararTelefone(entrada)).toBe(esperado);
  });

  it('ignora letras e corta além de 11 dígitos', () => {
    expect(mascararTelefone('(11) 99999-8888 ramal 12')).toBe('(11) 99999-8888');
  });

  it('aceita null e undefined', () => {
    expect(mascararTelefone(null)).toBe('');
    expect(mascararTelefone(undefined)).toBe('');
  });
});

describe('mascararCpfCnpj', () => {
  it('formata CPF', () => {
    expect(mascararCpfCnpj('12345678901')).toBe('123.456.789-01');
  });

  it('formata CPF parcial enquanto digita', () => {
    expect(mascararCpfCnpj('1234')).toBe('123.4');
  });

  it('formata CNPJ quando passa de 11 dígitos', () => {
    expect(mascararCpfCnpj('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('corta além de 14 dígitos', () => {
    expect(mascararCpfCnpj('123456780001959999')).toBe('12.345.678/0001-95');
  });
});
