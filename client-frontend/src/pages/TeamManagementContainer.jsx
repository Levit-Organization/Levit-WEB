import { useCallback, useEffect, useState } from 'react';
import TeamManagement from './TeamManagement';
import { equipeService } from '../services/equipeService';
import { cargoService } from '../services/cargoService';
import { moduloService } from '../services/moduloService';

// Precisa ser mantido manualmente em sincronia com o catálogo semeado em
// api-backend/app/Database/Seeds/PermissaoSeeder.php — não há endpoint
// GET /permissoes para buscar essa lista dinamicamente.
const GLOBAL_PERMISSIONS = [
  'criar_modulos',
  'visualizar_equipe',
  'gerenciar_equipe',
  'gerenciar_cargos',
  'exportar_dados',
  'resetar_dados',
  'ver_relatorios',
];

function normalizeRole(role) {
  return {
    ...role,
    permissoes: Array.isArray(role.permissoes)
      ? role.permissoes
      : role.permissoes
      ? JSON.parse(role.permissoes)
      : [],
    // Postgres/CodeIgniter devolve booleano como string ("t"/"f"), não bool JS.
    acesso_total: role.acesso_total === true || role.acesso_total === 't',
  };
}

function normalizeMember(member) {
  return { ...member, cargo: member.cargo_nome };
}

export default function TeamManagementContainer() {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  const [moduloNiveis, setModuloNiveis] = useState([]);
  const [moduloNiveisLoading, setModuloNiveisLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersData, rolesData, modulesData] = await Promise.all([
        equipeService.listarMembros(),
        cargoService.listarCargos(),
        moduloService.getAll(),
      ]);
      setMembers((membersData || []).map(normalizeMember));
      setRoles((rolesData || []).map(normalizeRole));
      setModules(modulesData || []);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar os dados da equipe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenRoleModules = async (cargoId) => {
    setModuloNiveisLoading(true);
    try {
      const niveis = await cargoService.listarNiveisModulo(cargoId);
      setModuloNiveis(niveis || []);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar o acesso por módulo deste cargo.');
      setModuloNiveis([]);
    } finally {
      setModuloNiveisLoading(false);
    }
  };

  const handleSetModuloNivel = async (cargoId, moduloId, nivel) => {
    try {
      const niveis = await cargoService.definirNivelModulo(cargoId, moduloId, nivel);
      setModuloNiveis(niveis || []);
    } catch (error) {
      console.error(error);
      alert('Erro ao definir o nível de acesso do módulo.');
    }
  };

  const handleRemoveModuloNivel = async (cargoId, moduloId) => {
    try {
      await cargoService.removerNivelModulo(cargoId, moduloId);
      setModuloNiveis((current) => current.filter((item) => item.modulo_id !== moduloId));
    } catch (error) {
      console.error(error);
      alert('Erro ao remover o nível de acesso do módulo.');
    }
  };

  const handleInviteMember = async ({ email, cargo }) => {
    try {
      await equipeService.convidarMembro(email, cargo);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao convidar o colaborador.');
    }
  };

  const handleDeleteMember = async (id) => {
    try {
      await equipeService.removerMembro(id);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao remover o colaborador.');
    }
  };

  const handleCreateRole = async ({ nome, permissoes }) => {
    try {
      await cargoService.criarCargo(nome, permissoes);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao criar o cargo.');
    }
  };

  return (
    <TeamManagement
      members={members}
      roles={roles}
      modules={modules}
      permissions={GLOBAL_PERMISSIONS}
      loading={loading}
      onInviteMember={handleInviteMember}
      onDeleteMember={handleDeleteMember}
      onCreateRole={handleCreateRole}
      moduloNiveis={moduloNiveis}
      moduloNiveisLoading={moduloNiveisLoading}
      onOpenRoleModules={handleOpenRoleModules}
      onSetModuloNivel={handleSetModuloNivel}
      onRemoveModuloNivel={handleRemoveModuloNivel}
    />
  );
}
