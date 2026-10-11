import { describe, expect, it } from 'vitest';
import {
  acaoValida,
  acoesDoModulo,
  condicoesDaAutomacao,
  duracao,
  gatilhoDeMudanca,
  gatilhosDoModulo,
  regraValida,
  gatilhosDaAutomacao,
  montarDefinicao,
  quando,
  rotuloRegistro,
} from './automacaoConstants';

describe('quando', () => {
  const agora = new Date('2026-10-10T12:00:00').getTime();

  it.each([
    ['2026-10-10 11:59:40', 'agora'],
    ['2026-10-10 11:55:00', 'há 5 min'],
    ['2026-10-10 09:00:00', 'há 3 h'],
  ])('%s -> %s', (valor, esperado) => {
    expect(quando(valor, agora)).toBe(esperado);
  });

  it('mais de um dia mostra a data completa', () => {
    expect(quando('2026-10-01 08:30:00', agora)).toMatch(/01\/10\/2026/);
  });

  it('valor vazio ou inválido vira travessão', () => {
    expect(quando(null, agora)).toBe('—');
    expect(quando('xyz', agora)).toBe('—');
  });
});

describe('duracao', () => {
  it('ms abaixo de 1 s e segundos com vírgula acima', () => {
    expect(duracao(320)).toBe('320 ms');
    expect(duracao(1530)).toBe('1,5 s');
    expect(duracao(null)).toBe('');
  });
});

describe('gatilhosDaAutomacao', () => {
  it('usa a lista nova e cai no gatilho único antigo', () => {
    expect(gatilhosDaAutomacao({ gatilhos: ['criacao', 'exclusao'], gatilho: 'criacao' })).toEqual(['criacao', 'exclusao']);
    expect(gatilhosDaAutomacao({ gatilho: 'atualizacao' })).toEqual(['atualizacao']);
    expect(gatilhosDaAutomacao({})).toEqual([]);
  });
});

describe('montarDefinicao', () => {
  const base = {
    nome: '  Avisar RH ',
    gatilhos: ['criacao', 'atualizacao'],
    logica: 'ou',
    regras: [
      { campo: 'c1', operador: 'igual', valor: 'Sim', valor_de: 'lixo' },
      { campo: 'c2', operador: 'preenchido', valor: 'ignorado', valor_de: '' },
      { campo: 'c3', operador: 'mudou_de_para', valor: 'B', valor_de: 'A' },
    ],
    acoes: [{ tipo: 'webhook', configuracao: { url: 'https://x.com' }, extra: 'ignorado' }],
  };

  it('com condições envia a lógica e limpa valores que o operador não usa', () => {
    expect(montarDefinicao({ ...base, temCondicao: true })).toEqual({
      nome: 'Avisar RH',
      gatilhos: ['criacao', 'atualizacao'],
      condicoes: {
        logica: 'ou',
        regras: [
          { campo: 'c1', operador: 'igual', valor: 'Sim', valor_de: null },
          { campo: 'c2', operador: 'preenchido', valor: null, valor_de: null },
          { campo: 'c3', operador: 'mudou_de_para', valor: 'B', valor_de: 'A' },
        ],
      },
      acoes: [{ tipo: 'webhook', configuracao: { url: 'https://x.com' } }],
    });
  });

  it('sem condições envia null (a atualização remove as antigas)', () => {
    expect(montarDefinicao({ ...base, temCondicao: false }).condicoes).toBeNull();
    expect(montarDefinicao({ ...base, temCondicao: true, regras: [] }).condicoes).toBeNull();
  });
});

describe('regraValida', () => {
  const base = { campo: 'c1', valor: '', valor_de: '' };

  it('operadores sem valor dispensam valor; os outros exigem', () => {
    for (const operador of ['mudou', 'vazio', 'preenchido']) {
      expect(regraValida({ ...base, operador })).toBe(true);
    }
    expect(regraValida({ ...base, operador: 'igual' })).toBe(false);
    expect(regraValida({ ...base, operador: 'contem', valor: 'x' })).toBe(true);
    expect(regraValida({ ...base, campo: '', operador: 'vazio' })).toBe(false);
  });

  it('"mudou de… para…" exige origem e destino', () => {
    expect(regraValida({ ...base, operador: 'mudou_de_para', valor: 'X' })).toBe(false);
    expect(regraValida({ ...base, operador: 'mudou_de_para', valor: 'X', valor_de: 'Y' })).toBe(true);
  });

  it('aceita 0 como valor', () => {
    expect(regraValida({ ...base, operador: 'maior', valor: 0 })).toBe(true);
  });
});

describe('condicoesDaAutomacao', () => {
  it('prefere o formato novo e converte o antigo', () => {
    const nova = { logica: 'ou', regras: [{ campo: 'x', operador: 'vazio' }] };
    expect(condicoesDaAutomacao({ condicoes: nova, campo_condicao_id: 'c1' })).toBe(nova);
    expect(condicoesDaAutomacao({ campo_condicao_id: 'c1', condicao_operador: 'mudou_para', condicao_valor: 'Fechado' })).toEqual({
      logica: 'e',
      regras: [{ campo: 'c1', operador: 'mudou_para', valor: 'Fechado', valor_de: '' }],
    });
    expect(condicoesDaAutomacao({})).toBeNull();
  });
});

describe('gatilhos e ações por tipo de módulo', () => {
  it('vagas usam gatilhos de candidato e não têm ações sobre registros', () => {
    const vaga = { tipo: 'recrutamento' };
    expect(gatilhosDoModulo(vaga)).toEqual(['candidato_criado', 'candidato_mudou_etapa']);
    expect(gatilhoDeMudanca(vaga)).toBe('candidato_mudou_etapa');
    expect(acoesDoModulo(vaga)).not.toContain('atualizar_campo');
    expect(acoesDoModulo(vaga)).not.toContain('criar_registro');
  });

  it('módulos de dados usam gatilhos de registro e todas as ações', () => {
    const dados = { tipo: 'dados' };
    expect(gatilhosDoModulo(dados)).toEqual(['criacao', 'atualizacao', 'exclusao']);
    expect(gatilhoDeMudanca(dados)).toBe('atualizacao');
    expect(acoesDoModulo(dados)).toEqual(expect.arrayContaining(['atualizar_campo', 'criar_registro', 'notificacao']));
  });
});

describe('acaoValida (ações sobre dados)', () => {
  it('atualizar campo exige o campo; criar registro exige destino e um campo preenchido', () => {
    expect(acaoValida({ tipo: 'atualizar_campo', configuracao: { campo_id: 'c1', valor: '' } })).toBe(true);
    expect(acaoValida({ tipo: 'atualizar_campo', configuracao: { campo_id: '' } })).toBe(false);
    expect(acaoValida({ tipo: 'criar_registro', configuracao: { modulo_destino_id: 'm2', mapeamento: { a: '  ' } } })).toBe(false);
    expect(acaoValida({ tipo: 'criar_registro', configuracao: { modulo_destino_id: 'm2', mapeamento: { a: '{{Nome}}' } } })).toBe(true);
  });
});

describe('acaoValida (notificação)', () => {
  it('exige título e, fora de "todos", o destino', () => {
    expect(acaoValida({ tipo: 'notificacao', configuracao: { destinatarios: 'todos', titulo: 'Oi' } })).toBe(true);
    expect(acaoValida({ tipo: 'notificacao', configuracao: { destinatarios: 'todos', titulo: '  ' } })).toBe(false);
    expect(acaoValida({ tipo: 'notificacao', configuracao: { destinatarios: 'cargo', titulo: 'Oi', destino_id: '' } })).toBe(false);
    expect(acaoValida({ tipo: 'notificacao', configuracao: { destinatarios: 'cargo', titulo: 'Oi', destino_id: 'k' } })).toBe(true);
    expect(acaoValida({ tipo: 'notificacao', configuracao: { destinatarios: 'responsavel', titulo: 'Vence hoje' } })).toBe(true);
  });
});

describe('rotuloRegistro', () => {
  it('usa o primeiro valor preenchido, ignorando vazios e listas', () => {
    expect(rotuloRegistro({ id: 'abc', dados: { a: '', b: ['x'], c: 'Ana Souza' } })).toBe('Ana Souza');
  });

  it('sem valores, usa o início do id', () => {
    expect(rotuloRegistro({ id: '0123456789', dados: {} })).toBe('Registro 01234567');
  });
});
