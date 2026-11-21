import { useState } from 'react';
import { validarMembro } from '../../utils/equipe';

const MEMBRO_VAZIO = { nome: '', email: '', cargo: '', mensagem: '' };

/**
 * Estado do painel de convidar/editar colaborador. Os handlers recebidos
 * lançam Error com a mensagem da API: o painel continua aberto e mostra o erro.
 */
export function useFormularioMembro({ onInviteMember, onUpdateMember }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState(MEMBRO_VAZIO);

  const [memberErrors, setMemberErrors] = useState({});
  const [memberError, setMemberError] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberInitial, setMemberInitial] = useState(null);

  const openInviteModal = (member = null) => {
    const inicial = member
      ? {
          nome: member.nome || '',
          email: member.email || '',
          cargo: member.cargo_id ?? '',
          mensagem: '',
        }
      : { ...MEMBRO_VAZIO };

    setEditingMember(member);
    setMemberForm(inicial);
    setMemberInitial(inicial);
    setMemberErrors({});
    setMemberError('');
    setInviteOpen(true);
  };

  // Só limpa o formulário depois da animação de saída (o estado fica enquanto fecha).
  const closeInviteModal = () => setInviteOpen(false);

  const memberDirty = !!memberInitial && JSON.stringify(memberForm) !== JSON.stringify(memberInitial);

  const changeMember = (campo, valor) => {
    setMemberForm((current) => ({ ...current, [campo]: valor }));
    setMemberErrors((current) => (current[campo] ? { ...current, [campo]: undefined } : current));
  };

  const submitMember = async (event) => {
    event?.preventDefault?.();

    const erros = validarMembro(memberForm);
    setMemberErrors(erros);
    if (Object.keys(erros).length > 0) return;

    if (editingMember && !onUpdateMember) return;
    if (!editingMember && !onInviteMember) return;

    try {
      setSavingMember(true);
      setMemberError('');
      if (editingMember) {
        await onUpdateMember(editingMember.id, { ...memberForm });
      } else {
        await onInviteMember({ ...memberForm });
      }
      closeInviteModal();
    } catch (err) {
      // O painel continua aberto com o que foi digitado.
      setMemberError(err.message);
    } finally {
      setSavingMember(false);
    }
  };

  return {
    inviteOpen,
    editingMember,
    memberForm,
    memberErrors,
    memberError,
    savingMember,
    memberDirty,
    podeSalvar: editingMember ? !!onUpdateMember : !!onInviteMember,
    openInviteModal,
    closeInviteModal,
    changeMember,
    submitMember,
  };
}
