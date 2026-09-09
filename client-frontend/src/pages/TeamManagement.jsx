import { useState } from 'react';
import Layout from '../components/Layout';

export default function TeamManagement({
  members = [],
  roles = [],
  modules = [],
  permissions = [],
  loading = false,
  onInviteMember,
  onUpdateMember,
  onDeleteMember,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  moduloNiveis = [],
  moduloNiveisLoading = false,
  onOpenRoleModules,
  onSetModuloNivel,
  onRemoveModuloNivel,
}) {
  const [activeTab, setActiveTab] = useState('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({
    nome: '',
    email: '',
    cargo: '',
    status: '',
  });

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    nome: '',
    permissoes: [],
  });

  const openInviteModal = (member = null) => {
    setEditingMember(member);
    setMemberForm(
      member
        ? {
            nome: member.nome || '',
            email: member.email || '',
            cargo: member.cargo || '',
            status: member.status || '',
          }
        : {
            nome: '',
            email: '',
            cargo: '',
            status: '',
          }
    );
    setInviteOpen(true);
  };

  const [moduleAccessRole, setModuleAccessRole] = useState(null);

  const openModuleAccessModal = (role) => {
    setModuleAccessRole(role);
    if (!role.acesso_total) {
      onOpenRoleModules?.(role.id);
    }
  };

  const closeModuleAccessModal = () => {
    setModuleAccessRole(null);
  };

  const moduloNivelPorId = moduloNiveis.reduce((acc, item) => {
    acc[item.modulo_id] = item.nivel;
    return acc;
  }, {});

  const handleModuloNivelChange = (moduloId, nivel) => {
    if (!moduleAccessRole) return;

    if (!nivel) {
      onRemoveModuloNivel?.(moduleAccessRole.id, moduloId);
    } else {
      onSetModuloNivel?.(moduleAccessRole.id, moduloId, nivel);
    }
  };

  const closeInviteModal = () => {
    setInviteOpen(false);
    setEditingMember(null);
    setMemberForm({ nome: '', email: '', cargo: '', status: '' });
  };

  const submitMember = (event) => {
    event?.preventDefault?.();

    if (!memberForm.email.trim()) return;

    if (editingMember && !onUpdateMember) return;
    if (!editingMember && !onInviteMember) return;

    if (editingMember) {
      onUpdateMember?.(editingMember.id, { ...memberForm });
    } else {
      onInviteMember?.({ ...memberForm });
    }

    closeInviteModal();
  };

  const openRoleModal = (role = null) => {
    setEditingRole(role);
    setRoleForm(
      role
        ? {
            nome: role.nome || '',
            permissoes: [...(role.permissoes || [])],
          }
        : {
            nome: '',
            permissoes: [],
          }
    );
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setEditingRole(null);
    setRoleForm({ nome: '', permissoes: [] });
  };

  const submitRole = (event) => {
    event.preventDefault();

    if (!roleForm.nome.trim()) return;

    if (editingRole && !onUpdateRole) return;
    if (!editingRole && !onCreateRole) return;

    if (editingRole) {
      onUpdateRole?.(editingRole.id, {
        nome: roleForm.nome.trim(),
        permissoes: roleForm.permissoes,
      });
    } else {
      onCreateRole?.({
        nome: roleForm.nome.trim(),
        permissoes: roleForm.permissoes,
      });
    }

    closeRoleModal();
  };

  const handleDeleteMember = (member) => {
    onDeleteMember?.(member.id);
  };

  const handleDeleteRole = (role) => {
    onDeleteRole?.(role.id);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !normalizedSearch ||
      (member.nome || '').toLowerCase().includes(normalizedSearch) ||
      (member.email || '').toLowerCase().includes(normalizedSearch);

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

    const selectedRole = roles.find(
      (role) => String(role.id) === String(roleFilter)
    );

    const matchesRole =
      !roleFilter ||
      String(memberRoleId || '') === String(roleFilter) ||
      (selectedRole?.nome || selectedRole?.name || '').toLowerCase() ===
        memberRoleName.toLowerCase();

    return matchesSearch && matchesRole;
  });

  return (
    <Layout noPadding>
      <div className="min-h-full bg-white text-[#151515]">
        <header className="h-20 px-8 flex items-center justify-between border-b border-[#E6E6E6] bg-white">
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">
            Administração de Equipe
          </h1>

          <button
            type="button"
            onClick={() => openInviteModal()}
            className="h-12 px-6 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="text-lg leading-none">+</span>
            Adicionar Membro
          </button>
        </header>

        <div className="px-9 pt-7 pb-12">
          <div className="border-b border-[#DDDDDD] flex gap-7 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'text-primary border-primary'
                  : 'text-[#666666] border-transparent hover:text-[#333333]'
              }`}
            >
              Colaboradores
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'roles'
                  ? 'text-primary border-primary'
                  : 'text-[#666666] border-transparent hover:text-[#333333]'
              }`}
            >
              Cargos & Permissões
            </button>
          </div>

          {activeTab === 'members' ? (
            <section>
              <div className="mb-5 rounded-xl border border-[#DEDEDE] bg-white p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative flex-1">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#8A8A8A] pointer-events-none">
                      search
                    </span>
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Pesquisar por nome ou e-mail"
                      className="w-full h-10 rounded-md border border-[#DADADA] bg-white pl-10 pr-3 text-sm text-[#333333] outline-none placeholder:text-[#8A8A8A] focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  <div className="relative w-full md:w-[220px]">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#8A8A8A] pointer-events-none">
                      filter_list
                    </span>
                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value)}
                      className="w-full h-10 appearance-none rounded-md border border-[#DADADA] bg-white pl-10 pr-9 text-sm text-[#333333] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">Todos os cargos</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.nome}
                        </option>
                      ))}
                    </select>
                    <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[#777777] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:block border border-[#DEDEDE] rounded-xl overflow-hidden bg-white">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[27%]" />
                    <col className="w-[22%]" />
                    <col className="w-[16%]" />
                  </colgroup>

                  <thead>
                    <tr className="h-10 bg-white border-b border-[#E2E2E2]">
                      <th className="px-4 text-left text-[11px] font-bold tracking-[0.03em] text-[#666666] uppercase">
                        Nome / E-mail
                      </th>
                      <th className="px-4 text-left text-[11px] font-bold tracking-[0.03em] text-[#666666] uppercase">
                        Cargo Atual
                      </th>
                      <th className="px-4 text-left text-[11px] font-bold tracking-[0.03em] text-[#666666] uppercase">
                        Status
                      </th>
                      <th className="px-4 text-right text-[11px] font-bold tracking-[0.03em] text-[#666666] uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-12 text-center text-sm text-[#666666]">
                          Carregando colaboradores...
                        </td>
                      </tr>
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-12 text-center text-sm text-[#666666]">
                          Nenhum colaborador encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="h-[56px] border-b last:border-b-0 border-[#E7E7E7] hover:bg-[#FAFAFA] transition-colors"
                        >
                          <td className="px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#E8E8E8] text-[#666666] text-[11px] font-bold flex items-center justify-center shrink-0">
                                {(member.nome || '?').trim().charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {member.nome || '—'}
                                </p>
                                <p className="text-[11px] text-[#777777] truncate">
                                  {member.email || '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4">
                            {member.cargo ? (
                              <span className="rounded-full bg-[#DDF3EC] px-3 py-1 text-[10px] font-semibold text-[#14755D]">
                                {member.cargo}
                              </span>
                            ) : (
                              <span className="text-xs text-[#999999]">—</span>
                            )}
                          </td>

                          <td className="px-4">
                            {member.status ? (
                              <span className="rounded-full bg-[#DDF3EC] px-3 py-1 text-[10px] font-semibold text-[#14755D]">
                                {member.status}
                              </span>
                            ) : (
                              <span className="text-xs text-[#999999]">—</span>
                            )}
                          </td>

                          <td className="px-4">
                            <div className="flex justify-end gap-2">
                              {onUpdateMember && (
                                <button
                                  type="button"
                                  onClick={() => openInviteModal(member)}
                                  title="Editar colaborador"
                                  className="w-8 h-8 border border-[#D9D9D9] rounded-md flex items-center justify-center text-[#555555] hover:text-primary hover:border-primary transition-colors"
                                >
                                  <span className="material-icons text-[17px]">edit</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member)}
                                title="Excluir colaborador"
                                className="w-8 h-8 border border-[#D9D9D9] rounded-md flex items-center justify-center text-[#E00000] hover:bg-red-50 hover:border-red-200 transition-colors"
                              >
                                <span className="material-icons text-[17px]">delete_outline</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 md:hidden">
                {loading ? (
                  <div className="border border-dashed border-[#DEDEDE] rounded-xl p-8 text-center text-sm text-[#666666]">
                    Carregando colaboradores...
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="border border-dashed border-[#DEDEDE] rounded-xl p-8 text-center text-sm text-[#666666]">
                    Nenhum colaborador encontrado.
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <article
                      key={member.id}
                      className="border border-[#DEDEDE] rounded-xl p-4 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#E8E8E8] text-[#666666] text-xs font-bold flex items-center justify-center shrink-0">
                            {(member.nome || '?').trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {member.nome || '—'}
                            </p>
                            <p className="text-xs text-[#666666] truncate">
                              {member.email || '—'}
                            </p>
                          </div>
                        </div>

                        {member.status && (
                          <span className="rounded-full bg-[#DDF3EC] px-2.5 py-1 text-[10px] font-semibold text-[#14755D]">
                            {member.status}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        {member.cargo ? (
                          <span className="rounded-full bg-[#DDF3EC] px-3 py-1 text-[10px] font-semibold text-[#14755D]">
                            {member.cargo}
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex gap-2">
                          {onUpdateMember && (
                            <button
                              type="button"
                              onClick={() => openInviteModal(member)}
                              className="w-9 h-9 border border-[#D9D9D9] rounded-md flex items-center justify-center text-[#555555]"
                            >
                              <span className="material-icons text-[17px]">edit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member)}
                            className="w-9 h-9 border border-[#D9D9D9] rounded-md flex items-center justify-center text-[#E00000]"
                          >
                            <span className="material-icons text-[17px]">delete_outline</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-5 gap-4">
                <p className="text-sm text-[#5F5F5F]">
                  Defina modelos de acesso para vincular à sua equipe.
                </p>

                <button
                  type="button"
                  onClick={() => openRoleModal()}
                  className="h-8 px-3 rounded-md border border-[#8D8D8D] bg-white text-xs font-medium text-[#444444] hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                >
                  + Criar Cargo
                </button>
              </div>

              {loading ? (
                <div className="border border-dashed border-[#DEDEDE] rounded-xl p-10 text-center text-sm text-[#666666]">
                  Carregando cargos...
                </div>
              ) : roles.length === 0 ? (
                <div className="border border-dashed border-[#DEDEDE] rounded-xl p-10 text-center text-sm text-[#666666]">
                  Nenhum cargo cadastrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {roles.map((role) => (
                    <article
                      key={role.id}
                      className="relative min-h-[92px] border border-[#DEDEDE] rounded-xl bg-white px-5 py-4 hover:border-[#CFCFCF] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold leading-tight truncate">
                            {role.nome || '—'}
                          </h3>
                          {typeof role.usuarios === 'number' && (
                            <p className="mt-0.5 text-[11px] text-[#555555]">
                              {role.usuarios} usuário{role.usuarios !== 1 ? '(s)' : ''}
                            </p>
                          )}
                          {role.acesso_total && (
                            <span className="mt-1 inline-block rounded bg-[#FFF3D6] px-2 py-[2px] text-[9px] font-semibold text-[#8A6100]">
                              Acesso total
                            </span>
                          )}
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openModuleAccessModal(role)}
                            className="w-7 h-7 rounded-md text-[#555555] hover:bg-[#F5F5F5] hover:text-primary flex items-center justify-center"
                            title="Acesso por módulo"
                          >
                            <span className="material-icons text-[16px]">tune</span>
                          </button>
                          {(onUpdateRole || onDeleteRole) && (
                            <>
                            {onUpdateRole && (
                              <button
                                type="button"
                                onClick={() => openRoleModal(role)}
                                className="w-7 h-7 rounded-md text-[#555555] hover:bg-[#F5F5F5] hover:text-primary flex items-center justify-center"
                                title="Editar cargo"
                              >
                                <span className="material-icons text-[16px]">edit</span>
                              </button>
                            )}
                            {onDeleteRole && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="w-7 h-7 rounded-md text-[#E00000] hover:bg-red-50 flex items-center justify-center"
                                title="Excluir cargo"
                              >
                                <span className="material-icons text-[16px]">delete_outline</span>
                              </button>
                            )}
                            </>
                          )}
                        </div>
                      </div>

                      {role.permissoes?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {role.permissoes.map((permission) => (
                            <span
                              key={permission}
                              className="rounded bg-[#ECECEC] px-2 py-[2px] text-[9px] font-medium text-[#666666]"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 bg-black/85"
            onClick={closeInviteModal}
          />

          <aside className="relative z-10 w-full max-w-[410px] h-full bg-white flex flex-col shadow-2xl animate-slide-in">
            <div className="h-16 px-5 border-b border-[#E6E6E6] flex items-center justify-between">
              <h2 className="text-[16px] font-bold">
                {editingMember ? 'Editar colaborador' : 'Convidar para a equipe'}
              </h2>
              <button
                type="button"
                onClick={closeInviteModal}
                className="w-8 h-8 rounded-full bg-[#FAFAFA] text-[#777777] hover:bg-[#F1F1F1] flex items-center justify-center"
              >
                <span className="material-icons text-[17px]">close</span>
              </button>
            </div>

            <form onSubmit={submitMember} className="flex-1 overflow-y-auto px-5 py-5">
              {!editingMember && (
                <div className="mb-4 rounded-md border border-[#2675D8] bg-[#EAF4FF] px-4 py-3.5 flex gap-3 text-[#1963B4]">
                  <span className="material-icons text-[23px] shrink-0">forward_to_inbox</span>
                  <p className="text-[12px] leading-[1.35]">
                    Um e-mail será enviado com um link exclusivo. O usuário poderá definir sua própria senha e será vinculado à empresa automaticamente após o aceite.
                  </p>
                </div>
              )}

              {editingMember && (
                <div className="mb-4">
                  <label className="block text-[12px] font-semibold mb-2">
                    Nome do colaborador
                  </label>
                  <input
                    type="text"
                    value={memberForm.nome}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        nome: event.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-md border border-[#DADADA] px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-[12px] font-semibold mb-2">
                  E-mail do colaborador
                </label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="exemplo@empresa.com"
                  className="w-full h-10 rounded-md border border-[#DADADA] px-3 text-sm outline-none placeholder:text-[#777777] focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-semibold mb-2">
                  Cargo / Permissão de Acesso
                </label>
                <select
                  value={memberForm.cargo}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      cargo: event.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-md border border-[#DADADA] px-3 text-sm outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Selecione um cargo</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nome}
                    </option>
                  ))}
                </select>
              </div>

              {editingMember && (
                <div>
                  <label className="block text-[12px] font-semibold mb-2">Status</label>
                  <select
                    value={memberForm.status}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-md border border-[#DADADA] px-3 text-sm outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Selecione um status</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              )}
            </form>

            <div className="h-[72px] px-5 border-t border-[#E6E6E6] flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={closeInviteModal}
                className="h-10 min-w-[100px] px-5 rounded-md border border-[#D8D8D8] bg-white text-[13px] font-medium text-[#555555] hover:bg-[#FAFAFA]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitMember}
                disabled={editingMember ? !onUpdateMember : !onInviteMember}
                className="h-10 min-w-[190px] px-5 rounded-md bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingMember ? 'Salvar Alterações' : 'Enviar Convite'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0 bg-black/60"
            onClick={closeRoleModal}
          />

          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="h-16 px-5 border-b border-[#E6E6E6] flex items-center justify-between">
              <h2 className="font-bold text-base">
                {editingRole ? 'Editar Cargo' : 'Criar Cargo'}
              </h2>
              <button
                type="button"
                onClick={closeRoleModal}
                className="w-8 h-8 rounded-full bg-[#FAFAFA] flex items-center justify-center text-[#777777]"
              >
                <span className="material-icons text-[17px]">close</span>
              </button>
            </div>

            <form onSubmit={submitRole} className="p-5">
              <div className="mb-5">
                <label className="block text-[12px] font-semibold mb-2">
                  Nome do cargo
                </label>
                <input
                  type="text"
                  value={roleForm.nome}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Digite o nome do cargo"
                  className="w-full h-10 rounded-md border border-[#DADADA] px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div>
                <p className="text-[12px] font-semibold mb-3">Permissões</p>
                {permissions.length === 0 ? (
                  <p className="text-xs text-[#777777] border border-dashed border-[#DDDDDD] rounded-md p-4">
                    Nenhuma permissão disponível.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {permissions.map((permission) => {
                      const checked = roleForm.permissoes.includes(permission);

                      return (
                        <label
                          key={permission}
                          className={`h-10 px-3 rounded-md border flex items-center gap-2 cursor-pointer text-sm transition-colors ${
                            checked
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-[#DDDDDD] text-[#555555] hover:border-[#BBBBBB]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setRoleForm((current) => ({
                                ...current,
                                permissoes: event.target.checked
                                  ? [...current.permissoes, permission]
                                  : current.permissoes.filter(
                                      (item) => item !== permission
                                    ),
                              }));
                            }}
                            className="accent-[var(--color-primary)]"
                          />
                          {permission}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="h-10 px-5 rounded-md border border-[#D8D8D8] text-sm text-[#555555]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingRole ? !onUpdateRole : !onCreateRole}
                  className="h-10 px-6 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingRole ? 'Salvar' : 'Criar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {moduleAccessRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0 bg-black/60"
            onClick={closeModuleAccessModal}
          />

          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="h-16 px-5 border-b border-[#E6E6E6] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Acesso por módulo</h2>
                <p className="text-[11px] text-[#777777]">{moduleAccessRole.nome}</p>
              </div>
              <button
                type="button"
                onClick={closeModuleAccessModal}
                className="w-8 h-8 rounded-full bg-[#FAFAFA] flex items-center justify-center text-[#777777]"
              >
                <span className="material-icons text-[17px]">close</span>
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {moduleAccessRole.acesso_total ? (
                <p className="text-sm text-[#555555] border border-dashed border-[#DDDDDD] rounded-md p-4">
                  Este cargo tem acesso total e já enxerga todos os módulos automaticamente.
                </p>
              ) : modules.length === 0 ? (
                <p className="text-sm text-[#777777] border border-dashed border-[#DDDDDD] rounded-md p-4">
                  Nenhum módulo cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {modules.map((modulo) => (
                    <div
                      key={modulo.id}
                      className="h-12 px-3 rounded-md border border-[#DDDDDD] flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-[#333333] truncate">{modulo.nome}</span>
                      <select
                        value={moduloNivelPorId[modulo.id] || ''}
                        disabled={moduloNiveisLoading}
                        onChange={(event) =>
                          handleModuloNivelChange(modulo.id, event.target.value)
                        }
                        className="h-9 rounded-md border border-[#DADADA] bg-white px-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                      >
                        <option value="">Sem acesso</option>
                        <option value="visualizar">Visualizar</option>
                        <option value="editar">Editar</option>
                        <option value="gerenciar">Gerenciar</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-[72px] px-5 border-t border-[#E6E6E6] flex items-center justify-end bg-white">
              <button
                type="button"
                onClick={closeModuleAccessModal}
                className="h-10 min-w-[100px] px-5 rounded-md bg-primary text-white text-[13px] font-semibold hover:bg-primary/90"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}