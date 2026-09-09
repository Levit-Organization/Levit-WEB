import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
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
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="flex items-center gap-4 mb-8 shrink-0">
        <Link
          to="/automacoes"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-light-text hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-icons text-primary text-[22px]">bolt</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEditing ? 'Editar Automação' : 'Nova Automação'}</h1>
          <p className="text-sm text-light-text mt-0.5">Configure o gatilho, condição e ação do fluxo</p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center gap-2.5 border border-red-100 shrink-0">
          <span className="material-icons text-lg shrink-0">error_outline</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start w-full">
        {/* Painel de propriedades */}
        <div className="bg-white border border-divider rounded-2xl p-6 lg:sticky lg:top-8 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold">Propriedades</h2>
            <p className="text-xs text-light-text mt-0.5">Metadados e configurações gerais da automação.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Nome da automação</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex: Notificar novo lead"
              className="w-full h-11 px-4 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="O que essa automação faz?"
              className="w-full px-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Módulo de origem</label>
            <div className="relative">
              <select
                value={moduloId}
                onChange={(e) => setModuloId(e.target.value)}
                required
                disabled={isEditing}
                className="w-full h-11 appearance-none pl-4 pr-9 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white disabled:bg-background disabled:text-light-text transition-colors"
              >
                <option value="" disabled>Selecione um módulo</option>
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
              <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-light-text pointer-events-none">expand_more</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Frequência máxima</label>
            <input
              type="text"
              value={frequenciaMaxima}
              onChange={(e) => setFrequenciaMaxima(e.target.value)}
              placeholder="Ex: 1 execução por registro / dia"
              className="w-full h-11 px-4 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
            />
            <p className="text-[11px] text-light-text mt-1.5">Limite ainda não aplicado pelo motor de automações.</p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-divider">
            <div className="pt-3">
              <p className="text-sm font-medium">Ativar ao salvar</p>
              <p className="text-[11px] text-light-text mt-0.5">A automação já começa a rodar.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ativarAoSalvar}
              onClick={() => setAtivarAoSalvar((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-3 ${
                ativarAoSalvar ? 'bg-primary' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  ativarAoSalvar ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Construtor lógico */}
        <div className="flex flex-col gap-0 min-w-0">
          {/* Nó 1: Gatilho */}
          <div className="bg-white border border-divider rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
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
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-divider text-light-text hover:border-primary/40 hover:text-gray-700'
                  } ${info.disabled ? 'opacity-50 cursor-not-allowed hover:border-divider hover:text-light-text' : ''}`}
                >
                  <span className="material-icons text-[22px]">{info.icon}</span>
                  <span className="text-xs font-medium">{info.label}</span>
                  {info.disabled && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded-full">Em breve</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-px h-6 bg-divider" />
          </div>

          {/* Nó 2: Condição (opcional) */}
          <div className="bg-white border border-divider rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <h2 className="text-base font-semibold inline">Condição</h2>
                  <span className="text-xs text-light-text ml-1.5">(opcional)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTemCondicao((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  temCondicao ? 'bg-primary' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    temCondicao ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {temCondicao && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-light-text mb-1.5">Campo</label>
                  <div className="relative">
                    <select
                      value={campoCondicaoId}
                      onChange={(e) => { setCampoCondicaoId(e.target.value); setCondicaoValor(''); }}
                      required={temCondicao}
                      disabled={!moduloSelecionado}
                      className="w-full h-10 appearance-none pl-3.5 pr-8 border border-divider rounded-lg text-sm bg-white disabled:bg-background disabled:text-light-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="" disabled>Selecione</option>
                      {camposModulo.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                    <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-light-text mb-1.5">Operador</label>
                  <div className="relative">
                    <select
                      value={condicaoOperador}
                      onChange={(e) => setCondicaoOperador(e.target.value)}
                      required={temCondicao}
                      className="w-full h-10 appearance-none pl-3.5 pr-8 border border-divider rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {Object.entries(OPERADOR_INFO).map(([valor, label]) => (
                        <option key={valor} value={valor}>{label}</option>
                      ))}
                    </select>
                    <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-light-text mb-1.5">Valor</label>
                  {campoCondicao?.tipo === 'selecao' ? (
                    <div className="relative">
                      <select
                        value={condicaoValor}
                        onChange={(e) => setCondicaoValor(e.target.value)}
                        required={temCondicao}
                        className="w-full h-10 appearance-none pl-3.5 pr-8 border border-divider rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="" disabled>Selecione</option>
                        {(campoCondicao.opcoes || []).map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={condicaoValor}
                      onChange={(e) => setCondicaoValor(e.target.value)}
                      required={temCondicao}
                      placeholder="Valor de comparação"
                      className="w-full h-10 px-3.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center py-1">
            <div className="w-px h-6 bg-divider" />
          </div>

          {/* Nó 3: Ações */}
          {acoes.map((acao, index) => (
            <div key={index}>
              <div className="bg-white border border-divider rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index === 0 ? 3 : `3.${index + 1}`}
                    </span>
                    <h2 className="text-base font-semibold">Ação</h2>
                  </div>
                  {acoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAcao(index)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-light-text hover:text-red-600 hover:bg-red-50 transition-colors"
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
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-divider text-light-text hover:border-primary/40 hover:text-gray-700'
                      } ${info.disabled ? 'opacity-50 cursor-not-allowed hover:border-divider hover:text-light-text' : ''}`}
                    >
                      <span className="material-icons text-[22px]">{info.icon}</span>
                      <span className="text-xs font-medium">{info.label}</span>
                      {info.disabled && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded-full">Em breve</span>
                      )}
                    </button>
                  ))}
                </div>

                {acao.tipo === 'enviar_email' && (
                  <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
                    <div>
                      <label className="block text-xs font-medium text-light-text mb-1.5">Destinatário</label>
                      <div className="relative">
                        <select
                          value={acao.configuracao.destinatario_campo_id || ''}
                          onChange={(e) => handleAcaoConfigChange(index, 'destinatario_campo_id', e.target.value)}
                          disabled={!moduloSelecionado}
                          required
                          className="w-full h-10 appearance-none pl-3.5 pr-8 border border-divider rounded-lg text-sm bg-white disabled:bg-background disabled:text-light-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="" disabled>Campo com o e-mail do destinatário</option>
                          {camposModulo.map((c) => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                        <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-light-text mb-1.5">Assunto</label>
                      <input
                        type="text"
                        value={acao.configuracao.assunto || ''}
                        onChange={(e) => handleAcaoConfigChange(index, 'assunto', e.target.value)}
                        required
                        placeholder="Ex: Olá {{nome}}, recebemos seu contato"
                        className="w-full h-10 px-3.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {camposModulo.length > 0 && (
                        <p className="text-[11px] text-light-text mt-1.5">
                          Variáveis disponíveis: {camposModulo.map((c) => `{{${c.nome}}}`).join(', ')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-light-text mb-1.5">Modelo de mensagem</label>
                      <textarea
                        value={acao.configuracao.corpo || ''}
                        onChange={(e) => handleAcaoConfigChange(index, 'corpo', e.target.value)}
                        required
                        rows={4}
                        placeholder="Escreva o corpo do e-mail. Use {{nome_do_campo}} para inserir dados do registro."
                        className="w-full px-3.5 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                )}

                {acao.tipo === 'webhook' && (
                  <div className="pt-4 border-t border-divider">
                    <label className="block text-xs font-medium text-light-text mb-1.5">URL do webhook</label>
                    <input
                      type="url"
                      value={acao.configuracao.url || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'url', e.target.value)}
                      required
                      placeholder="https://exemplo.com/webhook"
                      className="w-full h-10 px-3.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                )}
              </div>

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
              className="w-9 h-9 rounded-full border border-divider bg-white flex items-center justify-center text-light-text hover:border-primary hover:text-primary transition-colors shadow-sm"
            >
              <span className="material-icons text-[19px]">add</span>
            </button>
          </div>

          <div className="flex justify-end gap-3 pb-2">
            <Link
              to="/automacoes"
              className="h-11 px-5 rounded-lg text-sm font-medium border border-divider hover:bg-background transition-colors flex items-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!podeSalvar}
              className="h-11 px-5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Automação'
              )}
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
