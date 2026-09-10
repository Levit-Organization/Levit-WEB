import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Input, Textarea, Select, Toggle, Badge, Alert, Spinner, Card, PageHeader } from '../components/ui';
import { moduloService } from '../services/moduloService';
import { automacaoService } from '../services/automacaoService';
import { GATILHO_INFO, ACAO_INFO, OPERADOR_INFO } from '../utils/automacaoConstants';

function novaAcao() {
  return { tipo: 'enviar_email', configuracao: { destinatario_campo_id: '', assunto: '', corpo: '' } };
}

export default function AutomacaoForm() {
  const { moduloId: moduloIdParam, id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [modulos, setModulos] = useState([]);
  const [moduloSelecionado, setModuloSelecionado] = useState(null);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [moduloId, setModuloId] = useState(moduloIdParam || '');
  const [frequenciaMaxima, setFrequenciaMaxima] = useState('');
  const [ativarAoSalvar, setAtivarAoSalvar] = useState(true);

  const [gatilho, setGatilho] = useState('criacao');

  const [temCondicao, setTemCondicao] = useState(false);
  const [campoCondicaoId, setCampoCondicaoId] = useState('');
  const [condicaoOperador, setCondicaoOperador] = useState('igual');
  const [condicaoValor, setCondicaoValor] = useState('');

  const [acoes, setAcoes] = useState([novaAcao()]);

  const [loading, setLoading] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(isEditing);
  const [error, setError] = useState('');

  useEffect(() => {
    moduloService.getAll().then(setModulos).catch(() => setModulos([]));
  }, []);

  useEffect(() => {
    if (!moduloId) {
      setModuloSelecionado(null);
      return;
    }
    moduloService
      .getById(moduloId)
      .then(setModuloSelecionado)
      .catch(() => setModuloSelecionado(null));
  }, [moduloId]);

  useEffect(() => {
    if (!isEditing || !moduloIdParam) return;
    automacaoService
      .listar(moduloIdParam)
      .then((lista) => {
        const automacao = (lista || []).find((a) => String(a.id) === String(id));
        if (!automacao) {
          setError('Automação não encontrada.');
          return;
        }
        setNome(automacao.nome || '');
        setModuloId(moduloIdParam);
        setGatilho(automacao.gatilho || 'criacao');
        setAtivarAoSalvar(!!automacao.ativo);

        if (automacao.campo_condicao_id) {
          setTemCondicao(true);
          setCampoCondicaoId(automacao.campo_condicao_id);
          setCondicaoOperador(automacao.condicao_operador || 'igual');
          setCondicaoValor(automacao.condicao_valor || '');
        }

        if (automacao.acoes?.length) {
          setAcoes(
            automacao.acoes.map((a) => ({
              tipo: a.tipo,
              configuracao: typeof a.configuracao === 'string' ? JSON.parse(a.configuracao) : a.configuracao || {},
            }))
          );
        }
      })
      .catch(() => setError('Erro ao carregar a automação.'))
      .finally(() => setCarregandoInicial(false));
  }, [isEditing, moduloIdParam, id]);

  const camposModulo = moduloSelecionado?.campos || [];
  const campoCondicao = camposModulo.find((c) => String(c.id) === String(campoCondicaoId));

  const handleAcaoTipoChange = (index, tipo) => {
    setAcoes((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (tipo === 'enviar_email') return { tipo, configuracao: { destinatario_campo_id: '', assunto: '', corpo: '' } };
        if (tipo === 'webhook') return { tipo, configuracao: { url: '' } };
        return { tipo, configuracao: {} };
      })
    );
  };

  const handleAcaoConfigChange = (index, campo, valor) => {
    setAcoes((prev) =>
      prev.map((a, i) => (i === index ? { ...a, configuracao: { ...a.configuracao, [campo]: valor } } : a))
    );
  };

  const handleAddAcao = () => setAcoes((prev) => [...prev, novaAcao()]);
  const handleRemoveAcao = (index) => setAcoes((prev) => prev.filter((_, i) => i !== index));

  const podeSalvar =
    !loading &&
    nome.trim().length >= 2 &&
    !!moduloId &&
    acoes.every((a) => {
      if (a.tipo === 'enviar_email') return a.configuracao.destinatario_campo_id && a.configuracao.assunto && a.configuracao.corpo;
      if (a.tipo === 'webhook') return !!a.configuracao.url;
      return false;
    }) &&
    (!temCondicao || (campoCondicaoId && condicaoOperador && condicaoValor));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!podeSalvar) return;

    setLoading(true);
    setError('');

    const payload = {
      nome: nome.trim(),
      gatilho,
      ...(temCondicao
        ? { campo_condicao_id: campoCondicaoId, condicao_operador: condicaoOperador, condicao_valor: condicaoValor }
        : {}),
      acoes: acoes.map((a) => ({ tipo: a.tipo, configuracao: a.configuracao })),
    };

    try {
      const criada = await automacaoService.criar(moduloId, payload);

      if (isEditing) {
        await automacaoService.excluir(moduloIdParam, id);
      }

      if (!ativarAoSalvar) {
        await automacaoService.alternarAtivo(moduloId, criada.id, false);
      }

      navigate('/automacoes');
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).join(' | '));
      } else {
        setError(err.response?.data?.message || 'Erro ao salvar a automação.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (carregandoInicial) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        backTo="/automacoes"
        icon="bolt"
        title={isEditing ? 'Editar Automação' : 'Nova Automação'}
        subtitle="Configure o gatilho, condição e ação do fluxo"
      />

      {error && (
        <div className="mb-6 shrink-0">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start w-full">
        {/* Painel de propriedades */}
        <Card className="lg:sticky lg:top-8 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold">Propriedades</h2>
            <p className="text-xs text-light-text mt-0.5">Metadados e configurações gerais da automação.</p>
          </div>

          <Input
            label="Nome da automação"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Ex: Notificar novo lead"
          />

          <Textarea
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            placeholder="O que essa automação faz?"
          />

          <Select
            label="Módulo de origem"
            value={moduloId}
            onChange={(e) => setModuloId(e.target.value)}
            required
            disabled={isEditing}
            placeholder="Selecione um módulo"
            options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
          />

          <Input
            label="Frequência máxima"
            value={frequenciaMaxima}
            onChange={(e) => setFrequenciaMaxima(e.target.value)}
            placeholder="Ex: 1 execução por registro / dia"
            hint="Limite ainda não aplicado pelo motor de automações."
          />

          <div className="pt-1 border-t border-divider">
            <div className="pt-3">
              <Toggle
                checked={ativarAoSalvar}
                onChange={setAtivarAoSalvar}
                label="Ativar ao salvar"
                description="A automação já começa a rodar."
              />
            </div>
          </div>
        </Card>

        {/* Construtor lógico */}
        <div className="flex flex-col gap-0 min-w-0">
          {/* Nó 1: Gatilho */}
          <Card>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center shrink-0 tabular">1</span>
              <h2 className="text-base font-semibold">Gatilho</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(GATILHO_INFO).map(([valor, info]) => (
                <button
                  key={valor}
                  type="button"
                  disabled={info.disabled}
                  onClick={() => setGatilho(valor)}
                  title={info.disabled ? 'Em breve' : info.label}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-4 text-center transition-colors ${
                    gatilho === valor
                      ? 'border-primary bg-primary-50 text-primary-700 shadow-xs'
                      : 'border-divider-strong text-light-text hover:border-primary-300 hover:bg-primary-50/60 hover:text-ink-soft'
                  } ${info.disabled ? 'border-divider bg-background text-faint cursor-not-allowed hover:border-divider hover:bg-background hover:text-faint' : ''}`}
                >
                  <span className="material-icons text-[22px]">{info.icon}</span>
                  <span className="text-xs font-medium">{info.label}</span>
                  {info.disabled && <Badge variant="outline" size="sm" className="absolute top-1.5 right-1.5">Em breve</Badge>}
                </button>
              ))}
            </div>
          </Card>

          <div className="flex justify-center py-1">
            <div className="w-px h-6 bg-divider" />
          </div>

          {/* Nó 2: Condição (opcional) */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center shrink-0 tabular">2</span>
                <div>
                  <h2 className="text-base font-semibold inline">Condição</h2>
                  <span className="text-xs text-light-text ml-1.5">(opcional)</span>
                </div>
              </div>
              <Toggle checked={temCondicao} onChange={setTemCondicao} />
            </div>

            {temCondicao && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Campo"
                  value={campoCondicaoId}
                  onChange={(e) => { setCampoCondicaoId(e.target.value); setCondicaoValor(''); }}
                  required={temCondicao}
                  disabled={!moduloSelecionado}
                  placeholder="Selecione"
                  options={camposModulo.map((c) => ({ value: c.id, label: c.nome }))}
                />

                <Select
                  label="Operador"
                  value={condicaoOperador}
                  onChange={(e) => setCondicaoOperador(e.target.value)}
                  required={temCondicao}
                  options={Object.entries(OPERADOR_INFO).map(([valor, label]) => ({ value: valor, label }))}
                />

                <div>
                  <label className="block text-sm font-medium mb-1.5">Valor</label>
                  {campoCondicao?.tipo === 'selecao' ? (
                    <Select
                      value={condicaoValor}
                      onChange={(e) => setCondicaoValor(e.target.value)}
                      required={temCondicao}
                      placeholder="Selecione"
                      options={(campoCondicao.opcoes || []).map((op) => ({ value: op, label: op }))}
                    />
                  ) : (
                    <Input
                      value={condicaoValor}
                      onChange={(e) => setCondicaoValor(e.target.value)}
                      required={temCondicao}
                      placeholder="Valor de comparação"
                    />
                  )}
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-center py-1">
            <div className="w-px h-6 bg-divider" />
          </div>

          {/* Nó 3: Ações */}
          {acoes.map((acao, index) => (
            <div key={index}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center shrink-0 tabular">
                      {index === 0 ? 3 : `3.${index + 1}`}
                    </span>
                    <h2 className="text-base font-semibold">Ação</h2>
                  </div>
                  {acoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAcao(index)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-light-text hover:text-danger hover:bg-danger-bg transition-colors"
                      title="Remover ação"
                    >
                      <span className="material-icons text-[18px]">delete_outline</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {Object.entries(ACAO_INFO).map(([valor, info]) => (
                    <button
                      key={valor}
                      type="button"
                      disabled={info.disabled}
                      onClick={() => handleAcaoTipoChange(index, valor)}
                      title={info.disabled ? 'Em breve' : info.label}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-4 text-center transition-colors ${
                        acao.tipo === valor
                          ? 'border-primary bg-primary-50 text-primary-700 shadow-xs'
                          : 'border-divider-strong text-light-text hover:border-primary-300 hover:bg-primary-50/60 hover:text-ink-soft'
                      } ${info.disabled ? 'border-divider bg-background text-faint cursor-not-allowed hover:border-divider hover:bg-background hover:text-faint' : ''}`}
                    >
                      <span className="material-icons text-[22px]">{info.icon}</span>
                      <span className="text-xs font-medium">{info.label}</span>
                      {info.disabled && <Badge variant="outline" size="sm" className="absolute top-1.5 right-1.5">Em breve</Badge>}
                    </button>
                  ))}
                </div>

                {acao.tipo === 'enviar_email' && (
                  <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
                    <Select
                      label="Destinatário"
                      value={acao.configuracao.destinatario_campo_id || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'destinatario_campo_id', e.target.value)}
                      disabled={!moduloSelecionado}
                      required
                      placeholder="Campo com o e-mail do destinatário"
                      options={camposModulo.map((c) => ({ value: c.id, label: c.nome }))}
                    />

                    <Input
                      label="Assunto"
                      value={acao.configuracao.assunto || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'assunto', e.target.value)}
                      required
                      placeholder="Ex: Olá {{nome}}, recebemos seu contato"
                      hint={camposModulo.length > 0 ? `Variáveis disponíveis: ${camposModulo.map((c) => `{{${c.nome}}}`).join(', ')}` : undefined}
                    />

                    <Textarea
                      label="Modelo de mensagem"
                      value={acao.configuracao.corpo || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'corpo', e.target.value)}
                      required
                      rows={4}
                      placeholder="Escreva o corpo do e-mail. Use {{nome_do_campo}} para inserir dados do registro."
                    />
                  </div>
                )}

                {acao.tipo === 'webhook' && (
                  <div className="pt-4 border-t border-divider">
                    <Input
                      label="URL do webhook"
                      type="url"
                      value={acao.configuracao.url || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'url', e.target.value)}
                      required
                      placeholder="https://exemplo.com/webhook"
                    />
                  </div>
                )}
              </Card>

              <div className="flex justify-center py-1">
                <div className="w-px h-6 bg-divider" />
              </div>
            </div>
          ))}

          <div className="flex justify-center -mt-1 mb-6">
            <button
              type="button"
              onClick={handleAddAcao}
              title="Adicionar outra ação"
              className="w-9 h-9 rounded-full border border-divider-strong bg-surface flex items-center justify-center text-light-text hover:border-primary hover:bg-primary-50 hover:text-primary transition-colors shadow-xs"
            >
              <span className="material-icons text-[19px]">add</span>
            </button>
          </div>

          <div className="flex justify-end gap-3 pb-2">
            <Button variant="secondary" to="/automacoes">Cancelar</Button>
            <Button type="submit" disabled={!podeSalvar} loading={loading}>
              {loading ? 'Salvando...' : 'Salvar Automação'}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
