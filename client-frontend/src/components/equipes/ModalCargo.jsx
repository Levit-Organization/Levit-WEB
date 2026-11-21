import { Alert, Button, Input, Modal } from '../ui';

/** Modal de criar/editar cargo: nome e permissões globais. Estado em `useFormularioCargo`. */
export default function ModalCargo({ formulario, permissions }) {
  const {
    roleModalOpen,
    editingRole,
    roleForm,
    roleError,
    roleFormError,
    savingRole,
    roleDirty,
    podeSalvar,
    closeRoleModal,
    changeRoleNome,
    toggleRolePermissao,
    submitRole,
  } = formulario;

  return (
    <Modal
      open={roleModalOpen}
      onClose={closeRoleModal}
      dirty={roleDirty}
      title={editingRole ? 'Editar cargo' : 'Criar cargo'}
      footer={
        <>
          <Button variant="secondary" onClick={closeRoleModal}>Cancelar</Button>
          <Button
            type="submit"
            form="role-form"
            loading={savingRole}
            disabled={!podeSalvar}
          >
            {editingRole ? 'Salvar' : 'Criar cargo'}
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
            onChange={(event) => changeRoleNome(event.target.value)}
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
                      onChange={(event) => toggleRolePermissao(permission, event.target.checked)}
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
  );
}
