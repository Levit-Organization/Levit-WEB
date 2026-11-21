import { Avatar, Badge, Button, Card, EmptyState, Pagination, Skeleton } from '../ui';
import { desde } from '../../utils/equipe';

/** Colaboradores em tabela (desktop), com a paginação dentro do card. */
export default function TabelaMembros({ loading, filtrando, filteredMembers, paginacao, onConvidar, onEditar, onExcluir }) {
  return (
    <Card padding="none" className="hidden md:block overflow-hidden">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[35%]" />
          <col className="w-[27%]" />
          <col className="w-[22%]" />
          <col className="w-[16%]" />
        </colgroup>

        <thead>
          <tr className="h-10 bg-surface border-b border-divider">
            <th scope="col" className="px-4 th-label text-left">
              Pessoa
            </th>
            <th scope="col" className="px-4 th-label text-left">
              Cargo
            </th>
            <th scope="col" className="px-4 th-label text-left">
              Na equipe desde
            </th>
            <th scope="col" className="px-4 th-label text-right">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            [1, 2, 3].map((linha) => (
              <tr key={linha} className="h-14 border-b last:border-b-0 border-divider">
                <td className="px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3.5 w-32 mb-1.5" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </td>
                <td className="px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
              </tr>
            ))
          ) : filteredMembers.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-4 py-12">
                <EmptyState
                  size="sm"
                  icon={filtrando ? 'search_off' : 'group_add'}
                  title={
                    filtrando
                      ? 'Ninguém encontrado com esse filtro'
                      : 'Só você na equipe'
                  }
                  description={
                    filtrando
                      ? 'Tente outro nome, e-mail ou cargo.'
                      : 'Convide quem trabalha com você. Cada pessoa entra com um cargo, e o cargo define o que ela enxerga.'
                  }
                  actionLabel={filtrando ? undefined : 'Convidar pessoa'}
                  actionIcon="person_add"
                  onAction={filtrando ? undefined : () => onConvidar()}
                />
              </td>
            </tr>
          ) : (
            paginacao.pageItems.map((member) => (
              <tr
                key={member.id}
                className="h-14 border-b last:border-b-0 border-divider hover:bg-background/60 transition-colors"
              >
                <td className="px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={member.nome} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink truncate">
                        {member.nome || '—'}
                      </p>
                      <p className="text-2xs text-light-text truncate">
                        {member.email || '—'}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4">
                  {member.cargo ? (
                    <Badge variant="primary" size="sm">{member.cargo}</Badge>
                  ) : (
                    <span className="text-xs text-light-text">Sem cargo</span>
                  )}
                </td>

                <td className="px-4">
                  <span className="text-xs text-ink-soft tabular">{desde(member.criado_em) || '—'}</span>
                </td>

                <td className="px-4">
                  <div className="flex justify-end gap-1">
                    {onEditar && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEditar(member)}
                        title="Editar colaborador"
                        aria-label={`Editar ${member.nome || 'colaborador'}`}
                        icon="edit"
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onExcluir(member)}
                      title="Excluir colaborador"
                      aria-label={`Excluir ${member.nome || 'colaborador'}`}
                      icon="delete_outline"
                      className="hover:bg-danger-bg hover:text-danger"
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && <Pagination {...paginacao} onPageChange={paginacao.setPage} label="colaboradores" />}
    </Card>
  );
}
