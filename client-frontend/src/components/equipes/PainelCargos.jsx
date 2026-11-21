import { Button, Card, EmptyState, Skeleton } from '../ui';
import CartaoCargo from './CartaoCargo';

/** Aba "Cargos e permissões": grade de cargos, com esqueleto e estado vazio. */
export default function PainelCargos({ roles, loading, onCriar, onAcessoPorTabela, onEditar, onExcluir }) {
  return (
    <section id="painel-roles" role="tabpanel" aria-labelledby="aba-roles">
      <div className="flex items-center justify-end mb-5 gap-4">
        <Button variant="secondary" size="sm" icon="add" onClick={() => onCriar()}>
          Criar cargo
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((c) => (
            <Card key={c} padding="sm" className="min-h-23">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16 mb-4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Card className="py-10">
          <EmptyState
            icon="badge"
            title="Nenhum cargo criado"
            description="Cargo é o que define o acesso: quem é de vendas vê os clientes, quem é do financeiro vê as contas. Cada pessoa da equipe recebe um."
            actionLabel="Criar cargo"
            actionIcon="add"
            onAction={() => onCriar()}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {roles.map((role) => (
            <CartaoCargo
              key={role.id}
              role={role}
              onAcessoPorTabela={onAcessoPorTabela}
              onEditar={onEditar}
              onExcluir={onExcluir}
            />
          ))}
        </div>
      )}
    </section>
  );
}
