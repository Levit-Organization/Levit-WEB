import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Alert, PageHeader } from '../components/ui';
import { useModulos } from '../hooks/queries';
import { useFormularioModulo } from '../hooks/useFormularioModulo';
import ModelosDeTabela from '../components/modulos/ModelosDeTabela';
import InformacoesBasicas from '../components/modulos/InformacoesBasicas';
import EtapasDoQuadro from '../components/modulos/EtapasDoQuadro';
import EditorDeColunas from '../components/modulos/EditorDeColunas';
import AvisoSemColunas from '../components/modulos/AvisoSemColunas';

export default function ModuleForm() {
  const { id } = useParams();
  // Tabelas que uma coluna de ligação pode apontar (só as de lista).
  const tabelasDeDados = (useModulos().data ?? []).filter((m) => (m.tipo || 'dados') === 'dados');

  const {
    isEditing,
    formData,
    setFormData,
    colunas,
    fases,
    setFases,
    loading,
    error,
    modeloAplicado,
    aplicarModelo,
    handleInputChange,
    handleSubmit,
  } = useFormularioModulo(id);

  const fasesValidas = fases.map((f) => f.trim()).filter(Boolean);
  const precisaDeFases = !isEditing && formData.tipo === 'recrutamento';
  const podeSalvar = !loading && (!precisaDeFases || fasesValidas.length > 0);

  return (
    <Layout>
      <PageHeader
        backTo="/modulos"
        icon={formData.icone}
        title={isEditing ? 'Editar tabela' : 'Nova tabela'}
      />

      {error && (
        <div className="mb-6" role="alert">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!isEditing && <ModelosDeTabela modeloAplicado={modeloAplicado} onAplicar={aplicarModelo} />}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start w-full">

        {/* Coluna esquerda: identidade do módulo */}
        <InformacoesBasicas
          formData={formData}
          isEditing={isEditing}
          onChange={handleInputChange}
          onIcone={(icone) => setFormData({ ...formData, icone })}
        />

        {/* Coluna direita: estrutura do módulo */}
        <div className="flex flex-col gap-6 min-w-0">

          {precisaDeFases && <EtapasDoQuadro fases={fases} onChange={setFases} />}

          {isEditing && formData.tipo === 'recrutamento' && (
            <div className="bg-background/60 border border-divider rounded-2xl p-5 flex items-start gap-3">
              <span className="material-icons text-light-text text-[20px] mt-0.5">info</span>
              <p className="text-sm text-light-text">
                As etapas desta vaga são gerenciadas na tela de{' '}
                <Link to="/recrutamento" className="text-primary font-medium hover:underline">Recrutamento</Link>.
              </p>
            </div>
          )}

          {!['financeiro', 'arquivo'].includes(formData.tipo) ? (
            <EditorDeColunas colunas={colunas} isEditing={isEditing} moduloId={id} tabelasDeDados={tabelasDeDados} />
          ) : formData.tipo === 'financeiro' ? (
            <AvisoSemColunas icone="account_balance_wallet" titulo="Tabela financeira">
              Já vem com data, descrição, valor e categoria. Não precisa criar colunas.
            </AvisoSemColunas>
          ) : (
            <AvisoSemColunas icone="folder_open" titulo="Tabela de arquivos">
              Guarda arquivos para enviar e baixar. Não precisa criar colunas.
            </AvisoSemColunas>
          )}

          <div className="flex justify-end gap-3 pt-1 pb-2">
            <Button variant="secondary" to="/modulos">Cancelar</Button>
            <Button type="submit" disabled={!podeSalvar} loading={loading}>
              {loading ? 'Salvando...' : 'Salvar tabela'}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
