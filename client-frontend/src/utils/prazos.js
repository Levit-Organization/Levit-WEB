/**
 * Regras de prazo e responsável, iguais às do backend (PrazoService.php).
 *
 * Um item conta como concluído quando alguma coluna de lista dele está numa
 * opção de fim de trabalho (Concluído, Entregue, Pago...). Item concluído
 * nunca aparece como atrasado.
 */
export const OPCOES_DE_CONCLUSAO = new Set([
  'concluido', 'concluida', 'feito', 'feita', 'entregue', 'pago', 'paga', 'finalizado', 'finalizada',
  'fechado', 'fechada', 'cancelado', 'cancelada', 'perdido', 'perdida', 'publicado', 'publicada',
  'resolvido', 'resolvida', 'encerrado', 'encerrada', 'arquivado', 'arquivada', 'contratado', 'contratada',
]);

export function normalizar(texto) {
  return String(texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, '');
}

export function opcaoDeConclusao(valor) {
  return valor != null && OPCOES_DE_CONCLUSAO.has(normalizar(valor));
}

/** `campos`: colunas da tabela; `dados`: valores do item. */
export function itemConcluido(dados, campos) {
  return campos.some((c) => c.tipo === 'selecao' && opcaoDeConclusao(dados?.[c.id]));
}

/** Data local no formato AAAA-MM-DD (sem passar por UTC, que muda o dia à noite). */
export function hojeISO(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

function diasEntre(deISO, ateISO) {
  const [a, b] = [deISO, ateISO].map((d) => Date.UTC(...d.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0))));
  return Math.round((b - a) / 86_400_000);
}

/**
 * Situação de um prazo para exibir: `tipo` decide a cor, `rotulo` é o texto.
 * Itens concluídos mostram só a data, sem alarme.
 */
export function situacaoDoPrazo(dataISO, { hoje = hojeISO(), concluido = false } = {}) {
  if (!dataISO || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return null;
  const data = new Date(`${dataISO}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  if (concluido) return { tipo: 'concluido', rotulo: data };

  const dias = diasEntre(hoje, dataISO);
  if (dias < 0) return { tipo: 'atrasado', rotulo: dias === -1 ? 'Atrasado desde ontem' : `Atrasado há ${-dias} dias` };
  if (dias === 0) return { tipo: 'hoje', rotulo: 'Vence hoje' };
  if (dias === 1) return { tipo: 'breve', rotulo: 'Vence amanhã' };
  if (dias <= 7) return { tipo: 'breve', rotulo: `Vence em ${dias} dias` };
  return { tipo: 'futuro', rotulo: data };
}

export function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}
