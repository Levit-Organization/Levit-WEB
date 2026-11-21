import { Link } from 'react-router-dom';
import { Card, Skeleton, coresDaFase } from '../ui';
import { plural } from '../../utils/dashboard';
import SecaoTitulo from './SecaoTitulo';

/** Barra proporcional e legenda com os candidatos em cada etapa da vaga. */
function FunilDaVaga({ fases }) {
  return (
    <>
      <div className="flex gap-1 mt-3" aria-hidden="true">
        {fases.map(([faseId, fase], indice) => {
          const qtd = fase.candidatos?.length || 0;
          return (
            <div
              key={faseId}
              className={`h-1.5 rounded-full ${qtd ? coresDaFase(indice, fases.length).dot : 'bg-divider'}`}
              style={{ flex: Math.max(qtd, 0.35) }}
            />
          );
        })}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {fases.map(([faseId, fase], indice) => (
          <li key={faseId} className="flex items-center gap-1.5 text-xs text-light-text">
            <span className={`h-1.5 w-1.5 rounded-full ${coresDaFase(indice, fases.length).dot}`} aria-hidden="true" />
            {fase.fase}: <strong className="text-ink tabular">{fase.candidatos?.length || 0}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Resumo da vaga aberta mais recente (o quadro completo fica em Recrutamento). */
export default function ResumoRecrutamento({ vagaDestaque, vagas, kanbanQuery, vagaIndisponivel, resumoVaga }) {
  const { fasesDaVaga, totalCandidatosVaga } = resumoVaga;

  return (
    <Card className="min-w-0">
      <SecaoTitulo
        acao={
          <Link to="/recrutamento" className="text-sm text-primary font-semibold hover:underline shrink-0">
            {vagaDestaque ? 'Abrir quadro' : 'Abrir vaga'}
          </Link>
        }
      >
        Recrutamento
      </SecaoTitulo>
      {!vagaDestaque ? (
        <p className="text-sm text-light-text">
          Nenhuma vaga aberta. Quando abrir uma, os candidatos se inscrevem por um link e aparecem num quadro de etapas.
        </p>
      ) : vagaIndisponivel ? (
        <p className="text-sm text-light-text">Seu cargo não tem acesso a esta vaga.</p>
      ) : kanbanQuery.isLoading ? (
        <Skeleton className="h-12 w-full rounded-lg" />
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{vagaDestaque.nome}</strong> · {plural(totalCandidatosVaga, 'candidato', 'candidatos')}
            {vagas.length > 1 ? ` · ${plural(vagas.length, 'vaga aberta', 'vagas abertas')}` : ''}
          </p>
          {totalCandidatosVaga > 0 && <FunilDaVaga fases={fasesDaVaga} />}
        </>
      )}
    </Card>
  );
}
