import { hojeISO } from './prazos';

/** Partes que podem entrar no PDF (mesma ordem e chaves de RelatorioService::SECOES). */
export const SECOES_RELATORIO = [
  { valor: 'resumo', rotulo: 'Comparação com o período anterior', descricao: 'Atividades, pessoas ativas, itens criados e candidatos.' },
  { valor: 'recrutamento', rotulo: 'Recrutamento', descricao: 'Funil por etapa, tempo médio e candidatos parados.' },
  { valor: 'financeiro', rotulo: 'Financeiro', descricao: 'Entradas, saídas, saldo e saídas por categoria.' },
  { valor: 'prazos', rotulo: 'Prazos', descricao: 'Quanto foi concluído e os atrasos por responsável.' },
  { valor: 'atrasados', rotulo: 'Itens atrasados agora', descricao: 'A lista do que está vencido.' },
  { valor: 'ranking', rotulo: 'Ranking por pessoa e por tabela', descricao: 'Quem mais registrou atividades e onde.' },
  { valor: 'atividades', rotulo: 'Tudo o que foi feito', descricao: 'O histórico completo do período, dia a dia.' },
];

/** Padrão para relatórios novos: tudo menos o ranking por pessoa. */
export const SECOES_PADRAO = SECOES_RELATORIO.map((s) => s.valor).filter((s) => s !== 'ranking');

export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return hojeISO(new Date(a, m - 1, d + dias));
}

export const ATALHOS_PERIODO = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mes-passado', label: 'Mês passado' },
  { value: 'outro', label: 'Escolher datas' },
];

/** Atalhos de período (datas inclusivas). `outro` devolve null: a pessoa escolhe. */
export function periodoDoAtalho(atalho, hoje = hojeISO()) {
  const [a, m] = hoje.split('-').map(Number);
  switch (atalho) {
    case '7d':
      return [somarDias(hoje, -6), hoje];
    case '30d':
      return [somarDias(hoje, -29), hoje];
    case 'mes':
      return [hojeISO(new Date(a, m - 1, 1)), hoje];
    case 'mes-passado':
      return [hojeISO(new Date(a, m - 2, 1)), hojeISO(new Date(a, m - 1, 0))];
    default:
      return null;
  }
}

const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const formatoCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const numero = (n) => (n === null || n === undefined ? '—' : formatoNumero.format(n));
export const compacto = (n) => (Math.abs(n) >= 1000 ? formatoCompacto.format(n) : formatoNumero.format(n));
export const moeda = (n) => (n === null || n === undefined ? '—' : formatoMoeda.format(n));

/** "2026-10" → "out/26" */
export function rotuloMes(anoMes) {
  if (!/^\d{4}-\d{2}$/.test(anoMes || '')) return anoMes || '';
  const [a, m] = anoMes.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${nome}/${String(a).slice(2)}`;
}

/** "01/10 a 07/10/2026" */
export function textoDoPeriodo({ inicio, fim } = {}) {
  if (!inicio || !fim) return '';
  const [ai, mi, di] = inicio.split('-');
  const [af, mf, df] = fim.split('-');
  if (inicio === fim) return `${df}/${mf}/${af}`;
  return ai === af ? `${di}/${mi} a ${df}/${mf}/${af}` : `${di}/${mi}/${ai} a ${df}/${mf}/${af}`;
}

/**
 * Como mostrar a variação: texto ("+12%", "novo", "igual"), direção e se é
 * boa. `subirEBom` decide a cor (saídas subindo é ruim, entradas é bom).
 */
export function descreverVariacao(comparacao, subirEBom = true) {
  const v = comparacao?.variacao;
  if (v === null || v === undefined) {
    return comparacao && Number(comparacao.atual) !== 0 ? { texto: 'novo', direcao: null, bom: null } : null;
  }
  if (v === 0) return { texto: 'igual', direcao: null, bom: null };
  const casas = Math.abs(v) < 10 && !Number.isInteger(v) ? 1 : 0;
  const texto = `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })}%`;
  return { texto, direcao: v > 0 ? 'up' : 'down', bom: (v > 0) === subirEBom };
}

const celulaCsv = (valor) => {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  // Evita injeção de fórmula ao abrir no Excel (=, +, -, @ no começo).
  const seguro = /^[=+\-@\t\r]/.test(texto) && !/^-?\d+([.,]\d+)?$/.test(texto) ? `'${texto}` : texto;
  return /[";\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

/** CSV com ";" e BOM (o Excel em português abre direto, com acentos). */
export function gerarCsv(cabecalho, linhas) {
  const conteudo = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(';')).join('\r\n');
  return `${String.fromCharCode(0xfeff)}${conteudo}`;
}

export function baixarTexto(conteudo, nome, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
