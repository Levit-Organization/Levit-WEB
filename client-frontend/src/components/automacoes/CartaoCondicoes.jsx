import { Card, Toggle } from '../ui';
import CondicoesEditor from './CondicoesEditor';
import { NumeroDoNo } from './NoDoFluxo';
import { novaRegra } from '../../utils/automacaoConstants';

/** Passo "Se" (opcional): liga as condições e explica quando as de mudança valem. */
export default function CartaoCondicoes({
  temCondicao,
  onTemCondicao,
  logica,
  onLogica,
  regras,
  onRegras,
  campos,
  opcoesEtapa,
  onMudanca,
  usaMudanca,
  vaga,
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <NumeroDoNo>2</NumeroDoNo>
          <h2 className="text-base font-semibold">Se</h2>
        </div>
        <Toggle
          ariaLabel="Usar condições"
          checked={temCondicao}
          onChange={(ligado) => {
            onTemCondicao(ligado);
            if (ligado && regras.length === 0) onRegras([novaRegra()]);
          }}
        />
      </div>

      {temCondicao ? (
        <CondicoesEditor
          logica={logica}
          regras={regras}
          campos={campos}
          opcoesEtapa={opcoesEtapa}
          onChangeLogica={onLogica}
          onChangeRegras={onRegras}
          onMudanca={onMudanca}
        />
      ) : (
        <p className="text-xs text-light-text">Opcional. Sem condição, roda sempre.</p>
      )}
      {usaMudanca && (
        <p className="text-xs text-light-text mt-3">
          {vaga ? (
            <>Condições de mudança só valem em <strong>Mudou de etapa</strong>.</>
          ) : (
            <>Condições de mudança só valem quando o item é <strong>atualizado</strong>.</>
          )}
        </p>
      )}
    </Card>
  );
}
