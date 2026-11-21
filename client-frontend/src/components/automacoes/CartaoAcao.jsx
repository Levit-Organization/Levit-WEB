import { Card, Input } from '../ui';
import { ACAO_INFO } from '../../utils/automacaoConstants';
import { AcaoAtualizarCampo, AcaoCriarRegistro } from './AcoesDeDados';
import ConfigEmail from './ConfigEmail';
import ConfigNotificacao from './ConfigNotificacao';
import { BotaoDeEscolha, Conector, NumeroDoNo } from './NoDoFluxo';

/**
 * Um passo "Então" do construtor: escolha do tipo de ação e a configuração dele.
 * `acoesDaAutomacao` é o retorno de useAcoesDaAutomacao; `contexto` traz o que
 * as configurações precisam da tabela de origem (colunas, equipe, cargos...).
 */
export default function CartaoAcao({ acao, index, total, acoesDisponiveis, acoesDaAutomacao, contexto }) {
  const { handleAcaoTipoChange, handleAcaoConfigChange, mesclarConfiguracao, handleRemoveAcao } = acoesDaAutomacao;
  const { camposResponsavel, camposModulo, vaga, dicaVariaveis, cargos, equipe, moduloId, modulosDestino } = contexto;
  const onCampo = (campo, valor) => handleAcaoConfigChange(index, campo, valor);
  const onMesclar = (parcial) => mesclarConfiguracao(index, parcial);

  return (
    <div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <NumeroDoNo>{index === 0 ? 3 : `3.${index + 1}`}</NumeroDoNo>
            <h2 className="text-base font-semibold">Então</h2>
          </div>
          {total > 1 && (
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
          {acoesDisponiveis.map((valor) => (
            <BotaoDeEscolha
              key={valor}
              info={ACAO_INFO[valor]}
              ativo={acao.tipo === valor}
              onClick={() => handleAcaoTipoChange(index, valor)}
            />
          ))}
        </div>

        {acao.tipo === 'enviar_email' && (
          <ConfigEmail
            configuracao={acao.configuracao}
            camposResponsavel={camposResponsavel}
            camposModulo={camposModulo}
            vaga={vaga}
            dicaVariaveis={dicaVariaveis}
            onCampo={onCampo}
            onMesclar={onMesclar}
          />
        )}

        {acao.tipo === 'webhook' && (
          <div className="pt-4 border-t border-divider">
            <Input
              label="Endereço do outro sistema"
              type="url"
              value={acao.configuracao.url || ''}
              onChange={(e) => onCampo('url', e.target.value)}
              required
              placeholder="https://exemplo.com/webhook"
              hint="O Levit envia os dados do item para este endereço (webhook)."
            />
          </div>
        )}

        {acao.tipo === 'atualizar_campo' && (
          <AcaoAtualizarCampo configuracao={acao.configuracao} campos={camposModulo} onChange={onMesclar} />
        )}

        {acao.tipo === 'criar_registro' && (
          <AcaoCriarRegistro
            configuracao={acao.configuracao}
            moduloOrigemId={moduloId}
            camposOrigem={camposModulo}
            modulos={modulosDestino}
            onChange={onMesclar}
          />
        )}

        {acao.tipo === 'notificacao' && (
          <ConfigNotificacao
            configuracao={acao.configuracao}
            camposResponsavel={camposResponsavel}
            cargos={cargos}
            equipe={equipe}
            dicaVariaveis={dicaVariaveis}
            onCampo={onCampo}
          />
        )}
      </Card>

      <Conector />
    </div>
  );
}
