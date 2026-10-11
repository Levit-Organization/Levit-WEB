import { describe, expect, it } from 'vitest';
import { converterCelula, decodificarTexto, lerCsv, mapearColunas, prepararItens } from './importacao';

describe('lerCsv', () => {
  it('lê o CSV do Excel brasileiro (ponto e vírgula, aspas, quebra de linha)', () => {
    const csv = 'Cliente;Valor;Obs\r\nPadaria;"1.234,56";"tem ""aspas"""\r\n"Oficina; do Zé";10;"duas\nlinhas"\r\n\r\n';
    expect(lerCsv(csv)).toEqual([
      ['Cliente', 'Valor', 'Obs'],
      ['Padaria', '1.234,56', 'tem "aspas"'],
      ['Oficina; do Zé', '10', 'duas\nlinhas'],
    ]);
  });
  it('aceita vírgula como separador', () => {
    expect(lerCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('decodificarTexto', () => {
  it('cai para Windows-1252 quando não é UTF-8', () => {
    const latin1 = new Uint8Array([0x43, 0x6c, 0xed, 0x6e, 0x69, 0x63, 0x61]); // "Clínica"
    expect(decodificarTexto(latin1.buffer)).toBe('Clínica');
  });
});

describe('converterCelula', () => {
  const pessoas = [{ id: 'u1', nome: 'Ana Souza' }, { id: 'u2', nome: 'Bruno Lima' }, { id: 'u3', nome: 'Ana Paula' }];
  it('números no formato brasileiro e inglês', () => {
    expect(converterCelula('R$ 1.234,56', { tipo: 'numero' })).toEqual({ valor: 1234.56 });
    expect(converterCelula('1,234.5', { tipo: 'numero' })).toEqual({ valor: 1234.5 });
    expect(converterCelula('abc', { tipo: 'numero', nome: 'Valor' }).erro).toBeTruthy();
  });
  it('datas DD/MM/AAAA, AAAA-MM-DD e do Excel', () => {
    expect(converterCelula('20/10/2026', { tipo: 'prazo' })).toEqual({ valor: '2026-10-20' });
    expect(converterCelula('5/3/26', { tipo: 'data' })).toEqual({ valor: '2026-03-05' });
    expect(converterCelula(new Date(Date.UTC(2026, 9, 20)), { tipo: 'prazo' })).toEqual({ valor: '2026-10-20' });
    expect(converterCelula('31/02/2026', { tipo: 'prazo' }).erro).toBeTruthy();
  });
  it('opções sem ligar para acento e maiúsculas', () => {
    expect(converterCelula('entregue', { tipo: 'selecao', opcoes: ['A fazer', 'Entregue'] })).toEqual({ valor: 'Entregue' });
    expect(converterCelula('Pago', { tipo: 'selecao', nome: 'Status', opcoes: ['A fazer'] }).erro).toContain('Status');
  });
  it('responsável pelo nome completo ou primeiro nome único', () => {
    expect(converterCelula('bruno', { tipo: 'responsavel' }, pessoas)).toEqual({ valor: 'u2' });
    expect(converterCelula('Ana Souza', { tipo: 'responsavel' }, pessoas)).toEqual({ valor: 'u1' });
    expect(converterCelula('Ana', { tipo: 'responsavel' }, pessoas).erro).toContain('ambíguo');
  });
  it('repetição pelo nome ou pelo rótulo', () => {
    expect(converterCelula('Mensal', { tipo: 'recorrencia' })).toEqual({ valor: 'mensal' });
    expect(converterCelula('Todo mês', { tipo: 'recorrencia' })).toEqual({ valor: 'mensal' });
  });
  it('célula vazia não importa nada', () => {
    expect(converterCelula('  ', { tipo: 'texto' })).toEqual({});
  });
});

describe('prepararItens', () => {
  const campos = [
    { id: 'c1', nome: 'Cliente', tipo: 'texto' },
    { id: 'c2', nome: 'Vencimento', tipo: 'prazo' },
    { id: 'c3', nome: 'Status', tipo: 'selecao', opcoes: ['A fazer', 'Entregue'] },
  ];
  it('casa colunas pelo nome e separa as linhas com problema', () => {
    const [cabecalho, ...linhas] = [['status', 'CLIENTE', 'Vencimento', 'Extra'], ['a fazer', 'Padaria', '20/10/2026', 'x'], ['Pago', 'Oficina', '21/10/2026', 'y']];
    const mapa = mapearColunas(cabecalho, campos);
    expect(mapa).toEqual({ c1: 1, c2: 2, c3: 0 });
    const { itens, problemas } = prepararItens(linhas, campos, mapa);
    expect(itens).toEqual([{ linha: 2, dados: { c1: 'Padaria', c2: '2026-10-20', c3: 'A fazer' } }]);
    expect(problemas).toEqual([{ linha: 3, mensagem: 'Status: "Pago" não é uma opção de Status' }]);
  });
});
