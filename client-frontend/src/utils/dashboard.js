import { estaParado } from '../components/ui/funil';

/** "1 item" / "3 itens": número com a palavra no singular ou no plural. */
export function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Destino de cada tipo de tabela (financeiro e vaga têm telas próprias). */
export function destinoDaTabela(modulo) {
  if (modulo.tipo === 'financeiro') return `/modulos/${modulo.id}/financeiro`;
  if (modulo.tipo === 'recrutamento') return '/recrutamento';
  return `/modulos/${modulo.id}/registros`;
}

/** Saudação conforme a hora do dia (0 a 23). */
export function saudacaoDaHora(hora) {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Separa tabelas de vagas e soma os itens guardados nas tabelas. */
export function separarModulos(modulos) {
  const tabelas = modulos.filter((m) => m.tipo !== 'recrutamento');
  return {
    tabelas,
    vagas: modulos.filter((m) => m.tipo === 'recrutamento'),
    totalItens: tabelas.reduce((soma, m) => soma + Number(m.total_registros || 0), 0),
  };
}

/** Fases do quadro da vaga, total de candidatos e quantos estão parados. */
export function resumirVaga(kanban, parado = estaParado) {
  const fasesDaVaga = kanban ? Object.entries(kanban) : [];
  const candidatos = fasesDaVaga.flatMap(([, fase]) => fase.candidatos || []);
  return {
    fasesDaVaga,
    totalCandidatosVaga: candidatos.length,
    paradosVaga: candidatos.filter((c) => parado(c.atualizado_em || c.criado_em)).length,
  };
}

/** Automações ligadas, execuções e falhas da semana, e as pausadas por falhas. */
export function resumirAutomacoes(automacoes) {
  return automacoes.reduce(
    (acc, a) => ({
      ativas: acc.ativas + (a.ativo ? 1 : 0),
      execucoes: acc.execucoes + (a.estatisticas?.execucoes_7d || 0),
      falhas: acc.falhas + (a.estatisticas?.falhas_7d || 0),
      pausadas: a.pausada_por_falhas_em && !a.ativo ? [...acc.pausadas, a] : acc.pausadas,
    }),
    { ativas: 0, execucoes: 0, falhas: 0, pausadas: [] }
  );
}

/** O que pede alguém agir agora, em ordem de urgência. */
export function itensDeAtencao({ atrasados, pausadas, paradosVaga, vagaDestaque, convites }) {
  const meusAtrasados = atrasados.filter((i) => i.meu).length;
  const convitesVencidos = convites.filter((c) => c.expirado).length;
  const convitesAguardando = convites.length - convitesVencidos;
  const itens = [];

  if (atrasados.length > 0) {
    itens.push({
      id: 'atrasados',
      icone: 'event_busy',
      cor: 'bg-danger-bg text-danger',
      titulo: plural(atrasados.length, 'item atrasado', 'itens atrasados'),
      texto: meusAtrasados > 0 ? `${plural(meusAtrasados, 'está', 'estão')} com você. Veja em Prazos.` : 'Nenhum com você. Veja em Prazos.',
      // O mais atrasado primeiro: leva direto à tabela dele.
      to: `/modulos/${atrasados[0].modulo_id}/registros`,
    });
  }
  pausadas.forEach((a) =>
    itens.push({
      id: `aut-${a.id}`,
      icone: 'pause_circle',
      cor: 'bg-warning-bg text-warning',
      titulo: `Automação pausada: ${a.nome}`,
      texto: 'Falhou várias vezes seguidas. Veja o histórico, corrija e ligue de novo.',
      to: '/automacoes',
    })
  );
  if (paradosVaga > 0) {
    itens.push({
      id: 'parados',
      icone: 'schedule',
      cor: 'bg-warning-bg text-warning',
      titulo: `${plural(paradosVaga, 'candidato parado', 'candidatos parados')} há mais de 14 dias`,
      texto: vagaDestaque ? `Em ${vagaDestaque.nome}.` : '',
      to: '/recrutamento',
    });
  }
  if (convitesVencidos > 0) {
    itens.push({
      id: 'convites-vencidos',
      icone: 'mail',
      cor: 'bg-danger-bg text-danger',
      titulo: `${plural(convitesVencidos, 'convite venceu', 'convites venceram')} sem resposta`,
      texto: 'Reenvie para a pessoa receber um link novo.',
      to: '/team',
    });
  }
  if (convitesAguardando > 0) {
    itens.push({
      id: 'convites',
      icone: 'forward_to_inbox',
      cor: 'bg-info-bg text-info',
      titulo: `${plural(convitesAguardando, 'convite aguardando', 'convites aguardando')} resposta`,
      texto: 'Quem aceitar entra direto na equipe.',
      to: '/team',
    });
  }
  return itens;
}
