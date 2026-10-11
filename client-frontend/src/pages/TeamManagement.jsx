import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Drawer,
  Badge,
  Card,
  Avatar,
  Alert,
  EmptyState,
  ErrorState,
  Skeleton,
  PageHeader,
  Pagination,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { useAuth } from '../hooks/useAuth';

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** "12 de out. de 2026" a partir do criado_em do backend ("AAAA-MM-DD HH:MM:SS"). */
function desde(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? null : formatoData.format(data);
}

const MAX_MENSAGEM = 500;

function diasAte(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  if (Number.isNaN(data.getTime())) return null;
  return Math.ceil((data.getTime() - Date.now()) / 86400000);
}

/** Convites enviados e ainda não aceitos, com reenviar e cancelar. */
function ConvitesPendentes({ convites, onReenviar, onCancelar }) {
  const [ocupado, setOcupado] = useState(null);
  if (!convites.length) return null;

  const agir = async (convite, acao) => {
    setOcupado(`${acao}-${convite.id}`);
    try {
      await (acao === 'reenviar' ? onReenviar(convite) : onCancelar(convite));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Card padding="none" className="mb-5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-divider">
        <span className="material-icons text-[18px] text-warning" aria-hidden="true">forward_to_inbox</span>
        <h2 className="text-sm font-semibold text-ink">Convites aguardando resposta</h2>
        <Badge variant="warning" size="sm">{convites.length}</Badge>
      </div>
      <ul className="divide-y divide-divider">
        {convites.map((convite) => {
          const dias = diasAte(convite.expira_em);
          return (
            <li key={convite.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-9 h-9 rounded-full bg-warning-bg text-warning flex items-center justify-center shrink-0" aria-hidden="true">
                  <span className="material-icons text-[18px]">mail</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{convite.email}</p>
                  <p className="text-2xs text-light-text truncate">
                    {convite.cargo_nome || 'Sem cargo'}
                    {convite.convidado_por_nome ? ` · convidado por ${convite.convidado_por_nome}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {convite.expirado ? (
                  <Badge variant="danger" size="sm" dot>Expirado</Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>
                    {dias !== null && dias <= 1 ? 'Vence hoje' : `Vence em ${dias} dias`}
                  </Badge>
                )}
                {onReenviar && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="send"
                    loading={ocupado === `reenviar-${convite.id}`}
                    onClick={() => agir(convite, 'reenviar')}
                    aria-label={`Reenviar convite para ${convite.email}`}
                  >
                    Reenviar
                  </Button>
                )}
                {onCancelar && (
                  <Button
                    variant="secondary"
                    size="icon"
                    icon="close"
                    loading={ocupado === `cancelar-${convite.id}`}
                    onClick={() => agir(convite, 'cancelar')}
                    title="Cancelar convite"
                    aria-label={`Cancelar convite para ${convite.email}`}
                    className="text-danger hover:bg-danger-bg hover:border-danger"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function TeamManagement({
  members = [],
  roles = [],
  modules = [],
  permissions = [],
  loading = false,
  error = '',
  onRetry,
  onInviteMember,
  invites = [],
  onResendInvite,
  onCancelInvite,
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
  const { usuario } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({
    nome: '',
    email: '',
    cargo: '',
    mensagem: '',
  });

  const [memberErrors, setMemberErrors] = useState({});
  const [memberError, setMemberError] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberInitial, setMemberInitial] = useState(null);

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

  const openInviteModal = (member = null) => {
    const inicial = member
      ? {
          nome: member.nome || '',
          email: member.email || '',
          cargo: member.cargo_id ?? '',
          mensagem: '',
        }
      : { nome: '', email: '', cargo: '', mensagem: '' };

    setEditingMember(member);
    setMemberForm(inicial);
    setMemberInitial(inicial);
    setMemberErrors({});
    setMemberError('');
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

  // Só limpa o formulário depois da animação de saída (o estado fica enquanto fecha).
  const closeInviteModal = () => setInviteOpen(false);

  const memberDirty = !!memberInitial && JSON.stringify(memberForm) !== JSON.stringify(memberInitial);

  const changeMember = (campo, valor) => {
    setMemberForm((current) => ({ ...current, [campo]: valor }));
    setMemberErrors((current) => (current[campo] ? { ...current, [campo]: undefined } : current));
  };

  const submitMember = async (event) => {
    event?.preventDefault?.();

    const erros = {};
    if (!memberForm.email.trim()) erros.email = 'Informe o e-mail.';
    else if (!/^\S+@\S+\.\S+$/.test(memberForm.email.trim())) erros.email = 'Esse e-mail não parece válido.';
    if (!memberForm.cargo) erros.cargo = 'Selecione um cargo para o colaborador.';
    if (memberForm.mensagem.length > MAX_MENSAGEM) erros.mensagem = `Use no máximo ${MAX_MENSAGEM} caracteres.`;
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

  const handleDeleteMember = (member) => {
    onDeleteMember?.(member);
  };

  const handleDeleteRole = (role) => {
    onDeleteRole?.(role.id);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredMembers = useMemo(() => members.filter((member) => {
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
  }), [members, roles, normalizedSearch, roleFilter]);

  const paginacao = usePagination(filteredMembers, 25);

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
          <div role="tablist" aria-label="Seções da equipe" className="border-b border-divider flex gap-6 mb-6 overflow-x-auto">
            {abas.map((aba) => (
              <button
                key={aba.id}
                id={`aba-${aba.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === aba.id}
                aria-controls={`painel-${aba.id}`}
                onClick={() => setActiveTab(aba.id)}
                className={`flex items-center gap-2 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
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

          {error && !loading ? (
            <Card padding="lg" className="py-12">
              <ErrorState size="lg" description={error} onRetry={onRetry} />
            </Card>
          ) : activeTab === 'members' ? (
            <section id="painel-members" role="tabpanel" aria-labelledby="aba-members">
              <ConvitesPendentes convites={invites} onReenviar={onResendInvite} onCancelar={onCancelInvite} />
              <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="search"
                    icon="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      paginacao.setPage(1);
                    }}
                    name="busca"
                    autoComplete="off"
                    placeholder="Buscar por nome ou e-mail"
                    aria-label="Buscar colaborador"
                  />
                </div>

                <div className="w-full md:w-[240px]">
                  <Select
                    icon="filter_list"
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value);
                      paginacao.setPage(1);
                    }}
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
                        Na equipe desde
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
                                : 'Convide quem trabalha com você. Cada pessoa entra com um cargo, e o cargo define o que ela enxerga.'
                            }
                            actionLabel={normalizedSearch || roleFilter ? undefined : 'Convidar pessoa'}
                            actionIcon="person_add"
                            onAction={normalizedSearch || roleFilter ? undefined : () => openInviteModal()}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginacao.pageItems.map((member) => (
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
                            <span className="text-xs text-ink-soft tabular">{desde(member.criado_em) || '—'}</span>
                          </td>

                          <td className="px-4">
                            <div className="flex justify-end gap-2">
                              {onUpdateMember && (
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={() => openInviteModal(member)}
                                  title="Editar colaborador"
                                  aria-label={`Editar ${member.nome || 'colaborador'}`}
                                  icon="edit"
                                  className="hover:text-primary hover:border-primary"
                                />
                              )}

                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleDeleteMember(member)}
                                title="Excluir colaborador"
                                aria-label={`Excluir ${member.nome || 'colaborador'}`}
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
                          : 'Convide quem trabalha com você.'
                      }
                    />
                  </Card>
                ) : (
                  paginacao.pageItems.map((member) => (
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

                        {desde(member.criado_em) && (
                          <span className="text-2xs text-light-text tabular shrink-0">desde {desde(member.criado_em)}</span>
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
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => openInviteModal(member)}
                              icon="edit"
                              aria-label={`Editar ${member.nome || 'colaborador'}`}
                            />
                          )}
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleDeleteMember(member)}
                            icon="delete_outline"
                            aria-label={`Excluir ${member.nome || 'colaborador'}`}
                            className="text-danger"
                          />
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {!loading && (
                <Card padding="none" className="mt-3 overflow-hidden">
                  <Pagination {...paginacao} onPageChange={paginacao.setPage} label="colaboradores" />
                </Card>
              )}
            </section>
          ) : (
            <section id="painel-roles" role="tabpanel" aria-labelledby="aba-roles">
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
                    description="Cargo é o que define o acesso: quem é de vendas vê os clientes, quem é do financeiro vê as contas. Cada pessoa da equipe recebe um."
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
                            title="Acesso por tabela"
                            aria-label={`Acesso por tabela do cargo ${role.nome}`}
                          >
                            <span className="material-icons text-[16px]" aria-hidden="true">tune</span>
                          </button>
                          {(onUpdateRole || onDeleteRole) && (
                            <>
                            {onUpdateRole && (
                              <button
                                type="button"
                                onClick={() => openRoleModal(role)}
                                className="w-7 h-7 rounded-md text-light-text hover:bg-background hover:text-primary flex items-center justify-center"
                                title="Editar cargo"
                                aria-label={`Editar cargo ${role.nome}`}
                              >
                                <span className="material-icons text-[16px]" aria-hidden="true">edit</span>
                              </button>
                            )}
                            {onDeleteRole && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="w-7 h-7 rounded-md text-danger hover:bg-danger-bg flex items-center justify-center"
                                title="Excluir cargo"
                                aria-label={`Excluir cargo ${role.nome}`}
                              >
                                <span className="material-icons text-[16px]" aria-hidden="true">delete_outline</span>
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
        dirty={memberDirty}
        title={editingMember ? 'Editar colaborador' : 'Convidar para a equipe'}
        footer={
          <>
            <Button variant="secondary" onClick={closeInviteModal}>Cancelar</Button>
            <Button
              type="submit"
              form="member-form"
              loading={savingMember}
              disabled={editingMember ? !onUpdateMember : !onInviteMember}
            >
              {editingMember ? 'Salvar Alterações' : 'Enviar Convite'}
            </Button>
          </>
        }
      >
        {memberError && (
          <div className="mb-4">
            <Alert variant="error">{memberError}</Alert>
          </div>
        )}

        {!editingMember && (
          <div className="mb-5">
            <Alert variant="info" icon="forward_to_inbox">
              A pessoa recebe um e-mail com o seu nome e a sua mensagem. Ao clicar em aceitar, ela cria a senha e
              já entra na equipe com o cargo escolhido aqui.
            </Alert>
          </div>
        )}

        <form id="member-form" onSubmit={submitMember} noValidate className="flex flex-col gap-4">
          {editingMember && (
            <Input
              label="Nome do colaborador"
              name="nome"
              autoComplete="off"
              value={memberForm.nome}
              onChange={(event) => changeMember('nome', event.target.value)}
            />
          )}

          <Input
            label="E-mail do colaborador"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={memberForm.email}
            onChange={(event) => changeMember('email', event.target.value)}
            placeholder="exemplo@empresa.com"
            error={memberErrors.email}
            required
          />

          <Select
            label="Cargo / Permissão de Acesso"
            name="cargo"
            value={memberForm.cargo}
            onChange={(event) => changeMember('cargo', event.target.value)}
            placeholder="Selecione um cargo"
            options={roles.map((role) => ({ value: role.id, label: role.nome }))}
            error={memberErrors.cargo}
            // A API não deixa ninguém mudar o próprio cargo (evita alguém se dar mais acesso).
            disabled={!!editingMember && editingMember.id === usuario?.id}
            hint={editingMember && editingMember.id === usuario?.id ? 'Você não pode mudar o seu próprio cargo. Peça a alguém com acesso total.' : undefined}
            required
          />

          {!editingMember && (
            <Textarea
              label="Mensagem para a pessoa (opcional)"
              name="mensagem"
              rows={4}
              maxLength={MAX_MENSAGEM}
              value={memberForm.mensagem}
              onChange={(event) => changeMember('mensagem', event.target.value)}
              placeholder="Ex: Oi, Ana! Vamos organizar o trabalho da equipe por aqui. Qualquer dúvida, me chama."
              hint={`Aparece no e-mail e na página do convite. ${memberForm.mensagem.length}/${MAX_MENSAGEM}`}
              error={memberErrors.mensagem}
            />
          )}

        </form>
      </Drawer>

      <Modal
        open={roleModalOpen}
        onClose={closeRoleModal}
        dirty={roleDirty}
        title={editingRole ? 'Editar Cargo' : 'Criar Cargo'}
        footer={
          <>
            <Button variant="secondary" onClick={closeRoleModal}>Cancelar</Button>
            <Button
              type="submit"
              form="role-form"
              loading={savingRole}
              disabled={editingRole ? !onUpdateRole : !onCreateRole}
            >
              {editingRole ? 'Salvar' : 'Criar Cargo'}
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={submitRole} noValidate>
          {roleFormError && (
            <div className="mb-4">
              <Alert variant="error">{roleFormError}</Alert>
            </div>
          )}

          <div className="mb-5">
            <Input
              label="Nome do cargo"
              name="nome_cargo"
              autoComplete="off"
              value={roleForm.nome}
              onChange={(event) => {
                setRoleForm((current) => ({ ...current, nome: event.target.value }));
                setRoleError('');
              }}
              placeholder="Digite o nome do cargo"
              error={roleError}
              required
            />
          </div>

          <div>
            <p className="text-xs font-semibold mb-3 text-ink">Permissões</p>
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
        title="Acesso por tabela"
        footer={<Button onClick={closeModuleAccessModal}>Concluído</Button>}
      >
        {moduleAccessRole && (
          <>
            <p className="text-[11px] text-light-text mb-4 -mt-2">{moduleAccessRole.nome}</p>

            {moduleAccessRole.acesso_total ? (
              <p className="text-sm text-light-text border border-dashed border-divider rounded-md p-4">
                Este cargo tem acesso total e já enxerga todas as tabelas automaticamente.
              </p>
            ) : modules.length === 0 ? (
              <p className="text-sm text-light-text border border-dashed border-divider rounded-md p-4">
                Nenhuma tabela criada ainda.
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
                      aria-label={`Acesso à tabela ${modulo.nome}`}
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
