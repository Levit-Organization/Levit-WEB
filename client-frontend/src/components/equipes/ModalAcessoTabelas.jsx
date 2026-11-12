import { Button, Modal, Select } from '../ui';

const NIVEIS = [
  { value: '', label: 'Sem acesso' },
  { value: 'visualizar', label: 'Só ver' },
  { value: 'editar', label: 'Editar' },
  { value: 'gerenciar', label: 'Tudo' },
];

/** Nível de acesso do cargo em cada tabela. Estado em `useAcessoPorTabela`. */
export default function ModalAcessoTabelas({ acesso, modules, moduloNiveisLoading }) {
  const { moduleAccessRole, moduloNivelPorId, closeModuleAccessModal, handleModuloNivelChange } = acesso;

  return (
    <Modal
      open={!!moduleAccessRole}
      onClose={closeModuleAccessModal}
      title="Acesso por tabela"
      footer={<Button onClick={closeModuleAccessModal}>Concluído</Button>}
    >
      {moduleAccessRole && (
        <>
          <p className="text-2xs text-light-text mb-4 -mt-2">{moduleAccessRole.nome}</p>

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
                    options={NIVEIS}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
