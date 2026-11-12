import { Alert, Button, Drawer } from '../ui';
import ItensQueApontam from '../vinculos/ItensQueApontam';
import CampoDoRegistro from './CampoDoRegistro';
import { ROTULO_DO_TIPO } from '../../utils/registros';

/**
 * Painel lateral para criar ou editar um item. `formulario` é o retorno de
 * useFormularioRegistro; ao editar, mostra também os itens que apontam para este.
 */
export default function FormularioDoRegistro({ moduloId, campos, formulario, pessoas, carregandoPessoas, usuarioId }) {
  const { showForm, setShowForm, closeForm, formSujo, editingRegistro, saving, error, formDados, handleFieldChange, handleSave } = formulario;

  return (
    <Drawer
      open={showForm}
      onClose={closeForm}
      dirty={formSujo}
      title={editingRegistro ? 'Editar item' : 'Novo item'}
      footer={
        <>
          <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
          <Button type="submit" form="registro-form" loading={saving}>
            {saving ? 'Salvando...' : editingRegistro ? 'Atualizar' : 'Criar item'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form id="registro-form" onSubmit={handleSave} noValidate>
        <div className="flex flex-col gap-5">
          {campos.map((campo) => (
            <div key={campo.id}>
              <label htmlFor={`campo-${campo.id}`} className="block text-sm font-medium mb-1.5 text-ink">
                {campo.nome}
                <span className="text-xs text-light-text ml-2 font-normal">{ROTULO_DO_TIPO[campo.tipo]}</span>
              </label>
              <CampoDoRegistro
                campo={campo}
                valor={formDados[campo.id]}
                onChange={(valor) => handleFieldChange(campo.id, valor)}
                pessoas={pessoas}
                carregandoPessoas={carregandoPessoas}
                usuarioId={usuarioId}
              />
            </div>
          ))}
        </div>

        {campos.length === 0 && (
          <p className="text-sm text-light-text text-center py-8">
            Esta tabela não possui colunas configuradas.
          </p>
        )}
      </form>
      {editingRegistro && (
        <div className="mt-8 pt-6 border-t border-divider">
          <ItensQueApontam moduloId={moduloId} registroId={editingRegistro.id} onNavegar={() => setShowForm(false)} />
        </div>
      )}
    </Drawer>
  );
}
