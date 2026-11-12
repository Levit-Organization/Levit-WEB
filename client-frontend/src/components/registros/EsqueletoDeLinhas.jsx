import { Card, Skeleton } from '../ui';

/** Cinco linhas cinzas enquanto a tabela carrega. `larguraMaxima`: classe max-w-* da barra. */
export default function EsqueletoDeLinhas({ larguraMaxima, ...rest }) {
  return (
    <Card padding="none" {...rest}>
      {[1, 2, 3, 4, 5].map((linha) => (
        <div key={linha} className="px-4 py-4 border-b border-divider last:border-0">
          <Skeleton className={`h-4 w-full ${larguraMaxima}`} />
        </div>
      ))}
    </Card>
  );
}
