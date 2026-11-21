import { Card, EmptyState, ErrorState, Skeleton } from '../ui';
import { mensagemDeErro } from '../../lib/queryClient';
import CartaoRelatorio from './CartaoRelatorio';

/** Seção "Agendados": carregando, erro, vazio ou os cartões dos relatórios. */
export default function RelatoriosAgendados({ relatorios, nomes, onNovo, onEditar }) {
  return (
    <section>
      <h2 className="text-base font-bold text-ink mb-3.5">Agendados</h2>
      {relatorios.isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2].map((n) => <Skeleton key={n} className="h-40 rounded-2xl" />)}
        </div>
      ) : relatorios.isError ? (
        <Card>
          <ErrorState description={mensagemDeErro(relatorios.error, 'Erro ao carregar os relatórios.')} onRetry={() => relatorios.refetch()} />
        </Card>
      ) : relatorios.data.length === 0 ? (
        <Card padding="lg" className="py-10">
          <EmptyState
            icon="event_repeat"
            title="Nenhum relatório agendado"
            description="Escolha a frequência, quem recebe e o que entra no PDF. Ele chega por e-mail, com a comparação com o período anterior."
            actionLabel="Agendar o primeiro"
            actionIcon="add"
            onAction={onNovo}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {relatorios.data.map((r) => (
            <CartaoRelatorio key={r.id} relatorio={r} nomes={nomes} onEditar={onEditar} />
          ))}
        </div>
      )}
    </section>
  );
}
