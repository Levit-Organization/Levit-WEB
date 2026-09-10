/**
 * Cor por POSIÇÃO no funil, não por nome da fase — as fases são livres, cada
 * empresa nomeia as suas ("Triagem", "Entrevista com gestor", "Proposta"...).
 * A intensidade cresce conforme o candidato avança e a última etapa fecha em
 * verde: a cor comunica progresso, não decora.
 *
 * Classes escritas por extenso porque o JIT do Tailwind não lê nome de classe
 * montado em runtime.
 */
const ESCALA = [
  { dot: 'bg-stage-1', text: 'text-stage-1', bg: 'bg-stage-1-bg', border: 'border-stage-1' },
  { dot: 'bg-stage-2', text: 'text-stage-2', bg: 'bg-stage-2-bg', border: 'border-stage-2' },
  { dot: 'bg-stage-3', text: 'text-stage-3', bg: 'bg-stage-3-bg', border: 'border-stage-3' },
  { dot: 'bg-stage-4', text: 'text-stage-4', bg: 'bg-stage-4-bg', border: 'border-stage-4' },
];

const FINAL = { dot: 'bg-stage-5', text: 'text-stage-5', bg: 'bg-stage-5-bg', border: 'border-stage-5' };

export function coresDaFase(indice, total) {
  if (total > 1 && indice === total - 1) return FINAL;
  if (indice <= 0) return ESCALA[0];

  // Distribui as fases intermediárias ao longo da escala, qualquer que seja a
  // quantidade de etapas do pipeline.
  const passos = Math.max(total - 2, 1);
  const posicao = Math.min(Math.round(((indice - 1) / passos) * (ESCALA.length - 1)), ESCALA.length - 1);
  return ESCALA[posicao];
}

/**
 * "há 3 dias" — em recrutamento, quanto tempo o candidato está parado numa
 * etapa é a informação que faz alguém agir. Data crua não é.
 */
export function tempoRelativo(valor) {
  if (!valor) return null;

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;

  const dias = Math.floor((Date.now() - data.getTime()) / 86400000);

  if (dias < 0) return null;
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;

  const meses = Math.floor(dias / 30);
  if (meses === 1) return 'há 1 mês';
  if (meses < 12) return `há ${meses} meses`;

  const anos = Math.floor(meses / 12);
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
}

/** Passa de "parado tempo demais" a partir de 14 dias na mesma etapa. */
export function estaParado(valor, limiteDias = 14) {
  if (!valor) return false;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return false;
  return Math.floor((Date.now() - data.getTime()) / 86400000) >= limiteDias;
}
