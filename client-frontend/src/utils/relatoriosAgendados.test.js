import { describe, expect, it } from 'vitest';
import { hojeISO } from './prazos';
import { SECOES_PADRAO } from './relatorios';
import {
  alternarNaLista,
  COBERTURA_DA_FREQUENCIA,
  dataCurta,
  dataHora,
  FREQUENCIAS,
  opcoesDoDia,
  periodoDoEnvio,
  problemaDoRelatorio,
  RELATORIO_VAZIO,
  relatorioParaApi,
} from './relatoriosAgendados';

describe('RELATORIO_VAZIO', () => {
  it('começa semanal, na segunda, ligado e com as partes padrão', () => {
    expect(RELATORIO_VAZIO).toEqual({ nome: '', frequencia: 'semanal', dia: 1, destinatarios: [], secoes: SECOES_PADRAO, ativo: true });
  });

  it('toda frequência tem o texto do que cobre', () => {
    expect(FREQUENCIAS.map(([valor]) => valor)).toEqual(Object.keys(COBERTURA_DA_FREQUENCIA));
  });
});

describe('alternarNaLista', () => {
  it('tira o que já está e põe no fim o que falta, sem mexer na original', () => {
    const lista = ['a', 'b'];
    expect(alternarNaLista(lista, 'a')).toEqual(['b']);
    expect(alternarNaLista(lista, 'c')).toEqual(['a', 'b', 'c']);
    expect(lista).toEqual(['a', 'b']);
  });
});

describe('opcoesDoDia', () => {
  it('semanal: os 7 dias, começando na segunda', () => {
    const opcoes = opcoesDoDia('semanal');
    expect(opcoes).toHaveLength(7);
    expect(opcoes[0]).toEqual({ value: 1, label: 'Segunda-feira' });
    expect(opcoes[6]).toEqual({ value: 7, label: 'Domingo' });
  });

  it('mensal: do dia 1 ao 28', () => {
    const opcoes = opcoesDoDia('mensal');
    expect(opcoes).toHaveLength(28);
    expect(opcoes[27]).toEqual({ value: 28, label: 'Dia 28' });
  });
});

describe('problemaDoRelatorio', () => {
  const valido = { ...RELATORIO_VAZIO, nome: 'Resumo', destinatarios: ['u1'] };

  it('aponta o primeiro problema, na ordem do formulário', () => {
    expect(problemaDoRelatorio({ ...RELATORIO_VAZIO, nome: '  ' })).toBe('Dê um nome ao relatório.');
    expect(problemaDoRelatorio({ ...valido, destinatarios: [] })).toBe('Escolha quem recebe o relatório.');
    expect(problemaDoRelatorio({ ...valido, secoes: [] })).toBe('Marque ao menos uma parte para o PDF.');
    expect(problemaDoRelatorio(valido)).toBe('');
  });
});

describe('relatorioParaApi', () => {
  it('limpa o nome, converte o dia e deixa de fora o que a API não recebe', () => {
    const form = { id: 'r1', descricao_agenda: 'x', nome: ' Resumo ', frequencia: 'mensal', dia: '5', destinatarios: ['u1'], secoes: ['prazos'], ativo: false };
    expect(relatorioParaApi(form)).toEqual({ nome: 'Resumo', frequencia: 'mensal', dia: 5, destinatarios: ['u1'], secoes: ['prazos'], ativo: false });
  });
});

describe('datas', () => {
  it('dataCurta mostra só a data, sem depender do fuso', () => {
    expect(dataCurta('2026-11-16 00:00:00')).toBe('16/11/2026');
    expect(dataCurta('2026-11-16')).toBe('16/11/2026');
    expect(dataCurta(null)).toBe('');
  });

  it('dataHora lê a data da API como UTC', () => {
    const esperado = new Date(Date.UTC(2026, 10, 9, 11, 0)).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    expect(dataHora('2026-11-09 11:00:00')).toBe(esperado);
    expect(dataHora('')).toBe('');
  });

  it('periodoDoEnvio: o fim é exclusivo, então o último dia é o anterior', () => {
    const envio = { periodo_inicio: '2026-11-02 12:00:00', periodo_fim: '2026-11-09 12:00:00' };
    expect(periodoDoEnvio(envio)).toEqual({
      inicio: hojeISO(new Date(Date.UTC(2026, 10, 2, 12, 0))),
      fim: hojeISO(new Date(Date.UTC(2026, 10, 9, 11, 59))),
    });
  });
});
