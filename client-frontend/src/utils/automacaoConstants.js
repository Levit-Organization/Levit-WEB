export const GATILHO_INFO = {
  criacao: { label: 'Novo item', icon: 'add_circle' },
  atualizacao: { label: 'Atualização', icon: 'edit' },
  exclusao: { label: 'Exclusão', icon: 'delete' },
  candidato_criado: { label: 'Novo candidato', icon: 'person_add' },
  candidato_mudou_etapa: { label: 'Mudou de etapa', icon: 'swap_horiz' },
};

/** Módulos de dados disparam com registros; vagas (recrutamento), com candidatos. */
export function ehVaga(modulo) {
  return modulo?.tipo === 'recrutamento';
}

export function gatilhosDoModulo(modulo) {
  return ehVaga(modulo) ? ['candidato_criado', 'candidato_mudou_etapa'] : ['criacao', 'atualizacao', 'exclusao'];
}

/** Gatilho que fornece o "valor anterior" usado pelas condições de mudança. */
export function gatilhoDeMudanca(modulo) {
  return ehVaga(modulo) ? 'candidato_mudou_etapa' : 'atualizacao';
}

export const ACAO_INFO = {
  enviar_email: { label: 'Enviar e-mail', icon: 'mail' },
  webhook: { label: 'Avisar outro sistema', icon: 'hub' },
  notificacao: { label: 'Notificação', icon: 'notifications' },
  atualizar_campo: { label: 'Atualizar coluna', icon: 'edit_note' },
  criar_registro: { label: 'Criar item', icon: 'library_add' },
};

/** Ações sobre registros não existem em vagas. */
export function acoesDoModulo(modulo) {
  const todas = Object.keys(ACAO_INFO);
  return ehVaga(modulo) ? todas.filter((t) => t !== 'atualizar_campo' && t !== 'criar_registro') : todas;
}

/** Em vagas, condições e {{variáveis}} usam os campos do candidato. */
export const CAMPOS_CANDIDATO = [
  { id: 'nome', nome: 'Nome', tipo: 'texto' },
  { id: 'email', nome: 'E-mail', tipo: 'texto' },
  { id: 'telefone', nome: 'Telefone', tipo: 'texto' },
  { id: 'cargo_desejado', nome: 'Cargo desejado', tipo: 'texto' },
  { id: 'mensagem', nome: 'Mensagem', tipo: 'texto' },
  { id: 'etapa', nome: 'Etapa', tipo: 'etapa' },
  { id: 'etapa_anterior', nome: 'Etapa anterior', tipo: 'etapa' },
];

export const OPERADOR_INFO = {
  igual: 'é igual a',
  diferente: 'é diferente de',
  contem: 'contém',
  nao_contem: 'não contém',
  vazio: 'está vazio',
  preenchido: 'está preenchido',
  maior: 'é maior que',
  menor: 'é menor que',
  mudou: 'mudou (qualquer valor)',
  mudou_para: 'mudou para',
  mudou_de_para: 'mudou de… para…',
};

/** Comparam com o valor anterior: só disparam quando há um (atualização / troca de etapa). */
export const OPERADORES_DE_MUDANCA = ['mudou', 'mudou_para', 'mudou_de_para'];

/** Dispensam o campo "valor". */
export const OPERADORES_SEM_VALOR = ['vazio', 'preenchido', 'mudou'];

export const MAX_REGRAS = 10;

export const DESTINO_NOTIFICACAO = {
  todos: 'Toda a equipe com acesso à tabela',
  cargo: 'Pessoas de um cargo',
  usuario: 'Uma pessoa específica',
  // Só aparece em tabelas com coluna "Responsável".
  responsavel: 'O responsável pelo item',
};

/** Configuração inicial de cada tipo de ação. */
export function configuracaoInicial(tipo) {
  if (tipo === 'enviar_email') return { destinatario: '', assunto: '', corpo: '' };
  if (tipo === 'webhook') return { url: '' };
  if (tipo === 'notificacao') return { destinatarios: 'todos', destino_id: '', titulo: '', mensagem: '' };
  if (tipo === 'atualizar_campo') return { campo_id: '', valor: '' };
  if (tipo === 'criar_registro') return { modulo_destino_id: '', mapeamento: {} };
  return {};
}

/** A ação tem o mínimo para ser salva? */
export function acaoValida({ tipo, configuracao: c = {} }) {
  if (tipo === 'enviar_email') return !!((c.destinatario || c.destinatario_campo_id) && c.assunto && c.corpo);
  if (tipo === 'webhook') return !!c.url;
  if (tipo === 'notificacao') return !!(c.titulo?.trim() && (['todos', 'responsavel'].includes(c.destinatarios) || c.destino_id));
  if (tipo === 'atualizar_campo') return !!c.campo_id;
  if (tipo === 'criar_registro') {
    return !!c.modulo_destino_id && Object.values(c.mapeamento || {}).some((v) => String(v ?? '').trim() !== '');
  }
  return false;
}

export function novaRegra() {
  return { campo: '', operador: 'igual', valor: '', valor_de: '' };
}

/** A regra está completa para o operador escolhido? */
export function regraValida({ campo, operador, valor, valor_de: valorDe }) {
  if (!campo || !operador) return false;
  if (OPERADORES_SEM_VALOR.includes(operador)) return true;
  if (operador === 'mudou_de_para' && !valorDe) return false;
  return valor !== '' && valor !== null && valor !== undefined;
}

/** Condições salvas (formato novo) ou a condição única do formato antigo. */
export function condicoesDaAutomacao(automacao) {
  if (automacao?.condicoes?.regras?.length) return automacao.condicoes;
  if (automacao?.campo_condicao_id) {
    return {
      logica: 'e',
      regras: [
        {
          campo: automacao.campo_condicao_id,
          operador: automacao.condicao_operador || 'igual',
          valor: automacao.condicao_valor || '',
          valor_de: automacao.condicao_valor_de || '',
        },
      ],
    };
  }
  return null;
}

export function gatilhoLabel(gatilho) {
  return GATILHO_INFO[gatilho]?.label || gatilho;
}

export function acaoLabel(tipo) {
  return ACAO_INFO[tipo]?.label || tipo;
}

/** Lista de gatilhos da automação; linhas antigas só trazem `gatilho`. */
export function gatilhosDaAutomacao(automacao) {
  if (automacao?.gatilhos?.length) return automacao.gatilhos;
  return automacao?.gatilho ? [automacao.gatilho] : [];
}

export const STATUS_EXECUCAO = {
  sucesso: { label: 'Sucesso', variant: 'success', icon: 'check_circle' },
  erro: { label: 'Falhou', variant: 'danger', icon: 'error_outline' },
  retentando: { label: 'Vai tentar de novo', variant: 'warning', icon: 'schedule' },
};

/** O backend devolve "AAAA-MM-DD HH:MM:SS" (sem fuso): interpreta como horário local. */
function paraData(valor) {
  if (!valor) return null;
  const data = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? null : data;
}

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** "agora", "há 5 min", "há 3 h" ou a data/hora completa (mais de um dia). */
export function quando(valor, agora = Date.now()) {
  const data = paraData(valor);
  if (!data) return '—';
  const minutos = Math.floor((agora - data.getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 24 * 60) return `há ${Math.floor(minutos / 60)} h`;
  return formatoDataHora.format(data);
}

export function dataHoraCompleta(valor) {
  const data = paraData(valor);
  return data ? formatoDataHora.format(data) : '';
}

export function duracao(ms) {
  if (ms === null || ms === undefined) return '';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

/**
 * Corpo enviado à API (criar, atualizar e simular) a partir do estado do formulário.
 */
export function montarDefinicao({ nome, gatilhos, temCondicao, logica, regras, acoes }) {
  const regrasLimpas = (regras || []).map((r) => ({
    campo: r.campo,
    operador: r.operador,
    valor: OPERADORES_SEM_VALOR.includes(r.operador) ? null : r.valor,
    valor_de: r.operador === 'mudou_de_para' ? r.valor_de : null,
  }));

  return {
    nome: nome?.trim(),
    gatilhos,
    condicoes: temCondicao && regrasLimpas.length ? { logica: logica || 'e', regras: regrasLimpas } : null,
    acoes: acoes.map((a) => ({ tipo: a.tipo, configuracao: a.configuracao })),
  };
}

/** Rótulo curto de um registro: o primeiro valor preenchido. */
export function rotuloRegistro(registro) {
  const valores = Object.values(registro?.dados || {}).filter((v) => v !== null && v !== '' && typeof v !== 'object');
  return valores.length ? String(valores[0]).slice(0, 60) : `Registro ${String(registro?.id || '').slice(0, 8)}`;
}
