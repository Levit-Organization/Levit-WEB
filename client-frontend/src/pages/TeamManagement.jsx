import { useMemo, useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { equipeService } from '../services/equipeService';
import { cargoService } from '../services/cargoService';

const availablePermissions = ['Módulos', 'Financeiro', 'Equipe', 'Relatórios'];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

function getAvatarColor(name = '') {
  const palette = [
    'bg-violet-600',
    'bg-sky-600',
    'bg-amber-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-indigo-600',
    'bg-cyan-600',
    'bg-fuchsia-600',
  ];
  return palette[name.length % palette.length];
}

function statusClass(status) {
  switch (status) {
    case 'Pendente':
      return 'bg-amber-100 text-amber-700';
    case 'Inativo':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
}

export default function TeamManagement() {
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        equipeService.listarMembros(),
        cargoService.listarCargos(),
      ]);
      setMembers(membersData.map(m => ({ ...m, cargo: m.cargo_nome, status: m.status || 'Ativo' })));
      setRoles(rolesData.map(r => ({
        ...r,
        permissoes: Array.isArray(r.permissoes) ? r.permissoes : (r.permissoes ? JSON.parse(r.permissoes) : []),
        color: r.color || 'bg-violet-100 text-violet-700',
        descricao: r.descricao || 'Cargo da equipe',
      })));
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingRole, setEditingRole] = useState(null);

  const [memberForm, setMemberForm] = useState({
    nome: '',
    email: '',
    cargo_id: '',
    status: 'Pendente',
  });

  const [roleForm, setRoleForm] = useState({
    nome: '',
    descricao: '',
    permissoes: [],
    color: 'bg-violet-100 text-violet-700',
  });

  const roleMap = useMemo(() => {
    return roles.reduce((acc, role) => {
      acc[role.nome] = role;
      return acc;
    }, {});
  }, [roles]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = [member.nome, member.email, member.cargo]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'Todos' || member.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const membersCount = members.length;
  const activeCount = members.filter((m) => m.status === 'Ativo').length;
  const pendingCount = members.filter((m) => m.status === 'Pendente').length;

  const openInviteModal = (member = null) => {
    setEditingMember(member);
    setMemberForm(
      member
        ? {
            nome: member.nome,
            email: member.email,
            cargo_id: roles.find(r => r.nome === member.cargo)?.id || '',
            status: member.status,
          }
        : {
            nome: '',
            email: '',
            cargo_id: roles[0]?.id || '',
            status: 'Pendente',
          }
    );
    setInviteOpen(true);
  };

  const closeInviteModal = () => {
    setInviteOpen(false);
    setEditingMember(null);
  };

  const openRoleModal = (role = null) => {
    setEditingRole(role);
    setRoleForm(
      role
        ? {
            nome: role.nome,
            descricao: role.descricao || '',
            permissoes: role.permissoes || [],
            color: role.color || 'bg-violet-100 text-violet-700',
          }
        : {
            nome: '',
            descricao: '',
            permissoes: ['Módulos'],
            color: 'bg-violet-100 text-violet-700',
          }
    );
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setEditingRole(null);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();

    if (!memberForm.email.trim()) {
      alert('E-mail é obrigatório!');
      return;
    }
    
    if (!memberForm.cargo_id) {
      alert('Selecione um cargo válido!');
      return;
    }

    try {
      if (editingMember) {
        alert('Edição de membro ainda não suportada pelo servidor.');
      } else {
        await equipeService.convidarMembro(memberForm.email, memberForm.cargo_id);
        alert('Convite enviado com sucesso!');
        fetchData();
      }
      closeInviteModal();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Erro ao salvar membro.');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Deseja remover este colaborador da lista?')) return;
    try {
      await equipeService.removerMembro(memberId);
      alert('Colaborador removido com sucesso!');
      fetchData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Erro ao remover membro.');
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.nome.trim()) {
      alert('Nome do cargo é obrigatório!');
      return;
    }

    try {
      if (editingRole) {
        alert('A edição de cargos ainda não é suportada pelo servidor.');
      } else {
        await cargoService.criarCargo(roleForm.nome, roleForm.permissoes);
        alert('Cargo criado com sucesso!');
        fetchData();
      }
      closeRoleModal();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Erro ao salvar cargo.');
    }
  };

  const handleDeleteRole = (roleId) => {
    alert('A exclusão de cargos ainda não é suportada pelo servidor.');
  };

  const roleSummary = roles.map((role) => ({
    ...role,
    usuarios: members.filter((member) => member.cargo === role.nome).length,
  }));

  return (
    <Layout>
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Administração de Equipe</h1>
          <p className="text-sm text-light-text mt-1">
            Convide colaboradores, organize cargos e mantenha o acesso da equipe bem estruturado.
          </p>
        </div>

        <button
          onClick={() => openInviteModal()}
          className="bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition flex items-center gap-2 self-start md:self-auto"
        >
          <span className="material-icons text-base">person_add</span>
          Adicionar Membro
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white border border-divider rounded-xl p-5">
          <p className="text-sm text-light-text">Total de colaboradores</p>
          <h3 className="text-3xl font-bold text-primary mt-1">{membersCount}</h3>
        </div>

        <div className="bg-white border border-divider rounded-xl p-5">
          <p className="text-sm text-light-text">Membros ativos</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-1">{activeCount}</h3>
        </div>

        <div className="bg-white border border-divider rounded-xl p-5">
          <p className="text-sm text-light-text">Convites pendentes</p>
          <h3 className="text-3xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
        </div>
      </section>

      <section className="bg-white border border-divider rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 border-b border-divider">
          <div className="flex flex-wrap gap-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-light-text hover:text-gray-700'
              }`}
            >
              Colaboradores
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'roles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-light-text hover:text-gray-700'
              }`}
            >
              Cargos & Permissões
            </button>
          </div>
        </div>

        {activeTab === 'members' ? (
          <div className="p-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between mb-5">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full xl:max-w-2xl">
                <div className="relative flex-1">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-light-text text-lg">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail ou cargo"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-divider rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-divider rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[160px]"
                >
                  <option>Todos</option>
                  <option>Ativo</option>
                  <option>Pendente</option>
                  <option>Inativo</option>
                </select>
              </div>

              <button
                onClick={() => openInviteModal()}
                className="border border-divider bg-white text-sm font-medium px-4 py-2.5 rounded-lg hover:border-primary/30 hover:text-primary transition flex items-center gap-2 self-start"
              >
                <span className="material-icons text-base">mail</span>
                Convidar por e-mail
              </button>
            </div>

            <div className="hidden lg:block overflow-x-auto border border-divider rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-background text-light-text uppercase text-[11px] tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Nome / E-mail</th>
                    <th className="text-left px-4 py-3 font-semibold">Cargo Atual</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-light-text">
                        Nenhum colaborador encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => {
                      const role = roleMap[member.cargo];

                      return (
                        <tr
                          key={member.id}
                          className="border-t border-divider hover:bg-background/60 transition"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3 min-w-[280px]">
                              <div
                                className={`w-10 h-10 rounded-full text-white flex items-center justify-center text-xs font-bold ${getAvatarColor(
                                  member.nome
                                )}`}
                              >
                                {getInitials(member.nome)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{member.nome}</p>
                                <p className="text-xs text-light-text">{member.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                role?.color || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {member.cargo}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass(
                                member.status
                              )}`}
                            >
                              {member.status}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openInviteModal(member)}
                                className="w-9 h-9 rounded-lg border border-divider text-gray-500 hover:text-primary hover:border-primary/30 transition inline-flex items-center justify-center"
                                title="Editar colaborador"
                              >
                                <span className="material-icons text-base">edit</span>
                              </button>

                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="w-9 h-9 rounded-lg border border-divider text-red-400 hover:text-red-600 hover:border-red-200 transition inline-flex items-center justify-center"
                                title="Excluir colaborador"
                              >
                                <span className="material-icons text-base">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {filteredMembers.length === 0 ? (
                <div className="col-span-full border border-dashed border-divider rounded-xl p-10 text-center text-light-text text-sm">
                  Nenhum colaborador encontrado com os filtros atuais.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const role = roleMap[member.cargo];

                  return (
                    <div key={member.id} className="border border-divider rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(
                              member.nome
                            )}`}
                          >
                            {getInitials(member.nome)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{member.nome}</p>
                            <p className="text-xs text-light-text truncate">{member.email}</p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClass(
                            member.status
                          )}`}
                        >
                          {member.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            role?.color || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {member.cargo}
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openInviteModal(member)}
                            className="w-9 h-9 rounded-lg border border-divider text-gray-500 hover:text-primary hover:border-primary/30 transition inline-flex items-center justify-center"
                          >
                            <span className="material-icons text-base">edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="w-9 h-9 rounded-lg border border-divider text-red-400 hover:text-red-600 hover:border-red-200 transition inline-flex items-center justify-center"
                          >
                            <span className="material-icons text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
              <p className="text-sm text-light-text">
                Defina modelos de acesso para vincular à sua equipe.
              </p>

              <button
                onClick={() => openRoleModal()}
                className="border border-divider bg-white text-sm font-medium px-4 py-2.5 rounded-lg hover:border-primary/30 hover:text-primary transition flex items-center gap-2 self-start"
              >
                <span className="material-icons text-base">add</span>
                Criar cargo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {roleSummary.map((role) => (
                <div
                  key={role.id}
                  className="bg-white border border-divider rounded-xl p-5 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{role.nome}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${role.color}`}
                        >
                          {role.usuarios} usuário{role.usuarios !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-light-text mt-1 leading-relaxed">
                        {role.descricao}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => openRoleModal(role)}
                        className="w-8 h-8 rounded-lg hover:bg-background text-gray-500 hover:text-primary transition inline-flex items-center justify-center"
                        title="Editar cargo"
                      >
                        <span className="material-icons text-base">edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition inline-flex items-center justify-center"
                        title="Excluir cargo"
                      >
                        <span className="material-icons text-base">close</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {role.permissoes.map((permission) => (
                      <span
                        key={permission}
                        className="bg-background text-light-text text-xs px-2.5 py-1 rounded-full"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeInviteModal}></div>

          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-divider">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingMember ? 'Editar colaborador' : 'Convidar para a equipe'}
                </h2>
                <p className="text-sm text-light-text mt-1">
                  {editingMember
                    ? 'Atualize as informações do colaborador.'
                    : 'Envie um convite e defina o cargo inicial de acesso.'}
                </p>
              </div>

              <button
                onClick={closeInviteModal}
                className="w-9 h-9 rounded-lg hover:bg-background transition inline-flex items-center justify-center text-gray-500"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form
              onSubmit={handleSaveMember}
              className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
                <span className="material-icons">mail</span>
                <p>
                  Um e-mail será enviado com um link exclusivo. O usuário poderá
                  definir sua própria senha e será vinculado à empresa automaticamente
                  após o aceite.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nome do colaborador</label>
                <input
                  type="text"
                  value={memberForm.nome}
                  onChange={(e) =>
                    setMemberForm((current) => ({ ...current, nome: e.target.value }))
                  }
                  placeholder="Ex.: Camila Moraes"
                  className="w-full border border-divider rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">E-mail do colaborador</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) =>
                    setMemberForm((current) => ({ ...current, email: e.target.value }))
                  }
                  placeholder="exemplo@empresa.com"
                  className="w-full border border-divider rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Cargo / Permissão de acesso
                </label>
                <select
                  value={memberForm.cargo_id}
                  onChange={(e) =>
                    setMemberForm((current) => ({ ...current, cargo_id: e.target.value }))
                  }
                  className="w-full border border-divider rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="" disabled>Selecione um cargo</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nome}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-divider flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeInviteModal}
                className="px-4 py-2.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:text-gray-700 hover:border-gray-300 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveMember}
                className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition"
              >
                {editingMember ? 'Salvar alterações' : 'Enviar convite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeRoleModal}></div>

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-divider overflow-hidden">
            <div className="px-6 py-5 border-b border-divider flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingRole ? 'Editar cargo' : 'Criar novo cargo'}
                </h2>
                <p className="text-sm text-light-text mt-1">
                  Configure um nome, uma descrição e as permissões de acesso.
                </p>
              </div>

              <button
                onClick={closeRoleModal}
                className="w-9 h-9 rounded-lg hover:bg-background transition inline-flex items-center justify-center text-gray-500"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do cargo</label>
                <input
                  type="text"
                  value={roleForm.nome}
                  onChange={(e) =>
                    setRoleForm((current) => ({ ...current, nome: e.target.value }))
                  }
                  placeholder="Ex.: Comercial"
                  className="w-full border border-divider rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estilo do badge</label>
                <select
                  value={roleForm.color}
                  onChange={(e) =>
                    setRoleForm((current) => ({ ...current, color: e.target.value }))
                  }
                  className="w-full border border-divider rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="bg-violet-100 text-violet-700">Roxo</option>
                  <option value="bg-sky-100 text-sky-700">Azul</option>
                  <option value="bg-emerald-100 text-emerald-700">Verde</option>
                  <option value="bg-amber-100 text-amber-700">Amarelo</option>
                  <option value="bg-pink-100 text-pink-700">Rosa</option>
                  <option value="bg-indigo-100 text-indigo-700">Índigo</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  rows="3"
                  value={roleForm.descricao}
                  onChange={(e) =>
                    setRoleForm((current) => ({ ...current, descricao: e.target.value }))
                  }
                  placeholder="Explique brevemente a responsabilidade desse cargo."
                  className="w-full border border-divider rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-3">Permissões</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePermissions.map((permission) => {
                    const checked = roleForm.permissoes.includes(permission);

                    return (
                      <label
                        key={permission}
                        className={`border rounded-xl p-4 cursor-pointer transition ${
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'border-divider hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setRoleForm((current) => ({
                                ...current,
                                permissoes: e.target.checked
                                  ? [...current.permissoes, permission]
                                  : current.permissoes.filter((item) => item !== permission),
                              }));
                            }}
                            className="mt-1 accent-[var(--color-primary)]"
                          />

                          <div>
                            <p className="font-medium text-sm">{permission}</p>
                            <p className="text-xs text-light-text mt-1">
                              Permite acesso ao módulo de {permission.toLowerCase()}.
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="px-4 py-2.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:text-gray-700 hover:border-gray-300 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition"
                >
                  {editingRole ? 'Salvar cargo' : 'Criar cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}