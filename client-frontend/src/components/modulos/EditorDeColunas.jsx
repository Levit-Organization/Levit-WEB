import { Card, EmptyState } from '../ui';
import LinhaDaColuna from './LinhaDaColuna';

/** "Colunas da tabela": a lista de colunas ou o convite para a primeira. */
export default function EditorDeColunas({ colunas, isEditing, moduloId, tabelasDeDados }) {
  const { campos, handleAddField } = colunas;

  return (
    <Card>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold">Colunas da tabela</h2>
        <button
          type="button"
          onClick={handleAddField}
          className="h-9 px-3.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span className="material-icons text-[16px]" aria-hidden="true">add</span>
          Coluna
        </button>
      </div>

      {campos.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icon="view_column"
            size="sm"
            title="Nenhuma coluna ainda"
            description="As colunas definem o que cada item guarda, como nome, data ou valor. Elas aparecem na lista e no formulário de cada item."
            actionLabel="Adicionar primeira coluna"
            actionIcon="add"
            onAction={handleAddField}
          />
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-divider">
          {campos.map((campo, index) => (
            <LinhaDaColuna
              key={campo.id || campo._tempId}
              campo={campo}
              index={index}
              total={campos.length}
              isEditing={isEditing}
              moduloId={moduloId}
              tabelasDeDados={tabelasDeDados}
              colunas={colunas}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
