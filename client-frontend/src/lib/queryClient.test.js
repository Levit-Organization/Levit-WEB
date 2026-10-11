import { describe, expect, it } from 'vitest';
import { mensagemDeErro, queryClient } from './queryClient';

const erroHttp = (status, data) => ({ response: { status, data } });

describe('mensagemDeErro', () => {
  it('usa a mensagem da API', () => {
    expect(mensagemDeErro(erroHttp(422, { message: 'Inválido' }))).toBe('Inválido');
  });

  it('anexa os erros de validação por campo', () => {
    const erro = erroHttp(422, { message: 'Dados inválidos.', errors: { email: 'E-mail já usado.', cpf: 'CPF inválido.' } });
    expect(mensagemDeErro(erro)).toBe('Dados inválidos. E-mail já usado. CPF inválido.');
  });

  it('cai no texto padrão sem resposta da API', () => {
    expect(mensagemDeErro(new Error('rede'))).toBe('Algo deu errado. Tente novamente.');
    expect(mensagemDeErro(undefined, 'Falhou')).toBe('Falhou');
  });
});

describe('política de retry', () => {
  const retry = queryClient.getDefaultOptions().queries.retry;

  it('não repete erros 4xx', () => {
    expect(retry(0, erroHttp(403))).toBe(false);
    expect(retry(0, erroHttp(404))).toBe(false);
  });

  it('repete erros 5xx e de rede até 2 vezes', () => {
    expect(retry(0, erroHttp(500))).toBe(true);
    expect(retry(1, new Error('rede'))).toBe(true);
    expect(retry(2, erroHttp(500))).toBe(false);
  });
});
