/**
 * Relatórios agendados (PDF por e-mail): formulário, datas da API e o período
 * de cada envio já feito.
 */
import { hojeISO } from './prazos';
import { SECOES_PADRAO } from './relatorios';

export const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export const RELATORIO_VAZIO = { nome: '', frequencia: 'semanal', dia: 1, destinatarios: [], secoes: SECOES_PADRAO, ativo: true };

export const FREQUENCIAS = [
  ['diario', 'Diário'],
  ['semanal', 'Semanal'],
  ['mensal', 'Mensal'],
];

/** O que cada frequência cobre, mostrado abaixo da escolha. */
export const COBERTURA_DA_FREQUENCIA = {
  diario: 'Cobre o dia anterior.',
  semanal: 'Cobre os 7 dias anteriores.',
  mensal: 'Cobre o mês anterior. Vai até o dia 28 para existir em todo mês.',
};

/** Tira o item da lista se ele já está nela; senão, põe no fim. */
export function alternarNaLista(lista, item) {
  return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
}

/** Dias da semana (1 = segunda) ou do mês (até 28, para existir em todo mês). */
export function opcoesDoDia(frequencia) {
  return frequencia === 'semanal'
    ? DIAS_SEMANA.map((nome, i) => ({ value: i + 1, label: nome }))
    : Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `Dia ${i + 1}` }));
}

/** Primeiro problema do formulário, ou '' quando dá para salvar. */
export function problemaDoRelatorio(form) {
  if (!form.nome.trim()) return 'Dê um nome ao relatório.';
  if (form.destinatarios.length === 0) return 'Escolha quem recebe o relatório.';
  if (form.secoes.length === 0) return 'Marque ao menos uma parte para o PDF.';
  return '';
}

/** Corpo enviado à API para criar ou atualizar o relatório. */
export function relatorioParaApi(form) {
  return {
    nome: form.nome.trim(),
    frequencia: form.frequencia,
    dia: Number(form.dia),
    destinatarios: form.destinatarios,
    secoes: form.secoes,
    ativo: form.ativo,
  };
}

/** "2026-11-16 00:00:00" → "16/11/2026" (só a data, sem fuso). */
export const dataCurta = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : '');

/** Data e hora em UTC vindas da API, mostradas no fuso de quem vê. */
export const dataHora = (utc) =>
  utc ? new Date(`${utc.replace(' ', 'T')}Z`).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/**
 * Datas (AAAA-MM-DD, inclusivas) do período de um envio. O período do envio
 * termina à meia-noite (exclusivo): o último dia é o anterior.
 */
export function periodoDoEnvio(envio) {
  const fimUtc = new Date(`${envio.periodo_fim.replace(' ', 'T')}Z`);
  fimUtc.setMinutes(fimUtc.getMinutes() - 1);
  return {
    inicio: hojeISO(new Date(`${envio.periodo_inicio.replace(' ', 'T')}Z`)),
    fim: hojeISO(fimUtc),
  };
}
