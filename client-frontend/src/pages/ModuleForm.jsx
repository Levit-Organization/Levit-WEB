import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { moduloService } from '../services/moduloService';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const iconOptions = [
    'extension', 'group', 'business', 'work', 'dashboard', 'settings', 
    'inventory_2', 'account_balance', 'event', 'article', 'description',
    'folder', 'star', 'shopping_cart', 'person', 'local_shipping'
  ];

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
    
    // If it's a saved campo, delete it from the backend
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isEditing) {
        // 1. Update module basic info
        await moduloService.update(id, formData);
        
        // 2. Handle campo changes
        for (const campo of campos) {
          if (campo._isNew) {
            // Add new campos
            await moduloService.addField(id, {
              nome: campo.nome,
              tipo: campo.tipo,
              ...(campo.opcoes && campo.opcoes.length > 0 ? { opcoes: campo.opcoes } : {}),
            });
          } else if (campo.id) {
            // Check if campo was modified
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
        // Create mode: send all campos at once
        const camposLimpos = campos.map(({ nome, tipo, opcoes }) => ({
          nome,
          tipo,
          ...(opcoes && opcoes.length > 0 ? { opcoes } : {}),
        }));
        const payload = { ...formData, campos: camposLimpos };
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

  return (
    <Layout>
      <header className="flex items-center gap-4 mb-8 shrink-0">
        <Link to="/modulos" className="text-light-text hover:text-primary transition">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Módulo' : 'Novo Módulo'}</h1>
          <p className="text-sm text-light-text mt-1">{isEditing ? 'Atualize as informações e campos' : 'Crie um novo módulo customizado'}</p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
          <span className="material-icons text-lg">error_outline</span>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
          <span className="material-icons text-lg">check_circle</span>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
        {/* Basic Info */}
        <div className="bg-white border border-divider rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 border-b border-divider pb-2">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Módulo</label>
              <input 
                type="text" 
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                required
                placeholder="Ex: Clientes"
                className="w-full px-4 py-2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Módulo</label>
              <select 
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                disabled={isEditing}
                className="w-full px-4 py-2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm disabled:bg-gray-100"
              >
                <option value="dados">Dados (Padrão)</option>
                <option value="arquivo">Arquivos</option>
                <option value="recrutamento">Recrutamento</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({...formData, icone: icon})}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${formData.icone === icon ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 border border-divider hover:bg-gray-100'}`}
                  >
                    <span className={`material-icons ${formData.icone === icon ? 'text-primary' : 'text-gray-700'}`}>{icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fields Section - Always visible */}
        <div className="bg-white border border-divider rounded-xl p-6">
          <div className="flex justify-between items-center mb-4 border-b border-divider pb-2">
            <div>
              <h2 className="text-lg font-semibold">Campos do Módulo</h2>
              <p className="text-xs text-light-text mt-0.5">
                {isEditing ? 'Adicione, edite ou remova campos' : 'Defina os campos que compõem cada registro'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={handleAddField}
              className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
            >
              <span className="material-icons text-base">add</span>
              Adicionar Campo
            </button>
          </div>

          {campos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-xl text-light-text">view_column</span>
              </div>
              <p className="text-sm text-light-text mb-2">
                Nenhum campo adicionado.
              </p>
              <button 
                type="button" 
                onClick={handleAddField}
                className="text-primary text-sm font-medium hover:underline"
              >
                + Adicionar primeiro campo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campos.map((campo, index) => (
                <div key={campo.id || campo._tempId} className="p-4 bg-gray-50 rounded-lg border border-divider relative group">
                  <div className="flex gap-4 items-start">
                    {/* Drag handle placeholder */}
                    <div className="flex items-center text-light-text mt-2 cursor-grab">
                      <span className="material-icons text-lg">drag_indicator</span>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Nome do Campo</label>
                        <input 
                          type="text" 
                          value={campo.nome}
                          onChange={(e) => handleFieldChange(index, 'nome', e.target.value)}
                          required
                          placeholder="Ex: Nome completo"
                          className="w-full px-3 py-1.5 border border-divider rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Tipo</label>
                        <select 
                          value={campo.tipo}
                          onChange={(e) => handleFieldChange(index, 'tipo', e.target.value)}
                          disabled={isEditing && !campo._isNew}
                          className="w-full px-3 py-1.5 border border-divider rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm bg-white disabled:bg-gray-100 disabled:text-light-text"
                        >
                          <option value="texto">Texto</option>
                          <option value="numero">Número</option>
                          <option value="data">Data</option>
                          <option value="selecao">Seleção Única</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        {campo._isNew && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded font-medium">
                            Novo
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => handleRemoveField(index)}
                      className="text-red-400 hover:text-red-600 mt-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      title="Remover campo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  {/* Options for 'selecao' type */}
                  {campo.tipo === 'selecao' && (
                    <div className="mt-3 ml-10 border-t border-divider pt-3">
                      <label className="block text-xs font-medium mb-2">Opções de Seleção</label>
                      <div className="space-y-2">
                        {(campo.opcoes || []).map((opcao, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full border-2 border-divider shrink-0"></span>
                            <input
                              type="text"
                              value={opcao}
                              onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                              placeholder={`Opção ${optIdx + 1}`}
                              className="flex-1 px-3 py-1 border border-divider rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index, optIdx)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <span className="material-icons text-base">close</span>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(index)}
                          className="text-xs text-primary hover:underline font-medium"
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
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Link 
            to="/modulos"
            className="px-5 py-2 rounded-lg text-sm font-medium border border-divider hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              'Salvar Módulo'
            )}
          </button>
        </div>
      </form>
    </Layout>
  );
}
