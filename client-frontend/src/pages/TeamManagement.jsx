import { useState } from 'react';
import Layout from '../components/Layout';
import {
  Button,
  Input,
  Select,
  Modal,
  Drawer,
  Badge,
  Card,
  Avatar,
  Alert,
  EmptyState,
  Skeleton,
  PageHeader,
} from '../components/ui';

/** Status é estado, não etiqueta: cada um tem a sua cor. */
const STATUS_VARIANT = {
  Ativo: 'success',
  Pendente: 'warning',
  Inativo: 'default',
};

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
    event?.preventDefault?.();

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

  const abas = [
    { id: 'members', label: 'Colaboradores', count: members.length },
    { id: 'roles', label: 'Cargos e permissões', count: roles.length },
  ];

  return (
    <Layout>
      <div className="flex flex-col">
        <PageHeader
          icon="groups"
          title="Equipe"
          subtitle="Quem trabalha aqui e o que cada cargo pode acessar"
          actions={
            <Button icon="person_add" onClick={() => openInviteModal()}>
              Convidar pessoa
            </Button>
          }
        />

        <div>
          <div className="border-b border-divider flex gap-6 mb-6">
            {abas.map((aba) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setActiveTab(aba.id)}
                className={`flex items-center gap-2 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === aba.id
                    ? 'text-primary border-primary'
                    : 'text-light-text border-transparent hover:text-ink-soft'
                }`}
              >
                {aba.label}
                {aba.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-2xs font-bold tabular ${
                      activeTab === aba.id ? 'bg-primary-100 text-primary-700' : 'bg-background text-light-text'
                    }`}
                  >
                    {aba.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'members' ? (
            <section>
              <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="search"
                    icon="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nome ou e-mail"
                    aria-label="Buscar colaborador"
                  />
                </div>

                <div className="w-full md:w-[240px]">
                  <Select
                    icon="filter_list"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    aria-label="Filtrar por cargo"
                    options={[{ value: '', label: 'Todos os cargos' }, ...roles.map((role) => ({ value: role.id, label: role.nome }))]}
                  />
                </div>
              </div>

              <Card padding="none" className="hidden md:block overflow-hidden">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[27%]" />
                    <col className="w-[22%]" />
                    <col className="w-[16%]" />
                  </colgroup>

                  <thead>
                    <tr className="h-10 bg-white border-b border-divider">
                      <th className="px-4 text-left text-[11px] font-bold tracking-[0.03em] text-light-text uppercase">
                        Nome / E-mail
                      </th>
                      <th className="px-4 text-left text-[11px] font-bold tracking-[0.03em] text-light-text uppercase">
                        Cargo Atual
                      </th>
                      <th className="px-4 text-left text-[11px] font-bold tracking-[0.03em] text-light-text uppercase">
                        Status
                      </th>
                      <th className="px-4 text-right text-[11px] font-bold tracking-[0.03em] text-light-text uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      [1, 2, 3].map((linha) => (
                        <tr key={linha} className="h-[56px] border-b last:border-b-0 border-divider">
                          <td className="px-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                              <div className="flex-1">
                                <Skeleton className="h-3.5 w-32 mb-1.5" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                          <td className="px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                          <td className="px-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                        </tr>
                      ))
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-12">
                          <EmptyState
                            size="sm"
                            icon={normalizedSearch || roleFilter ? 'search_off' : 'group_add'}
                            title={
                              normalizedSearch || roleFilter
                                ? 'Ninguém encontrado com esse filtro'
                                : 'Só você na equipe'
                            }
                            description={
                              normalizedSearch || roleFilter
                                ? 'Tente outro nome, e-mail ou cargo.'
                                : 'Convide quem participa das contratações. Cada pessoa entra com um cargo, e o cargo define o que ela enxerga.'
                            }
                            actionLabel={normalizedSearch || roleFilter ? undefined : 'Convidar pessoa'}
                            actionIcon="person_add"
                            onAction={normalizedSearch || roleFilter ? undefined : () => openInviteModal()}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="h-[56px] border-b last:border-b-0 border-divider hover:bg-background/60 transition-colors"
                        >
                          <td className="px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={member.nome} size="md" />
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-ink truncate">
                                  {member.nome || '—'}
                                </p>
                                <p className="text-2xs text-light-text truncate">
                                  {member.email || '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4">
                            {member.cargo ? (
                              <Badge variant="primary" size="sm">{member.cargo}</Badge>
                            ) : (
                              <span className="text-xs text-light-text">Sem cargo</span>
                            )}
                          </td>

                          <td className="px-4">
                            {member.status ? (
                              <Badge variant={STATUS_VARIANT[member.status] || 'default'} size="sm" dot>
                                {member.status}
                              </Badge>
                            ) : (
                              <span className="text-xs text-light-text">—</span>
                            )}
                          </td>

                          <td className="px-4">
                            <div className="flex justify-end gap-2">
                              {onUpdateMember && (
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={() => openInviteModal(member)}
                                  title="Editar colaborador"
                                  icon="edit"
                                  className="hover:text-primary hover:border-primary"
                                />
                              )}

                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleDeleteMember(member)}
                                title="Excluir colaborador"
                                icon="delete_outline"
                                className="text-danger hover:bg-danger-bg hover:border-danger"
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>

              <div className="grid grid-cols-1 gap-3 md:hidden">
                {loading ? (
                  [1, 2].map((c) => (
                    <Card key={c} padding="sm" className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3.5 w-32 mb-1.5" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </Card>
                  ))
                ) : filteredMembers.length === 0 ? (
                  <Card className="py-8">
                    <EmptyState
                      size="sm"
                      icon={normalizedSearch || roleFilter ? 'search_off' : 'group_add'}
                      title={normalizedSearch || roleFilter ? 'Ninguém com esse filtro' : 'Só você na equipe'}
                      description={
                        normalizedSearch || roleFilter
                          ? 'Tente outro nome, e-mail ou cargo.'
                          : 'Convide quem participa das contratações.'
                      }
                    />
                  </Card>
                ) : (
                  filteredMembers.map((member) => (
                    <Card key={member.id} as="article" padding="sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={member.nome} size="lg" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-ink truncate">
                              {member.nome || '—'}
                            </p>
                            <p className="text-xs text-light-text truncate">
                              {member.email || '—'}
                            </p>
                          </div>
                        </div>

                        {member.status && (
                          <Badge variant={STATUS_VARIANT[member.status] || 'default'} size="sm" dot>
                            {member.status}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        {member.cargo ? (
                          <Badge variant="primary" size="sm">{member.cargo}</Badge>
                        ) : (
                          <span />
                        )}

                        <div className="flex gap-2">
                          {onUpdateMember && (
                            <Button variant="secondary" size="icon" onClick={() => openInviteModal(member)} icon="edit" />
                          )}
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleDeleteMember(member)}
                            icon="delete_outline"
                            className="text-danger"
                          />
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-5 gap-4">
                <p className="text-sm text-light-text">
                  Defina modelos de acesso para vincular à sua equipe.
                </p>

                <Button variant="secondary" size="sm" icon="add" onClick={() => openRoleModal()}>
                  Criar Cargo
                </Button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((c) => (
                    <Card key={c} padding="sm" className="min-h-[92px]">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-16 mb-4" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : roles.length === 0 ? (
                <Card className="py-10">
                  <EmptyState
                    icon="badge"
                    title="Nenhum cargo criado"
                    description="Cargo é o que define o acesso: quem é de recrutamento vê as vagas, quem é de admissão vê os documentos. Cada pessoa da equipe recebe um."
                    actionLabel="Criar cargo"
                    actionIcon="add"
                    onAction={() => openRoleModal()}
                  />
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {roles.map((role) => (
                    <Card
                      key={role.id}
                      as="article"
                      padding="none"
                      className="relative min-h-[92px] px-5 py-4 hover:border-divider-strong transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-ink leading-tight truncate">
                            {role.nome || '—'}
                          </h3>
                          {typeof role.usuarios === 'number' && (
                            <p className="mt-0.5 text-2xs text-light-text">
                              {role.usuarios} {role.usuarios === 1 ? 'pessoa' : 'pessoas'}
                            </p>
                          )}
                          {role.acesso_total && (
                            <Badge variant="warning" size="sm" icon="key" className="mt-1.5">
                              Acesso total
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openModuleAccessModal(role)}
                            className="w-7 h-7 rounded-md text-light-text hover:bg-background hover:text-primary flex items-center justify-center"
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
                                className="w-7 h-7 rounded-md text-light-text hover:bg-background hover:text-primary flex items-center justify-center"
                                title="Editar cargo"
                              >
                                <span className="material-icons text-[16px]">edit</span>
                              </button>
                            )}
                            {onDeleteRole && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="w-7 h-7 rounded-md text-danger hover:bg-danger-bg flex items-center justify-center"
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
                            <Badge key={permission} variant="default" size="sm">{permission}</Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <Drawer
        open={inviteOpen}
        onClose={closeInviteModal}
        title={editingMember ? 'Editar colaborador' : 'Convidar para a equipe'}
        footer={
          <>
            <Button variant="secondary" onClick={closeInviteModal}>Cancelar</Button>
            <Button
              onClick={submitMember}
              disabled={editingMember ? !onUpdateMember : !onInviteMember}
            >
              {editingMember ? 'Salvar Alterações' : 'Enviar Convite'}
            </Button>
          </>
        }
      >
        {!editingMember && (
          <div className="mb-5">
            <Alert variant="info" icon="forward_to_inbox">
              A pessoa recebe um link exclusivo por e-mail, define a própria senha e entra já vinculada
              ao cargo escolhido aqui.
            </Alert>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {editingMember && (
            <Input
              label="Nome do colaborador"
              value={memberForm.nome}
              onChange={(event) => setMemberForm((current) => ({ ...current, nome: event.target.value }))}
            />
          )}

          <Input
            label="E-mail do colaborador"
            type="email"
            value={memberForm.email}
            onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="exemplo@empresa.com"
          />

          <Select
            label="Cargo / Permissão de Acesso"
            value={memberForm.cargo}
            onChange={(event) => setMemberForm((current) => ({ ...current, cargo: event.target.value }))}
            placeholder="Selecione um cargo"
            options={roles.map((role) => ({ value: role.id, label: role.nome }))}
          />

          {editingMember && (
            <Select
              label="Status"
              value={memberForm.status}
              onChange={(event) => setMemberForm((current) => ({ ...current, status: event.target.value }))}
              placeholder="Selecione um status"
              options={[
                { value: 'Ativo', label: 'Ativo' },
                { value: 'Inativo', label: 'Inativo' },
                { value: 'Pendente', label: 'Pendente' },
              ]}
            />
          )}
        </div>
      </Drawer>

      <Modal
        open={roleModalOpen}
        onClose={closeRoleModal}
        title={editingRole ? 'Editar Cargo' : 'Criar Cargo'}
        footer={
          <>
            <Button variant="secondary" onClick={closeRoleModal}>Cancelar</Button>
            <Button
              type="submit"
              form="role-form"
              disabled={editingRole ? !onUpdateRole : !onCreateRole}
            >
              {editingRole ? 'Salvar' : 'Criar Cargo'}
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={submitRole}>
          <div className="mb-5">
            <Input
              label="Nome do cargo"
              value={roleForm.nome}
              onChange={(event) => setRoleForm((current) => ({ ...current, nome: event.target.value }))}
              placeholder="Digite o nome do cargo"
            />
          </div>

          <div>
            <p className="text-[12px] font-semibold mb-3">Permissões</p>
            {permissions.length === 0 ? (
              <p className="text-xs text-light-text border border-dashed border-divider rounded-md p-4">
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
                          : 'border-divider text-light-text hover:border-primary-300 hover:text-ink-soft'
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
                              : current.permissoes.filter((item) => item !== permission),
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
        </form>
      </Modal>

      <Modal
        open={!!moduleAccessRole}
        onClose={closeModuleAccessModal}
        title="Acesso por módulo"
        footer={<Button onClick={closeModuleAccessModal}>Concluído</Button>}
      >
        {moduleAccessRole && (
          <>
            <p className="text-[11px] text-light-text mb-4 -mt-2">{moduleAccessRole.nome}</p>

            {moduleAccessRole.acesso_total ? (
              <p className="text-sm text-light-text border border-dashed border-divider rounded-md p-4">
                Este cargo tem acesso total e já enxerga todos os módulos automaticamente.
              </p>
            ) : modules.length === 0 ? (
              <p className="text-sm text-light-text border border-dashed border-divider rounded-md p-4">
                Nenhum módulo cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {modules.map((modulo) => (
                  <div
                    key={modulo.id}
                    className="h-12 px-3 rounded-md border border-divider flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-ink truncate">{modulo.nome}</span>
                    <Select
                      value={moduloNivelPorId[modulo.id] || ''}
                      disabled={moduloNiveisLoading}
                      onChange={(event) => handleModuloNivelChange(modulo.id, event.target.value)}
                      className="h-9 w-40"
                      options={[
                        { value: '', label: 'Sem acesso' },
                        { value: 'visualizar', label: 'Visualizar' },
                        { value: 'editar', label: 'Editar' },
                        { value: 'gerenciar', label: 'Gerenciar' },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </Layout>
  );
}
