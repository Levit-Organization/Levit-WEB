import { useState } from 'react';

/** Estado do modal de criar/editar cargo (nome + permissões globais). */
export function useFormularioCargo({ onCreateRole, onUpdateRole }) {
  const [roleError, setRoleError] = useState('');
  const [roleFormError, setRoleFormError] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [roleInitial, setRoleInitial] = useState(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    nome: '',
    permissoes: [],
  });

  const openRoleModal = (role = null) => {
    const inicial = role
      ? { nome: role.nome || '', permissoes: [...(role.permissoes || [])] }
      : { nome: '', permissoes: [] };

    setEditingRole(role);
    setRoleForm(inicial);
    setRoleInitial(inicial);
    setRoleError('');
    setRoleFormError('');
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => setRoleModalOpen(false);

  const roleDirty = !!roleInitial && JSON.stringify(roleForm) !== JSON.stringify(roleInitial);

  const changeRoleNome = (nome) => {
    setRoleForm((current) => ({ ...current, nome }));
    setRoleError('');
  };

  const toggleRolePermissao = (permission, marcada) => {
    setRoleForm((current) => ({
      ...current,
      permissoes: marcada
        ? [...current.permissoes, permission]
        : current.permissoes.filter((item) => item !== permission),
    }));
  };

  const submitRole = async (event) => {
    event?.preventDefault?.();

    if (!roleForm.nome.trim()) {
      setRoleError('Informe o nome do cargo.');
      return;
    }

    if (editingRole && !onUpdateRole) return;
    if (!editingRole && !onCreateRole) return;

    const dados = { nome: roleForm.nome.trim(), permissoes: roleForm.permissoes };

    try {
      setSavingRole(true);
      setRoleError('');
      setRoleFormError('');
      if (editingRole) {
        await onUpdateRole(editingRole.id, dados);
      } else {
        await onCreateRole(dados);
      }
      closeRoleModal();
    } catch (err) {
      setRoleFormError(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  return {
    roleModalOpen,
    editingRole,
    roleForm,
    roleError,
    roleFormError,
    savingRole,
    roleDirty,
    podeSalvar: editingRole ? !!onUpdateRole : !!onCreateRole,
    openRoleModal,
    closeRoleModal,
    changeRoleNome,
    toggleRolePermissao,
    submitRole,
  };
}
