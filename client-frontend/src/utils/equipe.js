/** Limite da mensagem pessoal que vai no e-mail de convite. */
export const MAX_MENSAGEM = 500;

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Data do backend ("AAAA-MM-DD HH:MM:SS") como Date, ou null se for inválida. */
function lerData(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? null : data;
}

/** "12 de out. de 2026" a partir do criado_em do backend ("AAAA-MM-DD HH:MM:SS"). */
export function desde(valor) {
  const data = lerData(valor);
  return data ? formatoData.format(data) : null;
}

/** Dias que faltam até a data (arredondado para cima; negativo se já passou). */
export function diasAte(valor, agora = Date.now()) {
  const data = lerData(valor);
  if (!data) return null;
  return Math.ceil((data.getTime() - agora) / 86400000);
}

/** Erros por campo do formulário de convidar/editar colaborador. */
export function validarMembro({ email, cargo, mensagem }) {
  const erros = {};
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) erros.email = 'Esse e-mail não parece válido.';
  if (!cargo) erros.cargo = 'Selecione um cargo para o colaborador.';
  if (mensagem.length > MAX_MENSAGEM) erros.mensagem = `Use no máximo ${MAX_MENSAGEM} caracteres.`;
  return erros;
}

/**
 * Filtra os colaboradores por nome/e-mail (`termo` já em minúsculas) e por cargo.
 * O cargo do membro pode vir como id (em vários formatos de campo) ou só pelo nome.
 */
export function filtrarMembros(members, roles, termo, cargoId) {
  const selectedRole = roles.find((role) => String(role.id) === String(cargoId));

  return members.filter((member) => {
    const matchesSearch =
      !termo ||
      (member.nome || '').toLowerCase().includes(termo) ||
      (member.email || '').toLowerCase().includes(termo);

    const memberRoleId =
      member.cargoId ??
      member.cargo_id ??
      member.cargo?.id ??
      member.roleId ??
      member.role_id;

    const memberRoleName =
      typeof member.cargo === 'string'
        ? member.cargo
        : member.cargo?.nome || member.cargo?.name || '';

    const matchesRole =
      !cargoId ||
      String(memberRoleId || '') === String(cargoId) ||
      (selectedRole?.nome || selectedRole?.name || '').toLowerCase() ===
        memberRoleName.toLowerCase();

    return matchesSearch && matchesRole;
  });
}
