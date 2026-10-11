import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Button, Input, Textarea, Select, Toggle, Badge, Alert, Spinner, Card, PageHeader } from '../components/ui';
import { automacaoService } from '../services/automacaoService';
import SimulacaoModal from '../components/automacoes/SimulacaoModal';
import CondicoesEditor from '../components/automacoes/CondicoesEditor';
import { AcaoAtualizarCampo, AcaoCriarRegistro } from '../components/automacoes/AcoesDeDados';
import {
  GATILHO_INFO,
  ACAO_INFO,
  OPERADORES_DE_MUDANCA,
  DESTINO_NOTIFICACAO,
  CAMPOS_CANDIDATO,
  ehVaga,
  gatilhosDoModulo,
  gatilhoDeMudanca,
  acoesDoModulo,
  montarDefinicao,
  configuracaoInicial,
  acaoValida,
  regraValida,
  novaRegra,
  condicoesDaAutomacao,
} from '../utils/automacaoConstants';
import { useModulos, useModulo, useEquipe, useCargos, useKanban, automacoesQuery } from '../hooks/queries';
import { useToast } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

const SEM_DADOS = [];

function novaAcao() {
  return { tipo: 'enviar_email', configuracao: configuracaoInicial('enviar_email') };
}

export default function AutomacaoForm() {
  const { moduloId: moduloIdParam, id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [moduloId, setModuloId] = useState(moduloIdParam || '');
  // Lista e detalhe do módulo vêm do cache compartilhado (sem refetch a cada visita).
  const modulos = useModulos().data ?? SEM_DADOS;
  const moduloSelecionado = useModulo(moduloId || undefined).data ?? null;
  const [ativarAoSalvar, setAtivarAoSalvar] = useState(true);

  const [gatilhos, setGatilhos] = useState(['criacao']);

  // Alterna um gatilho; sempre sobra pelo menos um selecionado.
  const alternarGatilho = (valor) =>
    setGatilhos((atual) => {
      if (!atual.includes(valor)) return [...atual, valor];
      return atual.length > 1 ? atual.filter((g) => g !== valor) : atual;
    });

  const [temCondicao, setTemCondicao] = useState(false);
  const [logica, setLogica] = useState('e');
  const [regras, setRegras] = useState([novaRegra()]);
  const usaMudanca = temCondicao && regras.some((r) => OPERADORES_DE_MUDANCA.includes(r.operador));

  const [acoes, setAcoes] = useState([novaAcao()]);

  // O tipo vem da lista (já carregada) para não esperar o detalhe do módulo.
  const moduloDaLista = modulos.find((m) => String(m.id) === String(moduloId)) ?? moduloSelecionado;
  const vaga = ehVaga(moduloDaLista);
  const gatilhosDisponiveis = gatilhosDoModulo(moduloDaLista);
  const acoesDisponiveis = acoesDoModulo(moduloDaLista);

  // Condições de mudança precisam do valor anterior: garante o gatilho que o fornece.
  const garantirGatilhoDeMudanca = () => {
    const necessario = gatilhoDeMudanca(moduloDaLista);
    setGatilhos((atual) => (atual.includes(necessario) ? atual : [...atual, necessario]));
  };

  /**
   * Trocar de módulo muda o que faz sentido: gatilhos (registro x candidato),
   * campos das condições e algumas ações. Reinicia o que depende do módulo.
   */
  const trocarModulo = (novoId) => {
    const novo = modulos.find((m) => String(m.id) === String(novoId));
    setModuloId(novoId);
    setGatilhos([gatilhosDoModulo(novo)[0]]);
    setTemCondicao(false);
    setRegras([novaRegra()]);
    setAcoes((atual) =>
      atual.map((a) =>
        acoesDoModulo(novo).includes(a.tipo) && a.tipo !== 'atualizar_campo' ? a : novaAcao()
      )
    );
  };

  const [loading, setLoading] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(isEditing);
  const [error, setError] = useState('');
  const [testando, setTestando] = useState(false);

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
        setGatilhos(automacao.gatilhos?.length ? automacao.gatilhos : [automacao.gatilho || 'criacao']);
        setAtivarAoSalvar(!!automacao.ativo);

        const condicoes = condicoesDaAutomacao(automacao);
        if (condicoes) {
          setTemCondicao(true);
          setLogica(condicoes.logica || 'e');
          setRegras(
            condicoes.regras.map((r) => ({
              campo: r.campo || '',
              operador: r.operador || 'igual',
              valor: r.valor ?? '',
              valor_de: r.valor_de ?? '',
            }))
          );
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

  // Destinatários de notificação: só carregam quando alguma ação é de notificação.
  const temNotificacao = acoes.some((a) => a.tipo === 'notificacao');
  const equipe = useEquipe({ enabled: temNotificacao }).data ?? SEM_DADOS;
  const cargos = useCargos({ enabled: temNotificacao }).data ?? SEM_DADOS;

  const camposModulo = moduloSelecionado?.campos || [];
  const camposResponsavel = camposModulo.filter((c) => c.tipo === 'responsavel');
  // Em vagas, condições e variáveis usam os campos do candidato.
  const camposCondicao = vaga ? CAMPOS_CANDIDATO : camposModulo;
  const dicaVariaveis = camposCondicao.length > 0
    ? `Variáveis disponíveis: ${camposCondicao.map((c) => `{{${c.nome}}}`).join(', ')}`
    : undefined;
  // Etapas da vaga (para condições sobre "Etapa"): vêm do próprio funil.
  const funil = useKanban(vaga ? moduloId : undefined, { enabled: vaga && !!moduloId }).data;
  const opcoesEtapa = useMemo(() => Object.values(funil || {}).map((c) => c.fase).filter(Boolean), [funil]);
  const modulosDestino = modulos.filter((m) => m.tipo !== 'recrutamento' && m.tipo !== 'financeiro');

  const handleAcaoTipoChange = (index, tipo) => {
    setAcoes((prev) =>
      prev.map((a, i) => (i === index ? { tipo, configuracao: configuracaoInicial(tipo) } : a))
    );
  };

  const handleAcaoConfigChange = (index, campo, valor) => {
    setAcoes((prev) =>
      prev.map((a, i) => (i === index ? { ...a, configuracao: { ...a.configuracao, [campo]: valor } } : a))
    );
  };

  const mesclarConfiguracao = (index, parcial) => {
    setAcoes((prev) => prev.map((a, i) => (i === index ? { ...a, configuracao: { ...a.configuracao, ...parcial } } : a)));
  };

  const handleAddAcao = () => setAcoes((prev) => [...prev, novaAcao()]);
  const handleRemoveAcao = (index) => setAcoes((prev) => prev.filter((_, i) => i !== index));

  // Mesmas validações do salvar, menos o nome: dá para testar antes de nomear.
  const definicaoValida =
    !!moduloId &&
    acoes.every(acaoValida) &&
    acoes.every((a) => acoesDisponiveis.includes(a.tipo)) &&
    gatilhos.every((g) => gatilhosDisponiveis.includes(g)) &&
    (!temCondicao || regras.every(regraValida));
  const podeSalvar = !loading && nome.trim().length >= 2 && definicaoValida;

  const definicao = useMemo(
    () => montarDefinicao({ nome, gatilhos, temCondicao, logica, regras, acoes }),
    [nome, gatilhos, temCondicao, logica, regras, acoes]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!podeSalvar) return;

    setLoading(true);
    setError('');

    const payload = { ...definicao, ativo: ativarAoSalvar };

    try {
      // Editar atualiza no lugar: mantém o id e o histórico de execuções.
      if (isEditing) {
        await automacaoService.atualizar(moduloIdParam, id, payload);
      } else {
        await automacaoService.criar(moduloId, payload);
      }

      // Atualiza a lista antes de navegar: quem chega em /automacoes já vê o resultado.
      await queryClient.fetchQuery({ ...automacoesQuery, staleTime: 0 }).catch(() => undefined);
      toast.success(isEditing ? 'Automação atualizada.' : 'Automação criada.');
      navigate('/automacoes');
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).join(' | '));
      } else {
        setError(mensagemDeErro(err, 'Erro ao salvar a automação.'));
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
        subtitle="Configure os gatilhos, as condições e as ações do fluxo"
      />

      {error && (
        <div className="mb-6 shrink-0" role="alert">
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

          <Select
            label="Tabela de origem"
            value={moduloId}
            onChange={(e) => trocarModulo(e.target.value)}
            required
            disabled={isEditing}
            hint={vaga ? 'Vaga de recrutamento: a automação trabalha com candidatos.' : undefined}
            placeholder="Selecione uma tabela"
            options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
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
              <div>
                <h2 className="text-base font-semibold inline">Gatilhos</h2>
                <span className="text-xs text-light-text ml-1.5">dispara quando qualquer um ocorrer</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {gatilhosDisponiveis.map((valor) => [valor, GATILHO_INFO[valor]]).map(([valor, info]) => (
                <button
                  key={valor}
                  type="button"
                  disabled={info.disabled}
                  onClick={() => alternarGatilho(valor)}
                  aria-pressed={gatilhos.includes(valor)}
                  title={info.disabled ? 'Em breve' : info.label}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-4 text-center transition-colors ${
                    gatilhos.includes(valor)
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

          {/* Nó 2: Condições (opcional) */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center shrink-0 tabular">2</span>
                <div>
                  <h2 className="text-base font-semibold inline">Condições</h2>
                  <span className="text-xs text-light-text ml-1.5">(opcional)</span>
                </div>
              </div>
              <Toggle
                ariaLabel="Usar condições"
                checked={temCondicao}
                onChange={(ligado) => {
                  setTemCondicao(ligado);
                  if (ligado && regras.length === 0) setRegras([novaRegra()]);
                }}
              />
            </div>

            {temCondicao ? (
              <CondicoesEditor
                logica={logica}
                regras={regras}
                campos={camposCondicao}
                opcoesEtapa={opcoesEtapa}
                onChangeLogica={setLogica}
                onChangeRegras={setRegras}
                onMudanca={garantirGatilhoDeMudanca}
              />
            ) : (
              <p className="text-xs text-light-text">Sem condições, a automação roda sempre que um gatilho ocorrer.</p>
            )}
            {usaMudanca && (
              <p className="text-xs text-light-text mt-3">
                {vaga ? (
                  <>Condições de mudança comparam a etapa antes e depois, então só valem no gatilho <strong>Mudou de etapa</strong>.</>
                ) : (
                  <>
                    Condições de mudança comparam o valor antes e depois da edição, então só valem em <strong>atualizações</strong>.
                    Editar outros campos de um registro que já estava com esse valor não dispara de novo.
                  </>
                )}
              </p>
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

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
                  {acoesDisponiveis.map((valor) => [valor, ACAO_INFO[valor]]).map(([valor, info]) => (
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
                    {camposResponsavel.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-light-text">Enviar para:</span>
                        {camposResponsavel.map((c) => {
                          const ativo = acao.configuracao.destinatario_campo_id === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              aria-pressed={ativo}
                              onClick={() => mesclarConfiguracao(index, { destinatario: '', destinatario_campo_id: ativo ? '' : c.id })}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 h-7 text-xs font-semibold transition-colors ${
                                ativo ? 'border-primary bg-primary-50 text-primary-700' : 'border-divider-strong text-ink-soft hover:border-primary-300'
                              }`}
                            >
                              <span className="material-icons text-[15px]" aria-hidden="true">person</span>
                              {c.nome} do item
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {camposResponsavel.some((c) => c.id === acao.configuracao.destinatario_campo_id) ? (
                      <p className="text-xs text-light-text -mt-1">
                        O e-mail vai para o endereço da conta da pessoa escolhida em "{camposResponsavel.find((c) => c.id === acao.configuracao.destinatario_campo_id).nome}".
                      </p>
                    ) : (
                      <Input
                        label="Destinatário (E-mail)"
                        value={acao.configuracao.destinatario || acao.configuracao.destinatario_campo_id || ''}
                        onChange={(e) => {
                          handleAcaoConfigChange(index, 'destinatario', e.target.value);
                          if (acao.configuracao.destinatario_campo_id) {
                            handleAcaoConfigChange(index, 'destinatario_campo_id', '');
                          }
                        }}
                        required
                        placeholder="Ex: admin@empresa.com ou {{Email}}"
                        hint={
                          vaga
                            ? 'Para escrever ao candidato, use {{E-mail}}.'
                            : camposModulo.length > 0
                              ? `Para enviar a um e-mail do item, use: ${camposModulo.map((c) => `{{${c.nome}}}`).join(', ')}`
                              : undefined
                        }
                      />
                    )}

                    <Input
                      label="Assunto"
                      value={acao.configuracao.assunto || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'assunto', e.target.value)}
                      required
                      placeholder="Ex: Olá {{nome}}, recebemos seu contato"
                      hint={dicaVariaveis}
                    />

                    <Textarea
                      label="Modelo de mensagem"
                      value={acao.configuracao.corpo || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'corpo', e.target.value)}
                      required
                      rows={4}
                      placeholder="Escreva o corpo do e-mail. Use {{nome_do_campo}} para inserir dados do item."
                    />
                  </div>
                )}

                {acao.tipo === 'webhook' && (
                  <div className="pt-4 border-t border-divider">
                    <Input
                      label="Endereço do outro sistema"
                      type="url"
                      value={acao.configuracao.url || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'url', e.target.value)}
                      required
                      placeholder="https://exemplo.com/webhook"
                      hint="Para integrar com sistemas que vocês já usam (ERP, planilhas online, Zapier…): o Levit envia os dados do item para este endereço (webhook). Peça o endereço a quem cuida da integração."
                    />
                  </div>
                )}

                {acao.tipo === 'atualizar_campo' && (
                  <AcaoAtualizarCampo
                    configuracao={acao.configuracao}
                    campos={camposModulo}
                    onChange={(parcial) => mesclarConfiguracao(index, parcial)}
                  />
                )}

                {acao.tipo === 'criar_registro' && (
                  <AcaoCriarRegistro
                    configuracao={acao.configuracao}
                    camposOrigem={camposModulo}
                    modulos={modulosDestino}
                    onChange={(parcial) => mesclarConfiguracao(index, parcial)}
                  />
                )}

                {acao.tipo === 'notificacao' && (
                  <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="Quem recebe"
                        value={acao.configuracao.destinatarios || 'todos'}
                        onChange={(e) => {
                          handleAcaoConfigChange(index, 'destinatarios', e.target.value);
                          handleAcaoConfigChange(index, 'destino_id', '');
                        }}
                        required
                        options={Object.entries(DESTINO_NOTIFICACAO)
                          .filter(([value]) => value !== 'responsavel' || camposResponsavel.length > 0 || acao.configuracao.destinatarios === 'responsavel')
                          .map(([value, label]) => ({ value, label }))}
                      />
                      {acao.configuracao.destinatarios === 'cargo' && (
                        <Select
                          label="Cargo"
                          value={acao.configuracao.destino_id || ''}
                          onChange={(e) => handleAcaoConfigChange(index, 'destino_id', e.target.value)}
                          required
                          placeholder="Selecione um cargo"
                          options={cargos.map((c) => ({ value: c.id, label: c.nome }))}
                        />
                      )}
                      {acao.configuracao.destinatarios === 'usuario' && (
                        <Select
                          label="Pessoa"
                          value={acao.configuracao.destino_id || ''}
                          onChange={(e) => handleAcaoConfigChange(index, 'destino_id', e.target.value)}
                          required
                          placeholder="Selecione uma pessoa"
                          options={equipe.map((m) => ({ value: m.id, label: m.nome || m.email }))}
                        />
                      )}
                    </div>
                    <p className="text-xs text-light-text -mt-1">
                      Só recebe quem tem acesso a esta tabela, mesmo escolhendo um cargo ou uma pessoa.
                    </p>

                    <Input
                      label="Título"
                      value={acao.configuracao.titulo || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'titulo', e.target.value)}
                      required
                      maxLength={200}
                      placeholder="Ex: Negócio {{Empresa}} fechado"
                      hint={dicaVariaveis}
                    />

                    <Textarea
                      label="Mensagem (opcional)"
                      value={acao.configuracao.mensagem || ''}
                      onChange={(e) => handleAcaoConfigChange(index, 'mensagem', e.target.value)}
                      rows={3}
                      placeholder="Detalhes que aparecem abaixo do título. Aceita {{variáveis}}."
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

          <div className="flex flex-wrap justify-end gap-3 pb-2">
            <Button
              variant="ghost"
              icon="science"
              onClick={() => setTestando(true)}
              disabled={!definicaoValida}
              title={definicaoValida ? 'Ver o que aconteceria com um item real, sem enviar nada' : 'Preencha a tabela e as ações para testar'}
              className="sm:mr-auto"
            >
              Testar
            </Button>
            <Button variant="secondary" to="/automacoes">Cancelar</Button>
            <Button type="submit" disabled={!podeSalvar} loading={loading}>
              {loading ? 'Salvando...' : 'Salvar Automação'}
            </Button>
          </div>
        </div>
      </form>

      <SimulacaoModal open={testando} onClose={() => setTestando(false)} moduloId={moduloId} definicao={definicao} vaga={vaga} />
    </Layout>
  );
}
