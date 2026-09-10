export const GATILHO_INFO = {
  criacao: { label: 'Novo registro', icon: 'add_circle' },
  atualizacao: { label: 'Atualização', icon: 'edit' },
  exclusao: { label: 'Exclusão', icon: 'delete' },
  agendado: { label: 'Agendado', icon: 'schedule', disabled: true },
};

export const ACAO_INFO = {
  enviar_email: { label: 'Enviar e-mail', icon: 'mail' },
  webhook: { label: 'Webhook', icon: 'bolt' },
  notificacao: { label: 'Notificação', icon: 'notifications', disabled: true },
};

export const OPERADOR_INFO = {
  igual: 'é igual a',
  diferente: 'é diferente de',
};

export function gatilhoLabel(gatilho) {
  return GATILHO_INFO[gatilho]?.label || gatilho;
}

export function acaoLabel(tipo) {
  return ACAO_INFO[tipo]?.label || tipo;
}
