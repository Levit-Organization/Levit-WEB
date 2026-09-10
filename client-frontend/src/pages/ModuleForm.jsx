import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Input, Select, Alert, Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { moduloService } from '../services/moduloService';
import { MODULO_ICON_OPTIONS } from '../utils/iconOptions';

const TIPO_INFO = {
  dados: {
    label: 'Dados',
    icon: 'table_rows',
    description: 'Registros com campos personalizados, ideal para catálogos e listas.',
  },
  arquivo: {
    label: 'Arquivos',
    icon: 'folder_open',
    description: 'Cada registro é um arquivo enviado, com metadados opcionais.',
  },
  recrutamento: {
    label: 'Recrutamento',
    icon: 'groups',
    description: 'Vaga com pipeline de fases e candidatos em formato Kanban.',
  },
};

const CAMPO_TIPO_INFO = {
  texto: { label: 'Texto', icon: 'text_fields' },
  numero: { label: 'Número', icon: 'tag' },
  data: { label: 'Data', icon: 'event' },
  selecao: { label: 'Seleção Única', icon: 'list_alt' },
};

export default function ModuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    nome: '',
    icone: 'extension',
    tipo: 'dados'
  });
  const [campos, setCampos] = useState([]);
  const [camposOriginais, setCamposOriginais] = useState([]);
  const [fases, setFases] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchModulo();
    }
  }, [id]);

  const fetchModulo = async () => {
    try {
      setLoading(true);
      const modulo = await moduloService.getById(id);
      if (modulo) {
        setFormData({
          nome: modulo.nome,
          icone: modulo.icone || 'extension',
          tipo: modulo.tipo || 'dados'
        });
        if (modulo.campos) {
          setCampos(modulo.campos);
          setCamposOriginais(modulo.campos.map(c => ({ ...c })));
        }
      } else {
        setError('Módulo não encontrado.');
      }
    } catch (err) {
      setError('Erro ao carregar módulo.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddField = () => {
    setCampos([...campos, {
      nome: '',
      tipo: 'texto',
      opcoes: null,
      _isNew: true,
      _tempId: Date.now()
    }]);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...campos];
    updated[index] = { ...updated[index], [field]: value };
    setCampos(updated);
  };

  const handleRemoveField = async (index) => {
    const campo = campos[index];

    if (isEditing && campo.id && !campo._isNew) {
      if (!window.confirm(`Excluir o campo "${campo.nome}"? Isso só é possível se não houver registros usando este campo.`)) {
        return;
      }
      try {
        await moduloService.deleteField(id, campo.id);
        setSuccessMsg('Campo excluído com sucesso.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao excluir campo. Ele pode ter registros preenchidos.');
        return;
      }
    }

    const updated = [...campos];
    updated.splice(index, 1);
    setCampos(updated);
  };

  const handleMoveField = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= campos.length) return;

    const reordered = [...campos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setCampos(reordered);

    const temCamposNovos = reordered.some((c) => c._isNew);
    if (isEditing && !temCamposNovos) {
      try {
        await moduloService.reorderFields(id, reordered.map((c) => c.id));
      } catch (err) {
        setError('Erro ao reordenar os campos.');
      }
    }
  };

  const handleAddOption = (campoIndex) => {
    const updated = [...campos];
    const campo = updated[campoIndex];
    const opcoes = campo.opcoes || [];
    updated[campoIndex] = { ...campo, opcoes: [...opcoes, ''] };
    setCampos(updated);
  };

  const handleOptionChange = (campoIndex, optionIndex, value) => {
    const updated = [...campos];
    const opcoes = [...(updated[campoIndex].opcoes || [])];
    opcoes[optionIndex] = value;
    updated[campoIndex] = { ...updated[campoIndex], opcoes };
    setCampos(updated);
  };

  const handleRemoveOption = (campoIndex, optionIndex) => {
    const updated = [...campos];
    const opcoes = [...(updated[campoIndex].opcoes || [])];
    opcoes.splice(optionIndex, 1);
    updated[campoIndex] = { ...updated[campoIndex], opcoes };
    setCampos(updated);
  };

  const handleAddFase = () => setFases([...fases, '']);
  const handleFaseChange = (index, value) => {
    const updated = [...fases];
    updated[index] = value;
    setFases(updated);
  };
  const handleRemoveFase = (index) => {
    const updated = [...fases];
    updated.splice(index, 1);
    setFases(updated.length ? updated : ['']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isEditing) {
        await moduloService.update(id, formData);

        for (const campo of campos) {
          if (campo._isNew) {
            await moduloService.addField(id, {
              nome: campo.nome,
              tipo: campo.tipo,
              ...(campo.opcoes && campo.opcoes.length > 0 ? { opcoes: campo.opcoes } : {}),
            });
          } else if (campo.id) {
            const original = camposOriginais.find(c => c.id === campo.id);
            if (original) {
              const nomeChanged = campo.nome !== original.nome;
              const opcoesChanged = JSON.stringify(campo.opcoes) !== JSON.stringify(original.opcoes);
              if (nomeChanged || opcoesChanged) {
                const updateData = {};
                if (nomeChanged) updateData.nome = campo.nome;
                if (opcoesChanged) updateData.opcoes = campo.opcoes;
                await moduloService.updateField(id, campo.id, updateData);
              }
            }
          }
        }

        navigate('/modulos');
      } else {
        const camposLimpos = campos.map(({ nome, tipo, opcoes }) => ({
          nome,
          tipo,
          ...(opcoes && opcoes.length > 0 ? { opcoes } : {}),
        }));
        const payload = { ...formData, campos: camposLimpos };

        if (formData.tipo === 'recrutamento') {
          payload.fases = fases.map((f) => f.trim()).filter(Boolean);
        }

        await moduloService.create(payload);
        navigate('/modulos');
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).join(' | '));
      } else {
        setError(err.response?.data?.message || 'Erro ao salvar o módulo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tipoAtual = TIPO_INFO[formData.tipo] ?? TIPO_INFO.dados;
  const fasesValidas = fases.map((f) => f.trim()).filter(Boolean);
  const precisaDeFases = !isEditing && formData.tipo === 'recrutamento';
  const podeSalvar = !loading && (!precisaDeFases || fasesValidas.length > 0);

  return (
    <Layout>
      <PageHeader
        backTo="/modulos"
        icon={formData.icone}
        title={isEditing ? 'Editar Módulo' : 'Novo Módulo'}
        subtitle={isEditing ? 'Atualize as informações e campos' : 'Crie um novo módulo customizado'}
      />

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {successMsg && (
        <div className="mb-6">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start w-full">

        {/* Coluna esquerda: identidade do módulo */}
        <Card className="lg:sticky lg:top-8 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold">Informações Básicas</h2>
            <p className="text-xs text-light-text mt-0.5">Nome, tipo e ícone de identificação.</p>
          </div>

          <Input
            label="Nome do Módulo"
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            required
            placeholder="Ex: Clientes"
          />

          <Select
            label="Tipo de Módulo"
            name="tipo"
            value={formData.tipo}
            onChange={handleInputChange}
            disabled={isEditing}
            hint={tipoAtual.description}
            options={Object.entries(TIPO_INFO).map(([value, info]) => ({ value, label: info.label }))}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Ícone</label>
              <button
                type="button"
                onClick={() => setIconPickerOpen((v) => !v)}
                className="text-xs text-primary font-medium hover:underline"
              >
                {iconPickerOpen ? 'Fechar' : 'Alterar'}
              </button>
            </div>

            <div className="w-full h-11 px-3.5 border border-divider rounded-lg flex items-center gap-2.5 bg-background/60">
              <span className="material-icons text-primary text-[20px]">{formData.icone}</span>
              <span className="text-sm text-light-text">Ícone selecionado</span>
            </div>

            {iconPickerOpen && (
              <div className="mt-2.5 grid grid-cols-5 gap-2 p-3 border border-divider rounded-lg bg-background/40">
                {MODULO_ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => { setFormData({ ...formData, icone: icon }); setIconPickerOpen(false); }}
                    title={icon}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                      formData.icone === icon
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface border border-divider-strong text-light-text hover:border-primary-300 hover:bg-primary-50 hover:text-primary'
                    }`}
                  >
                    <span className="material-icons text-[19px]">{icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Coluna direita: estrutura do módulo */}
        <div className="flex flex-col gap-6 min-w-0">

          {precisaDeFases && (
            <Card>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-base font-semibold">Fases do Pipeline</h2>
                  <p className="text-xs text-light-text mt-0.5">Defina as etapas pelas quais um candidato passa, em ordem.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFase}
                  className="h-9 px-3.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-icons text-base">add</span>
                  Fase
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {fases.map((fase, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-2xs font-bold flex items-center justify-center shrink-0 tabular">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={fase}
                      onChange={(e) => handleFaseChange(index, e.target.value)}
                      placeholder={`Ex: ${index === 0 ? 'Triagem' : 'Entrevista'}`}
                      className="flex-1 h-10 px-3.5 bg-surface text-ink border border-divider-strong rounded-lg text-sm placeholder:text-light-text transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFase(index)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-light-text hover:text-danger hover:bg-danger-bg transition-colors shrink-0"
                      title="Remover fase"
                    >
                      <span className="material-icons text-[19px]">close</span>
                    </button>
                  </div>
                ))}
              </div>

              {fasesValidas.length === 0 && (
                <div className="mt-3">
                  <Alert variant="warning">Adicione pelo menos uma fase para criar a vaga.</Alert>
                </div>
              )}
            </Card>
          )}

          {isEditing && formData.tipo === 'recrutamento' && (
            <div className="bg-background/60 border border-divider rounded-2xl p-5 flex items-start gap-3">
              <span className="material-icons text-light-text text-[20px] mt-0.5">info</span>
              <p className="text-sm text-light-text">
                As fases desta vaga são gerenciadas na tela de{' '}
                <Link to="/recrutamento" className="text-primary font-medium hover:underline">Recrutamento</Link>.
              </p>
            </div>
          )}

          <Card>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base font-semibold">Campos do Módulo</h2>
                <p className="text-xs text-light-text mt-0.5">
                  {isEditing ? 'Adicione, edite ou remova campos' : 'Defina os campos que compõem cada registro'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddField}
                className="h-9 px-3.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span className="material-icons text-base">add</span>
                Campo
              </button>
            </div>

            {campos.length === 0 ? (
              <div className="py-12 border border-dashed border-divider rounded-xl">
                <EmptyState
                  icon="view_column"
                  size="sm"
                  title="Nenhum campo ainda"
                  description="Os campos definem o que cada registro guarda — nome, data de admissão, documento. Eles viram as colunas da tabela e os campos do formulário."
                  actionLabel="Adicionar primeiro campo"
                  actionIcon="add"
                  onAction={handleAddField}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {campos.map((campo, index) => (
                  <div key={campo.id || campo._tempId} className="border border-divider rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3.5 bg-background/40">
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, -1)}
                          disabled={index === 0}
                          className="w-6 h-5 flex items-center justify-center text-light-text hover:text-primary disabled:opacity-25 disabled:hover:text-light-text transition-colors"
                          title="Mover para cima"
                        >
                          <span className="material-icons text-[16px]">expand_less</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 1)}
                          disabled={index === campos.length - 1}
                          className="w-6 h-5 flex items-center justify-center text-light-text hover:text-primary disabled:opacity-25 disabled:hover:text-light-text transition-colors"
                          title="Mover para baixo"
                        >
                          <span className="material-icons text-[16px]">expand_more</span>
                        </button>
                      </div>

                      <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary flex items-center justify-center shrink-0">
                        <span className="material-icons text-[18px]">{CAMPO_TIPO_INFO[campo.tipo]?.icon || 'text_fields'}</span>
                      </span>

                      <input
                        type="text"
                        value={campo.nome}
                        onChange={(e) => handleFieldChange(index, 'nome', e.target.value)}
                        required
                        placeholder="Nome do campo"
                        className="flex-1 min-w-0 h-10 px-3.5 bg-surface text-ink border border-divider-strong rounded-lg text-sm placeholder:text-light-text transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100"
                      />

                      <div className="relative shrink-0 w-40">
                        <select
                          value={campo.tipo}
                          onChange={(e) => handleFieldChange(index, 'tipo', e.target.value)}
                          disabled={isEditing && !campo._isNew}
                          className="w-full h-10 appearance-none pl-3.5 pr-8 bg-surface text-ink border border-divider-strong rounded-lg text-sm cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100 disabled:bg-background disabled:text-faint disabled:border-divider disabled:cursor-not-allowed"
                        >
                          {Object.entries(CAMPO_TIPO_INFO).map(([value, info]) => (
                            <option key={value} value={value}>{info.label}</option>
                          ))}
                        </select>
                        <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
                      </div>

                      {campo._isNew && (
                        <Badge variant="primary" size="sm" className="uppercase tracking-wide shrink-0">
                          Novo
                        </Badge>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveField(index)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-light-text hover:text-danger hover:bg-danger-bg transition-colors shrink-0"
                        title="Remover campo"
                      >
                        <span className="material-icons text-[19px]">delete_outline</span>
                      </button>
                    </div>

                    {campo.tipo === 'selecao' && (
                      <div className="p-3.5 border-t border-divider">
                        <p className="text-xs font-medium text-light-text mb-2">Opções de Seleção</p>
                        <div className="flex flex-col gap-2">
                          {(campo.opcoes || []).map((opcao, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border-2 border-divider-strong shrink-0"></span>
                              <input
                                type="text"
                                value={opcao}
                                onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                                placeholder={`Opção ${optIdx + 1}`}
                                className="flex-1 h-9 px-3 bg-surface text-ink border border-divider-strong rounded-lg text-sm placeholder:text-light-text transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index, optIdx)}
                                className="text-light-text hover:text-danger transition-colors shrink-0"
                              >
                                <span className="material-icons text-base">close</span>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddOption(index)}
                            className="text-xs text-primary hover:underline font-medium self-start mt-0.5"
                          >
                            + Adicionar opção
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-3 pt-1 pb-2">
            <Button variant="secondary" to="/modulos">Cancelar</Button>
            <Button type="submit" disabled={!podeSalvar} loading={loading}>
              {loading ? 'Salvando...' : 'Salvar Módulo'}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
