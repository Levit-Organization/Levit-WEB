import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Input, Select, Drawer, Alert, Spinner, Card, EmptyState, PageHeader } from '../components/ui';
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
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            placeholder={`Digite ${campo.nome.toLowerCase()}...`}
          />
        );
      case 'numero':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            placeholder="0"
          />
        );
      case 'data':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
          />
        );
      case 'selecao':
        return (
          <Select
            value={value}
            onChange={(e) => handleFieldChange(campo.id, e.target.value)}
            placeholder="Selecione..."
            options={(campo.opcoes || []).map((opcao) => ({ value: opcao, label: opcao }))}
          />
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
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* HEADER */}
      <PageHeader
        backTo="/modulos"
        icon={modulo?.icone || 'extension'}
        title={modulo?.nome || 'Módulo'}
        subtitle={`${registros.length} registro${registros.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button to={`/modulos/${id}/editar`} variant="secondary" icon="settings">
              Configurar
            </Button>
            <Button onClick={openNewForm} icon={modulo?.tipo === 'arquivo' ? 'upload' : 'add'}>
              {modulo?.tipo === 'arquivo' ? 'Enviar arquivo' : 'Novo registro'}
            </Button>
          </>
        }
      />

      {/* SEARCH BAR */}
      <div className="mb-6 shrink-0 max-w-md">
        <Input
          type="search"
          icon="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Buscar registros..."
          aria-label="Buscar registros"
        />
      </div>

      {/* RECORDS TABLE */}
      {registros.length === 0 && !loading ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon={modulo?.tipo === 'arquivo' ? 'folder_open' : 'inbox'}
            size="lg"
            title={busca.trim() ? 'Nenhum resultado' : 'Nenhum registro ainda'}
            description={
              busca.trim()
                ? `Nada bate com "${busca.trim()}" neste módulo. Tente outro termo.`
                : modulo?.tipo === 'arquivo'
                  ? 'Este módulo guarda arquivos. Envie o primeiro para começar a organizar os documentos aqui.'
                  : 'Cada registro é uma linha com os campos que você configurou neste módulo.'
            }
            actionLabel={busca.trim() ? undefined : modulo?.tipo === 'arquivo' ? 'Enviar arquivo' : 'Criar primeiro registro'}
            actionIcon={busca.trim() ? undefined : modulo?.tipo === 'arquivo' ? 'upload' : 'add'}
            onAction={busca.trim() ? undefined : openNewForm}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider bg-background">
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
                  <tr key={registro.id} className="border-b border-divider last:border-0 hover:bg-background transition-colors">
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
                            className="p-1.5 text-light-text hover:text-primary transition-colors rounded-md hover:bg-primary-100"
                            title="Baixar"
                          >
                            <span className="material-icons text-lg">download</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditForm(registro)}
                            className="p-1.5 text-light-text hover:text-primary transition-colors rounded-md hover:bg-primary-100"
                            title="Editar"
                          >
                            <span className="material-icons text-lg">edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(registro.id)}
                          className="p-1.5 text-light-text hover:text-danger transition-colors rounded hover:bg-danger-bg"
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
        </Card>
      )}

      {/* SIDE PANEL FOR FORM */}
      <Drawer
        open={showForm}
        onClose={closeForm}
        title={modulo?.tipo === 'arquivo' ? 'Enviar Arquivo' : (editingRegistro ? 'Editar Registro' : 'Novo Registro')}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>
              {saving ? 'Salvando...' : (editingRegistro ? 'Atualizar' : 'Criar Registro')}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {modulo?.tipo === 'arquivo' ? (
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-ink">Selecione o arquivo</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full text-sm text-light-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 file:cursor-pointer cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              {campos.map(campo => (
                <div key={campo.id}>
                  <label className="block text-sm font-medium mb-1.5 text-ink">
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
      </Drawer>
    </Layout>
  );
}

