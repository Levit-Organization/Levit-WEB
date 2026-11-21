export const ICONE_NOTIFICACAO = {
  candidatura: { icon: 'person_add', classes: 'bg-primary-100 text-primary-700' },
  automacao: { icon: 'bolt', classes: 'bg-info-bg text-info' },
  automacao_pausada: { icon: 'pause_circle', classes: 'bg-warning-bg text-warning' },
  convite_aceito: { icon: 'group_add', classes: 'bg-success-bg text-success' },
  padrao: { icon: 'notifications', classes: 'bg-background text-light-text' },
};

const formatoDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

function inicioDoDia(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

/**
 * Agrupa (mantendo a ordem) em "Hoje", "Ontem" e "12 de outubro". Datas do
 * backend vêm como "AAAA-MM-DD HH:MM:SS" (horário local).
 */
export function agruparPorDia(notificacoes, agora = new Date()) {
  const hoje = inicioDoDia(agora);
  const ontem = hoje - 86_400_000;
  const grupos = [];

  for (const notificacao of notificacoes) {
    const data = new Date(String(notificacao.criado_em).replace(' ', 'T'));
    const dia = Number.isNaN(data.getTime()) ? null : inicioDoDia(data);
    const rotulo = dia === hoje ? 'Hoje' : dia === ontem ? 'Ontem' : dia === null ? 'Sem data' : formatoDia.format(data);

    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.rotulo === rotulo) ultimo.itens.push(notificacao);
    else grupos.push({ rotulo, itens: [notificacao] });
  }

  return grupos;
}
