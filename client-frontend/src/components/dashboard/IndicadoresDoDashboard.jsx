import { Badge, Card, Skeleton, StatCard } from '../ui';
import { plural } from '../../utils/dashboard';

/** Três indicadores da operação inteira: tabelas, automações e equipe. */
export default function IndicadoresDoDashboard({ carregando, tabelas, totalItens, resumoAutomacoes, equipe }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 shrink-0" aria-label="Resumo">
      {carregando ? (
        [1, 2, 3].map((s) => (
          <Card key={s} padding="md" className="flex items-start gap-3.5">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-7 w-14 mb-2" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </Card>
        ))
      ) : (
        <>
          <StatCard
            icon="table_chart"
            value={tabelas.length}
            label={tabelas.length === 1 ? 'Tabela' : 'Tabelas'}
            hint={plural(totalItens, 'item guardado', 'itens guardados')}
            variant="primary"
          />
          <StatCard
            icon="bolt"
            value={resumoAutomacoes.ativas}
            label={resumoAutomacoes.ativas === 1 ? 'Automação ligada' : 'Automações ligadas'}
            hint={`${plural(resumoAutomacoes.execucoes, 'execução', 'execuções')} nesta semana`}
            variant="info"
            badge={
              resumoAutomacoes.falhas > 0 ? (
                <Badge variant="danger" size="sm">{plural(resumoAutomacoes.falhas, 'falha', 'falhas')}</Badge>
              ) : null
            }
          />
          <StatCard
            icon="groups"
            value={equipe.length}
            label={equipe.length === 1 ? 'Pessoa na equipe' : 'Pessoas na equipe'}
            variant="success"
          />
        </>
      )}
    </section>
  );
}
