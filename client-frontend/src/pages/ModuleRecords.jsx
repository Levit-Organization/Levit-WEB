import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { moduloService } from '../services/moduloService';
import { registroService } from '../services/registroService';
import { arquivoService } from '../services/arquivoService';

export default function ModuleRecords() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modulo, setModulo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState(null);
  const [formDados, setFormDados] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [moduloData, registrosData] = await Promise.all([
        moduloService.getById(id),
        registroService.getAll(id)
      ]);
      
      if (moduloData.tipo === 'recrutamento') {
        navigate('/recrutamento', { replace: true });
        return;
      }

      setModulo(moduloData);
      setRegistros(registrosData);
    } catch (err) {
      setError('Erro ao carregar dados do módulo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const data = await registroService.getAll(id, busca);
      setRegistros(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const openNewForm = () => {
    setEditingRegistro(null);
    setFormDados({});
    setShowForm(true);
    setError('');
  };

  const openEditForm = (registro) => {
    setEditingRegistro(registro);
    setFormDados(registro.dados || {});
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRegistro(null);
    setFormDados({});
    setError('');
  };

  const handleFieldChange = (campoId, value) => {
    setFormDados(prev => ({ ...prev, [campoId]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      if (modulo?.tipo === 'arquivo') {
        if (!selectedFile) {
          throw new Error('Selecione um arquivo.');
        }
        await arquivoService.upload(id, selectedFile);
      } else {
        if (editingRegistro) {
          await registroService.update(id, editingRegistro.id, { dados: formDados });
        } else {
          await registroService.create(id, { dados: formDados });
        }
      }
      closeForm();
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Erro ao salvar registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (registroId) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      if (modulo?.tipo === 'arquivo') {
        await arquivoService.delete(id, registroId);
      } else {
        await registroService.delete(id, registroId);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir.');
    }
  };

  const handleDownload = async (registroId, fileName) => {
    try {
      await arquivoService.downloadFile(id, registroId, fileName);
    } catch (e) {
      alert('Erro ao baixar arquivo.');
    }
  };

  const renderFieldInput = (campo) => {
    const value = formDados[campo.id] ?? '';
    
    switch (campo.tipo) {
      case 'texto':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            className="w-full px-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white transition-colors"
            placeholder={`Digite ${campo.nome.toLowerCase()}...`}
          />
        );
      case 'numero':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            className="w-full px-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white transition-colors"
            placeholder="0"
          />
        );
      case 'data':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            className="w-full px-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white transition-colors"
          />
        );
      case 'selecao':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            className="w-full px-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white transition-colors"
          >
            <option value="">Selecione...</option>
            {(campo.opcoes || []).map((opcao, i) => (
              <option key={i} value={opcao}>{opcao}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  const campos = modulo?.campos || [];

  // Get visible columns (max 5 for the table, show all in form)
  const visibleCampos = campos.slice(0, 5);

  if (loading && !modulo) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* HEADER */}
      <header className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/modulos" className="text-light-text hover:text-primary transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">
              <span className="material-icons text-xl">{modulo?.icone || 'extension'}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{modulo?.nome || 'Módulo'}</h1>
              <p className="text-sm text-light-text">{registros.length} registro{registros.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/modulos/${id}/editar`}
            className="px-4 py-2 text-sm font-medium border border-divider rounded-lg hover:bg-gray-50 transition text-light-text"
          >
            <span className="material-icons text-base mr-1 align-middle">settings</span>
            Configurar
          </Link>
          <button
            onClick={openNewForm}
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/80 transition flex items-center gap-1.5"
          >
            <span className="material-icons text-base">{modulo?.tipo === 'arquivo' ? 'upload' : 'add'}</span>
            {modulo?.tipo === 'arquivo' ? 'Enviar Arquivo' : 'Novo Registro'}
          </button>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="mb-6 shrink-0">
        <div className="relative max-w-md">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-light-text text-xl">search</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar registros..."
            className="w-full pl-10 pr-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
          />
        </div>
      </div>

      {/* RECORDS TABLE */}
      {registros.length === 0 && !loading ? (
        <div className="bg-white border border-divider rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mx-auto mb-4">
            <span className="material-icons text-3xl text-light-text">inbox</span>
          </div>
          <p className="text-light-text mb-4">Nenhum registro encontrado neste módulo.</p>
          <button
            onClick={openNewForm}
            className="text-primary font-medium hover:underline text-sm"
          >
            Criar primeiro registro
          </button>
        </div>
      ) : (
        <div className="bg-white border border-divider rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider bg-gray-50/50">
                  {modulo?.tipo === 'arquivo' ? (
                    <>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider">Arquivo</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider">Tamanho</th>
                    </>
                  ) : (
                    visibleCampos.map(campo => (
                      <th key={campo.id} className="text-left px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider">
                        {campo.nome}
                      </th>
                    ))
                  )}
                  <th className="text-left px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider">Criado em</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs text-light-text uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id} className="border-b border-divider last:border-0 hover:bg-gray-50/50 transition-colors">
                    {modulo?.tipo === 'arquivo' ? (
                      <>
                        <td className="px-4 py-3 truncate max-w-[200px]" title={registro.arquivo_nome}>
                          {registro.arquivo_nome || <span className="text-light-text">--</span>}
                        </td>
                        <td className="px-4 py-3 text-light-text text-xs">
                          {registro.arquivo_tamanho ? (registro.arquivo_tamanho / 1024).toFixed(2) + ' KB' : '--'}
                        </td>
                      </>
                    ) : (
                      visibleCampos.map(campo => (
                        <td key={campo.id} className="px-4 py-3 truncate max-w-[200px]" title={registro.dados?.[campo.id] ?? '--'}>
                          {registro.dados?.[campo.id] ?? <span className="text-light-text">--</span>}
                        </td>
                      ))
                    )}
                    <td className="px-4 py-3 text-light-text text-xs">
                      {registro.criado_em ? new Date(registro.criado_em).toLocaleDateString('pt-BR') : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {modulo?.tipo === 'arquivo' ? (
                          <button
                            onClick={() => handleDownload(registro.id, registro.arquivo_nome)}
                            className="p-1.5 text-light-text hover:text-primary transition-colors rounded hover:bg-gray-100"
                            title="Baixar"
                          >
                            <span className="material-icons text-lg">download</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditForm(registro)}
                            className="p-1.5 text-light-text hover:text-primary transition-colors rounded hover:bg-gray-100"
                            title="Editar"
                          >
                            <span className="material-icons text-lg">edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(registro.id)}
                          className="p-1.5 text-light-text hover:text-red-500 transition-colors rounded hover:bg-red-50"
                          title="Excluir"
                        >
                          <span className="material-icons text-lg">delete_outline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL / SIDE PANEL FOR FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" onClick={closeForm}></div>
          
          {/* Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0">
              <h2 className="text-lg font-bold">
                {modulo?.tipo === 'arquivo' ? 'Enviar Arquivo' : (editingRegistro ? 'Editar Registro' : 'Novo Registro')}
              </h2>
              <button onClick={closeForm} className="text-light-text hover:text-gray-700 transition">
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              
              {modulo?.tipo === 'arquivo' ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Selecione o arquivo</label>
                    <input 
                      type="file" 
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-5">
                    {campos.map(campo => (
                      <div key={campo.id}>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">
                          {campo.nome}
                          <span className="text-xs text-light-text ml-2 font-normal">
                            {campo.tipo === 'texto' && 'Texto'}
                            {campo.tipo === 'numero' && 'Número'}
                            {campo.tipo === 'data' && 'Data'}
                            {campo.tipo === 'selecao' && 'Seleção'}
                          </span>
                        </label>
                        {renderFieldInput(campo)}
                      </div>
                    ))}
                  </div>

                  {campos.length === 0 && (
                    <p className="text-sm text-light-text text-center py-8">
                      Este módulo não possui campos configurados.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-divider shrink-0">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium border border-divider rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? 'Salvando...' : (editingRegistro ? 'Atualizar' : 'Criar Registro')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

