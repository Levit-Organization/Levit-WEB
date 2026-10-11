import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Button, Input, Select, Alert, Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { moduloService } from '../services/moduloService';
import { MODULO_ICON_OPTIONS } from '../utils/iconOptions';
import { modulosQuery } from '../hooks/queries';
import { useToast, useConfirm } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { MODELOS_TABELA } from '../utils/modelosTabela';

const TIPO_INFO = {
  dados: {
    label: 'Uma lista do seu jeito',
    icon: 'table_rows',
    description: 'Clientes, pedidos, estoque, tarefas: você escolhe as colunas e pode ver como lista ou quadro.',
  },
  arquivo: {
    label: 'Arquivos e documentos',
    icon: 'folder_open',
    description: 'Um lugar para enviar e guardar arquivos da equipe, como contratos e comprovantes.',
  },
  recrutamento: {
    label: 'Vaga de recrutamento',
    icon: 'groups',
    description: 'Candidatos se inscrevem por um link e passam pelas etapas que você definir.',
  },
  financeiro: {
    label: 'Entradas e saídas',
    icon: 'account_balance_wallet',
    description: 'Controle de dinheiro que entra e sai, com categorias e saldo do período.',
  },
};

const CAMPO_TIPO_INFO = {
  texto: { label: 'Texto', icon: 'text_fields' },
  numero: { label: 'Número', icon: 'tag' },
  data: { label: 'Data', icon: 'event' },
  selecao: { label: 'Lista de opções', icon: 'list_alt' },
  responsavel: { label: 'Responsável', icon: 'person' },
  prazo: { label: 'Prazo', icon: 'event_available' },
  recorrencia: { label: 'Repetição', icon: 'event_repeat' },
};

/** Modelos agrupados: primeiro os segmentos em que o Levit foca, depois os usos gerais. */
const GRUPOS_DE_MODELOS = Object.entries(
  MODELOS_TABELA.reduce((grupos, modelo) => {
    const grupo = modelo.segmento || 'Outros usos';
    (grupos[grupo] ||= []).push(modelo);
    return grupos;
  }, {})
);

/** O que cada tipo novo faz, mostrado embaixo da coluna. */
const CAMPO_TIPO_DICA = {
  responsavel: 'Uma pessoa da equipe. Ela vê os itens dela em "Meus itens" e pode ser avisada pelas automações.',
  prazo: 'Itens atrasados aparecem em "Precisa da sua atenção". Um item sai dos atrasados quando uma coluna de lista dele fica em Concluído, Entregue, Pago ou parecido.',
  recorrencia: 'Para o que se repete (todo mês, todo ano…). Quando um item com repetição é concluído, o Levit cria o próximo com o prazo avançado e o status de volta ao início.',
};

export default function ModuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
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
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [modeloAplicado, setModeloAplicado] = useState(null);
  const proximoIdTemporario = useRef(0);

  /** Preenche nome, ícone, tipo e colunas a partir de um modelo (tudo editável depois). */
  // Foto do que o último modelo preencheu: trocar de modelo sem ter editado nada não pede confirmação.
  const fotoDoModelo = useRef(null);
  const fotoAtual = () => JSON.stringify([formData.nome, campos.map((c) => [c.nome, c.tipo, c.opcoes])]);

  const aplicarModelo = async (modelo) => {
    const temConteudo = formData.nome.trim() || campos.some((c) => c.nome.trim());
    const editou = fotoDoModelo.current === null || fotoDoModelo.current !== fotoAtual();
    if (temConteudo && editou && modeloAplicado !== modelo.id) {
      const ok = await confirm({
        title: `Usar o modelo "${modelo.titulo}"?`,
        message: 'O nome e as colunas que você já preencheu serão substituídos pelos do modelo.',
        confirmLabel: 'Usar modelo',
        cancelLabel: 'Manter o que fiz',
      });
      if (!ok) return;
    }
    setFormData({ nome: modelo.nome, icone: modelo.icone, tipo: modelo.tipo });
    setCampos(modelo.colunas.map((c, i) => ({ ...c, opcoes: c.opcoes ? [...c.opcoes] : null, _isNew: true, _tempId: `modelo-${++proximoIdTemporario.current}-${i}` })));
    setFases(modelo.fases ? [...modelo.fases] : ['']);
    setModeloAplicado(modelo.id);
    fotoDoModelo.current = JSON.stringify([modelo.nome, modelo.colunas.map((c) => [c.nome, c.tipo, c.opcoes])]);
  };

  useEffect(() => {
    if (!isEditing) return undefined;

    // Evita aplicar a resposta de um módulo anterior se a rota mudar no meio.
    let cancelado = false;

    const fetchModulo = async () => {
      try {
        setLoading(true);
        const modulo = await moduloService.getById(id);
        if (cancelado) return;
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
          setError('Tabela não encontrada.');
        }
      } catch (err) {
        if (!cancelado) setError(mensagemDeErro(err, 'Erro ao carregar tabela.'));
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchModulo();
    return () => {
      cancelado = true;
    };
  }, [id, isEditing]);

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
      const ok = await confirm({
        title: `Excluir a coluna "${campo.nome}"?`,
        message: 'Isso só é possível se não houver itens usando esta coluna.',
        confirmLabel: 'Excluir coluna',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await moduloService.deleteField(id, campo.id);
        toast.success('Coluna excluída com sucesso.');
      } catch (err) {
        toast.error(mensagemDeErro(err, 'Erro ao excluir a coluna. Ela pode ter itens preenchidos.'));
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
        toast.error(mensagemDeErro(err, 'Erro ao reordenar as colunas.'));
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

  // Traz a lista de módulos atualizada ANTES de navegar: quem chega em /modulos
  // já vê o módulo novo/renomeado, sem um frame com a lista antiga.
  const atualizarListaDeModulos = () => queryClient.fetchQuery({ ...modulosQuery, staleTime: 0 }).catch(() => undefined);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

        await atualizarListaDeModulos();
        toast.success('Tabela atualizada.');
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
        await atualizarListaDeModulos();
        toast.success('Tabela criada.');
        navigate('/modulos');
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).join(' | '));
      } else {
        setError(mensagemDeErro(err, 'Erro ao salvar a tabela.'));
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
        title={isEditing ? 'Editar tabela' : 'Nova tabela'}
        subtitle={isEditing ? 'Atualize as informações e colunas' : 'Crie uma tabela do seu jeito'}
      />

      {error && (
        <div className="mb-6" role="alert">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!isEditing && (
        <section aria-labelledby="modelos-titulo" className="mb-6">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 id="modelos-titulo" className="text-sm font-semibold text-ink">Comece por um modelo</h2>
            <p className="text-xs text-light-text">ou monte do zero logo abaixo</p>
          </div>
          <div className="flex flex-col gap-4">
            {GRUPOS_DE_MODELOS.map(([grupo, modelos]) => (
              <div key={grupo}>
                <h3 className="text-xs font-semibold text-light-text mb-2">{grupo}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {modelos.map((modelo) => {
                    const ativo = modeloAplicado === modelo.id;
                    return (
                      <button
                        key={modelo.id}
                        type="button"
                        onClick={() => aplicarModelo(modelo)}
                        aria-pressed={ativo}
                        className={`text-left rounded-xl border p-4 transition-colors ${
                          ativo
                            ? 'border-primary bg-primary-50 shadow-xs'
                            : 'border-divider bg-surface hover:border-primary-300 hover:bg-primary-50/50'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ativo ? 'bg-primary text-white' : 'bg-primary-100 text-primary'}`}>
                            <span className="material-icons text-[19px]" aria-hidden="true">{modelo.icone}</span>
                          </span>
                          <span className="text-sm font-semibold text-ink">{modelo.titulo}</span>
                        </span>
                        <span className="block text-xs text-light-text mt-2 leading-relaxed">{modelo.descricao}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start w-full">

        {/* Coluna esquerda: identidade do módulo */}
        <Card className="lg:sticky lg:top-8 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold">Informações básicas</h2>
            <p className="text-xs text-light-text mt-0.5">Nome, tipo e ícone de identificação.</p>
          </div>

          <Input
            label="Nome da tabela"
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            required
            placeholder="Ex: Clientes"
          />

          <Select
            label="O que você quer organizar?"
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

          {!['financeiro', 'arquivo'].includes(formData.tipo) ? (
            <Card>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-base font-semibold">Colunas da tabela</h2>
                  <p className="text-xs text-light-text mt-0.5">
                    {isEditing ? 'Adicione, edite ou remova colunas' : 'Defina as colunas que compõem cada item'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="h-9 px-3.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-icons text-base" aria-hidden="true">add</span>
                  Coluna
                </button>
              </div>

              {campos.length === 0 ? (
                <div className="py-12 border border-dashed border-divider rounded-xl">
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
                          placeholder="Nome da coluna"
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
                          title="Remover coluna"
                        >
                          <span className="material-icons text-[19px]">delete_outline</span>
                        </button>
                      </div>

                      {CAMPO_TIPO_DICA[campo.tipo] && (
                        <p className="px-3.5 py-2.5 border-t border-divider text-xs text-light-text flex items-start gap-1.5">
                          <span className="material-icons text-[15px] text-primary shrink-0" aria-hidden="true">info</span>
                          {CAMPO_TIPO_DICA[campo.tipo]}
                        </p>
                      )}

                      {campo.tipo === 'selecao' && (
                        <div className="p-3.5 border-t border-divider">
                          <p className="text-xs font-medium text-light-text mb-2">Opções da lista</p>
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
          ) : formData.tipo === 'financeiro' ? (
            <Card className="bg-primary-50/50 border-primary-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0">
                  <span className="material-icons text-[24px]">account_balance_wallet</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-primary-900">Tabela financeira</h2>
                  <p className="text-sm text-primary-800 mt-1">
                    Tabelas financeiras possuem uma estrutura fixa e otimizada (Data, Descrição, Valor, Categoria) para controle de fluxo de caixa, não sendo necessário definir colunas customizadas.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-primary-50/50 border-primary-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0">
                  <span className="material-icons text-[24px]">folder_open</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-primary-900">Tabela de arquivos</h2>
                  <p className="text-sm text-primary-800 mt-1">
                    Esta tabela atua como um repositório centralizado e organizado de arquivos (upload, armazenamento e download), não necessitando da criação de colunas de dados.
                  </p>
                </div>
              </div>
            </Card>
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
