import { useState } from 'react';
import Layout from '../components/Layout';
import { Button, Card, ErrorState, PageHeader, Tabs } from '../components/ui';
import PainelMembros from '../components/equipes/PainelMembros';
import PainelCargos from '../components/equipes/PainelCargos';
import DrawerMembro from '../components/equipes/DrawerMembro';
import ModalCargo from '../components/equipes/ModalCargo';
import ModalAcessoTabelas from '../components/equipes/ModalAcessoTabelas';
import { useFiltroMembros } from '../components/equipes/useFiltroMembros';
import { useFormularioMembro } from '../components/equipes/useFormularioMembro';
import { useFormularioCargo } from '../components/equipes/useFormularioCargo';
import { useAcessoPorTabela } from '../components/equipes/useAcessoPorTabela';

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
  const [activeTab, setActiveTab] = useState('members');

  const filtro = useFiltroMembros(members, roles);
  const membro = useFormularioMembro({ onInviteMember, onUpdateMember });
  const cargo = useFormularioCargo({ onCreateRole, onUpdateRole });
  const acesso = useAcessoPorTabela({ moduloNiveis, onOpenRoleModules, onSetModuloNivel, onRemoveModuloNivel });

  const handleDeleteMember = (member) => {
    onDeleteMember?.(member);
  };

  const handleDeleteRole = (role) => {
    onDeleteRole?.(role.id);
  };

  const abas = [
    { id: 'members', label: 'Colaboradores', count: members.length },
    { id: 'roles', label: 'Cargos e permissões', count: roles.length },
  ];

  return (
    <Layout>
      <div className="flex flex-col">
        <PageHeader
          title="Equipe"
          subtitle="Quem trabalha aqui e o que cada cargo pode acessar"
          actions={
            <Button icon="person_add" onClick={() => membro.openInviteModal()}>
              Convidar pessoa
            </Button>
          }
        />

        <div>
          <Tabs abas={abas} ativa={activeTab} onChange={setActiveTab} label="Seções da equipe" />

          {error && !loading ? (
            <Card padding="lg" className="py-12">
              <ErrorState size="lg" description={error} onRetry={onRetry} />
            </Card>
          ) : activeTab === 'members' ? (
            <PainelMembros
              roles={roles}
              loading={loading}
              filtro={filtro}
              invites={invites}
              onResendInvite={onResendInvite}
              onCancelInvite={onCancelInvite}
              onConvidar={membro.openInviteModal}
              onEditar={onUpdateMember ? membro.openInviteModal : undefined}
              onExcluir={handleDeleteMember}
            />
          ) : (
            <PainelCargos
              roles={roles}
              loading={loading}
              onCriar={cargo.openRoleModal}
              onAcessoPorTabela={acesso.openModuleAccessModal}
              onEditar={onUpdateRole ? cargo.openRoleModal : undefined}
              onExcluir={onDeleteRole ? handleDeleteRole : undefined}
            />
          )}
        </div>
      </div>

      <DrawerMembro formulario={membro} roles={roles} />
      <ModalCargo formulario={cargo} permissions={permissions} />
      <ModalAcessoTabelas acesso={acesso} modules={modules} moduloNiveisLoading={moduloNiveisLoading} />
    </Layout>
  );
}
