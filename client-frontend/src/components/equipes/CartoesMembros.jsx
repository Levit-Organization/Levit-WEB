import { Avatar, Badge, Button, Card, EmptyState, Pagination, Skeleton } from '../ui';
import { desde } from '../../utils/equipe';

/** Colaboradores em cartões (celular), com a paginação embaixo da lista. */
export default function CartoesMembros({ loading, filtrando, filteredMembers, paginacao, onEditar, onExcluir }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {loading ? (
          [1, 2].map((c) => (
            <Card key={c} padding="sm" className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-32 mb-1.5" />
                <Skeleton className="h-3 w-40" />
              </div>
            </Card>
          ))
        ) : filteredMembers.length === 0 ? (
          <Card className="py-8">
            <EmptyState
              size="sm"
              icon={filtrando ? 'search_off' : 'group_add'}
              title={filtrando ? 'Ninguém com esse filtro' : 'Só você na equipe'}
              description={
                filtrando
                  ? 'Tente outro nome, e-mail ou cargo.'
                  : 'Convide quem trabalha com você.'
              }
            />
          </Card>
        ) : (
          paginacao.pageItems.map((member) => (
            <Card key={member.id} as="article" padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.nome} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-ink truncate">
                      {member.nome || '—'}
                    </p>
                    <p className="text-xs text-light-text truncate">
                      {member.email || '—'}
                    </p>
                  </div>
                </div>

                {desde(member.criado_em) && (
                  <span className="text-2xs text-light-text tabular shrink-0">desde {desde(member.criado_em)}</span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                {member.cargo ? (
                  <Badge variant="primary" size="sm">{member.cargo}</Badge>
                ) : (
                  <span />
                )}

                <div className="flex gap-1">
                  {onEditar && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEditar(member)}
                      icon="edit"
                      title="Editar colaborador"
                      aria-label={`Editar ${member.nome || 'colaborador'}`}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onExcluir(member)}
                    icon="delete_outline"
                    title="Excluir colaborador"
                    aria-label={`Excluir ${member.nome || 'colaborador'}`}
                    className="hover:bg-danger-bg hover:text-danger"
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* No desktop a paginação fica dentro do card da tabela; aqui, embaixo da lista. */}
      {!loading && (
        <div className="mt-3 md:hidden">
          <Pagination {...paginacao} onPageChange={paginacao.setPage} label="colaboradores" />
        </div>
      )}
    </>
  );
}
