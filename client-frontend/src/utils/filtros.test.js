import { describe, expect, it } from 'vitest';
import { alvosDoFiltro, filtrosParaApi, operadoresDoTipo, regraCompleta } from './filtros';
import { idsLigados, rotuloDosLigados, tabelasLigadas } from './vinculos';

const clientes = {
  id: 'mod-c',
  nome: 'Clientes',
  acesso: true,
  campos: [
    { id: 'c-nome', nome: 'Nome', tipo: 'texto' },
    { id: 'c-cidade', nome: 'Cidade', tipo: 'texto' },
  ],
};

const pedidos = {
  id: 'mod-p',
  nome: 'Pedidos',
  campos: [
    { id: 'p-num', nome: 'Número', tipo: 'texto' },
    { id: 'p-valor', nome: 'Valor', tipo: 'numero' },
    { id: 'p-cliente', nome: 'Cliente', tipo: 'vinculo', modulo_vinculado_id: 'mod-c', modulo_vinculado: clientes },
    { id: 'p-oculto', nome: 'Segredo', tipo: 'vinculo', modulo_vinculado_id: 'mod-x', modulo_vinculado: { id: 'mod-x', nome: 'X', acesso: false, campos: [] } },
  ],
  ligacoes_recebidas: [],
};

const clientesComPedidos = {
  ...clientes,
  ligacoes_recebidas: [{ campo_id: 'p-cliente', campo_nome: 'Cliente', modulo: { ...pedidos, acesso: true } }],
};

describe('alvosDoFiltro', () => {
  it('lista as colunas da tabela, "Criado em" e as das tabelas ligadas com acesso', () => {
    const chaves = alvosDoFiltro(pedidos).map((a) => a.chave);
    expect(chaves).toEqual(['p-num', 'p-valor', 'p-cliente', 'p-oculto', 'criado_em', 'p-cliente>c-nome', 'p-cliente>c-cidade']);
    expect(alvosDoFiltro(pedidos).find((a) => a.chave === 'p-cliente>c-cidade').rotulo).toBe('Cliente › Cidade');
  });

  it('inclui as tabelas que apontam para esta, com "tem algum" e as colunas delas', () => {
    const alvos = alvosDoFiltro(clientesComPedidos);
    const existencia = alvos.find((a) => a.chave === 'p-cliente<');
    expect(existencia.campo.tipo).toBe('ligacao');
    expect(existencia.via).toEqual([{ campo: 'p-cliente', sentido: 'volta' }]);
    expect(alvos.some((a) => a.chave === 'p-cliente<p-valor')).toBe(true);
  });
});

describe('filtrosParaApi', () => {
  const alvos = alvosDoFiltro(clientesComPedidos);

  it('converte para o formato da API e deixa de fora regras incompletas', () => {
    const api = filtrosParaApi(
      {
        logica: 'ou',
        regras: [
          { alvo: 'c-cidade', operador: 'contem', valor: ' Recife ' },
          { alvo: 'c-nome', operador: 'igual', valor: '' },
          { alvo: 'p-cliente<p-valor', operador: 'entre', valor: '10', valor_ate: '20' },
          { alvo: 'p-cliente<', operador: 'vazio' },
          { alvo: '', operador: '' },
        ],
      },
      alvos
    );

    expect(api).toEqual({
      logica: 'ou',
      regras: [
        { campo: 'c-cidade', operador: 'contem', valor: 'Recife' },
        { campo: 'p-valor', operador: 'entre', valor: '10', valor_ate: '20', via: [{ campo: 'p-cliente', sentido: 'volta' }] },
        { campo: '', operador: 'vazio', via: [{ campo: 'p-cliente', sentido: 'volta' }] },
      ],
    });
  });

  it('sem nenhuma regra completa não filtra', () => {
    expect(filtrosParaApi({ logica: 'e', regras: [{ alvo: 'c-nome', operador: 'contem', valor: '  ' }] }, alvos)).toBeNull();
  });

  it('recusa operador que não vale para o tipo', () => {
    const alvo = alvos.find((a) => a.chave === 'c-nome');
    expect(regraCompleta({ alvo: 'c-nome', operador: 'maior', valor: '3' }, alvo)).toBe(false);
    expect(regraCompleta({ alvo: 'c-nome', operador: 'contem', valor: '3' }, alvo)).toBe(true);
  });
});

describe('operadoresDoTipo', () => {
  it('fala a língua de cada tipo', () => {
    expect(operadoresDoTipo('data').find((o) => o.value === 'maior').label).toBe('depois de');
    expect(operadoresDoTipo('ligacao').map((o) => o.label)).toEqual(['tem algum item', 'não tem nenhum item']);
  });
});

describe('vinculos', () => {
  it('lê um id ou uma lista e mostra os nomes', () => {
    expect(idsLigados('a')).toEqual(['a']);
    expect(idsLigados(['a', 'b'])).toEqual(['a', 'b']);
    expect(idsLigados(null)).toEqual([]);
    expect(rotuloDosLigados(['a', 'b'], { a: 'Ana', b: '' })).toBe('Ana, Item sem nome');
    expect(rotuloDosLigados(['a', 'b'], undefined)).toBe('2 itens ligados');
    expect(rotuloDosLigados(null, {})).toBeNull();
  });

  it('busca nomes só das tabelas ligadas que a pessoa vê', () => {
    expect(tabelasLigadas(pedidos.campos)).toEqual(['mod-c']);
  });
});
