import { Alert, Button, Drawer, Input, Select, Textarea } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { MAX_MENSAGEM } from '../../utils/equipe';

/** Painel lateral de convidar (novo) ou editar (existente) colaborador. Estado em `useFormularioMembro`. */
export default function DrawerMembro({ formulario, roles }) {
  const { usuario } = useAuth();
  const {
    inviteOpen,
    editingMember,
    memberForm,
    memberErrors,
    memberError,
    savingMember,
    memberDirty,
    podeSalvar,
    closeInviteModal,
    changeMember,
    submitMember,
  } = formulario;

  return (
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
            disabled={!podeSalvar}
          >
            {editingMember ? 'Salvar alterações' : 'Enviar convite'}
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
          label="Cargo"
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
  );
}
