import { useMemo, useState } from 'react';
import TeamManagement from './TeamManagement';
import { equipeService } from '../services/equipeService';
import { cargoService } from '../services/cargoService';
import { useEquipe, useCargos, useModulos, useConvites } from '../hooks/queries';
import { useToast, useConfirm } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

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

const SEM_DADOS = [];

function normalizeRole(role) {
  let permissoes = [];
  if (Array.isArray(role.permissoes)) {
    permissoes = role.permissoes;
  } else if (role.permissoes) {
    try {
      permissoes = JSON.parse(role.permissoes);
    } catch {
      permissoes = [];
    }
  }

  return {
    ...role,
    permissoes,
    // Postgres/CodeIgniter devolve booleano como string ("t"/"f"), não bool JS.
    acesso_total: role.acesso_total === true || role.acesso_total === 't',
  };
}

function normalizeMember(member) {
  return { ...member, cargo: member.cargo_nome };
}

/**
 * Os handlers de formulário (convidar, criar/editar cargo, editar pessoa) lançam
 * um Error com a mensagem da API: quem chama mantém o painel aberto e mostra o
 * erro no próprio formulário, em vez de fechar e perder o que foi digitado.
 */
export default function TeamManagementContainer() {
  const toast = useToast();
  const confirm = useConfirm();

  const equipeQuery = useEquipe();
  const convitesQuery = useConvites();
  const invites = convitesQuery.data ?? SEM_DADOS;
  const cargosQuery = useCargos();
  const modulosQuery = useModulos();

  const members = useMemo(() => (equipeQuery.data ?? SEM_DADOS).map(normalizeMember), [equipeQuery.data]);
  const roles = useMemo(() => (cargosQuery.data ?? SEM_DADOS).map(normalizeRole), [cargosQuery.data]);
  const modules = modulosQuery.data ?? SEM_DADOS;

  const loading = equipeQuery.isLoading || cargosQuery.isLoading || modulosQuery.isLoading;
  const failed = [equipeQuery, cargosQuery, modulosQuery].find((q) => q.isError);
  const loadError = failed ? mensagemDeErro(failed.error, 'Erro ao carregar os dados da equipe.') : '';

  const [moduloNiveis, setModuloNiveis] = useState([]);
  const [moduloNiveisLoading, setModuloNiveisLoading] = useState(false);

  const refetchAll = () => {
    [equipeQuery, cargosQuery, modulosQuery].filter((q) => q.isError).forEach((q) => q.refetch());
  };

  const handleOpenRoleModules = async (cargoId) => {
    setModuloNiveisLoading(true);
    try {
      const niveis = await cargoService.listarNiveisModulo(cargoId);
      setModuloNiveis(niveis || []);
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao carregar o acesso por tabela deste cargo.'));
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
      toast.error(mensagemDeErro(error, 'Erro ao definir o nível de acesso da tabela.'));
    }
  };

  const handleRemoveModuloNivel = async (cargoId, moduloId) => {
    try {
      await cargoService.removerNivelModulo(cargoId, moduloId);
      setModuloNiveis((current) => current.filter((item) => item.modulo_id !== moduloId));
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao remover o nível de acesso da tabela.'));
    }
  };

  const handleInviteMember = async ({ email, cargo, mensagem }) => {
    try {
      await equipeService.convidarMembro(email.trim(), cargo, mensagem?.trim());
      toast.success(`Convite enviado para ${email.trim()}.`);
    } catch (error) {
      throw new Error(mensagemDeErro(error, 'Erro ao convidar o colaborador.'), { cause: error });
    }
  };

  const handleResendInvite = async (convite) => {
    try {
      await equipeService.reenviarConvite(convite.id);
      toast.success(`Convite reenviado para ${convite.email}. O link anterior deixou de funcionar.`);
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao reenviar o convite.'));
    }
  };

  const handleCancelInvite = async (convite) => {
    const ok = await confirm({
      title: `Cancelar o convite para ${convite.email}?`,
      message: 'O link do e-mail deixa de funcionar. Você pode convidar de novo depois.',
      confirmLabel: 'Cancelar convite',
      cancelLabel: 'Manter',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await equipeService.cancelarConvite(convite.id);
      toast.success('Convite cancelado.');
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao cancelar o convite.'));
    }
  };

  const handleDeleteMember = async (member) => {
    const ok = await confirm({
      title: `Remover ${member.nome || 'colaborador'}?`,
      message: 'A pessoa perde o acesso à plataforma imediatamente. Essa ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await equipeService.removerMembro(member.id);
      toast.success('Colaborador removido.');
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao remover o colaborador.'));
    }
  };

  const handleCreateRole = async ({ nome, permissoes }) => {
    try {
      await cargoService.criarCargo(nome, permissoes);
      toast.success('Cargo criado.');
    } catch (error) {
      throw new Error(mensagemDeErro(error, 'Erro ao criar o cargo.'), { cause: error });
    }
  };

  const handleUpdateMember = async (id, dados) => {
    try {
      // A API espera `cargo_id`; o formulário trabalha com o campo `cargo` (id do cargo).
      const { cargo, ...resto } = dados;
      await equipeService.atualizarMembro(id, { ...resto, cargo_id: cargo });
      toast.success('Colaborador atualizado.');
    } catch (error) {
      throw new Error(mensagemDeErro(error, 'Erro ao atualizar o colaborador.'), { cause: error });
    }
  };

  const handleUpdateRole = async (id, dados) => {
    try {
      await cargoService.atualizarCargo(id, dados);
      toast.success('Cargo atualizado.');
    } catch (error) {
      throw new Error(mensagemDeErro(error, 'Erro ao atualizar o cargo.'), { cause: error });
    }
  };

  return (
    <TeamManagement
      members={members}
      roles={roles}
      modules={modules}
      permissions={GLOBAL_PERMISSIONS}
      loading={loading}
      error={loadError}
      onRetry={refetchAll}
      onInviteMember={handleInviteMember}
      invites={invites}
      onResendInvite={handleResendInvite}
      onCancelInvite={handleCancelInvite}
      onUpdateMember={handleUpdateMember}
      onDeleteMember={handleDeleteMember}
      onCreateRole={handleCreateRole}
      onUpdateRole={handleUpdateRole}
      moduloNiveis={moduloNiveis}
      moduloNiveisLoading={moduloNiveisLoading}
      onOpenRoleModules={handleOpenRoleModules}
      onSetModuloNivel={handleSetModuloNivel}
      onRemoveModuloNivel={handleRemoveModuloNivel}
    />
  );
}
