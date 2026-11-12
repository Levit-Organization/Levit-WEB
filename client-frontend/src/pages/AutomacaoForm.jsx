import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Alert, Spinner, Card, PageHeader } from '../components/ui';
import SimulacaoModal from '../components/automacoes/SimulacaoModal';
import PropriedadesDaAutomacao from '../components/automacoes/PropriedadesDaAutomacao';
import CartaoCondicoes from '../components/automacoes/CartaoCondicoes';
import CartaoAcao from '../components/automacoes/CartaoAcao';
import { BotaoDeEscolha, Conector, NumeroDoNo } from '../components/automacoes/NoDoFluxo';
import { GATILHO_INFO, CAMPOS_CANDIDATO } from '../utils/automacaoConstants';
import { useEquipe, useCargos, useKanban } from '../hooks/queries';
import { useFormularioAutomacao } from '../hooks/useFormularioAutomacao';

const SEM_DADOS = [];

export default function AutomacaoForm() {
  const { moduloId: moduloIdParam, id } = useParams();
  const form = useFormularioAutomacao(moduloIdParam, id);
  const { isEditing, moduloId, modulos, moduloSelecionado, vaga, gatilhos, acoesDaAutomacao, definicao, definicaoValida } = form;
  const { acoes } = acoesDaAutomacao;
  const [testando, setTestando] = useState(false);

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
  const contextoDasAcoes = { camposResponsavel, camposModulo, vaga, dicaVariaveis, cargos, equipe, moduloId, modulosDestino };

  if (form.carregandoInicial) {
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
        title={isEditing ? 'Editar automação' : 'Nova automação'}
      />

      {form.error && (
        <div className="mb-6 shrink-0" role="alert">
          <Alert variant="error">{form.error}</Alert>
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start w-full">
        {/* Painel de propriedades */}
        <PropriedadesDaAutomacao
          nome={form.nome}
          onNome={form.setNome}
          moduloId={moduloId}
          onModulo={form.trocarModulo}
          modulos={modulos}
          isEditing={isEditing}
          vaga={vaga}
          ativarAoSalvar={form.ativarAoSalvar}
          onAtivarAoSalvar={form.setAtivarAoSalvar}
        />

        {/* Construtor lógico */}
        <div className="flex flex-col gap-0 min-w-0">
          {/* Nó 1: Gatilho */}
          <Card>
            <div className="flex items-center gap-2.5 mb-4">
              <NumeroDoNo>1</NumeroDoNo>
              <h2 className="text-base font-semibold">Quando</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {form.gatilhosDisponiveis.map((valor) => (
                <BotaoDeEscolha
                  key={valor}
                  info={GATILHO_INFO[valor]}
                  ativo={gatilhos.includes(valor)}
                  onClick={() => form.alternarGatilho(valor)}
                  aria-pressed={gatilhos.includes(valor)}
                />
              ))}
            </div>
          </Card>

          <Conector />

          {/* Nó 2: Condições (opcional) */}
          <CartaoCondicoes
            temCondicao={form.temCondicao}
            onTemCondicao={form.setTemCondicao}
            logica={form.logica}
            onLogica={form.setLogica}
            regras={form.regras}
            onRegras={form.setRegras}
            campos={camposCondicao}
            opcoesEtapa={opcoesEtapa}
            onMudanca={form.garantirGatilhoDeMudanca}
            usaMudanca={form.usaMudanca}
            vaga={vaga}
          />

          <Conector />

          {/* Nó 3: Ações */}
          {acoes.map((acao, index) => (
            <CartaoAcao
              key={index}
              acao={acao}
              index={index}
              total={acoes.length}
              acoesDisponiveis={form.acoesDisponiveis}
              acoesDaAutomacao={acoesDaAutomacao}
              contexto={contextoDasAcoes}
            />
          ))}

          <div className="flex justify-center -mt-1 mb-6">
            <button
              type="button"
              onClick={acoesDaAutomacao.handleAddAcao}
              title="Adicionar outra ação"
              className="w-9 h-9 rounded-full border border-divider-strong bg-surface flex items-center justify-center text-light-text hover:border-primary hover:bg-primary-50 hover:text-primary transition-colors shadow-xs"
            >
              <span className="material-icons text-[20px]">add</span>
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
            <Button type="submit" disabled={!form.podeSalvar} loading={form.loading}>
              {form.loading ? 'Salvando...' : 'Salvar automação'}
            </Button>
          </div>
        </div>
      </form>

      <SimulacaoModal open={testando} onClose={() => setTestando(false)} moduloId={moduloId} definicao={definicao} vaga={vaga} />
    </Layout>
  );
}
