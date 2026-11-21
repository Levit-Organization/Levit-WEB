import { Badge, Button, Card } from '../ui';

/** Cartão de um cargo: pessoas, acesso total ou as primeiras permissões, e ações. */
export default function CartaoCargo({ role, onAcessoPorTabela, onEditar, onExcluir }) {
  return (
    <Card
      as="article"
      padding="none"
      className="relative min-h-23 px-5 py-4 hover:border-divider-strong transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink leading-tight truncate">
            {role.nome || '—'}
          </h3>
          {typeof role.usuarios === 'number' && (
            <p className="mt-0.5 text-2xs text-light-text">
              {role.usuarios} {role.usuarios === 1 ? 'pessoa' : 'pessoas'}
            </p>
          )}
          {role.acesso_total && (
            <Badge variant="warning" size="sm" icon="key" className="mt-1.5">
              Acesso total
            </Badge>
          )}
        </div>

        <div className="flex gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            icon="tune"
            onClick={() => onAcessoPorTabela(role)}
            title="Acesso por tabela"
            aria-label={`Acesso por tabela do cargo ${role.nome}`}
          />
          {(onEditar || onExcluir) && (
            <>
            {onEditar && (
              <Button
                variant="ghost"
                size="icon-sm"
                icon="edit"
                onClick={() => onEditar(role)}
                title="Editar cargo"
                aria-label={`Editar cargo ${role.nome}`}
              />
            )}
            {onExcluir && (
              <Button
                variant="ghost"
                size="icon-sm"
                icon="delete_outline"
                onClick={() => onExcluir(role)}
                title="Excluir cargo"
                aria-label={`Excluir cargo ${role.nome}`}
                className="hover:bg-danger-bg hover:text-danger"
              />
            )}
            </>
          )}
        </div>
      </div>

      {/* Acesso total já diz tudo; senão, as 3 primeiras permissões e "+n". */}
      {!role.acesso_total && role.permissoes?.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {role.permissoes.slice(0, 3).map((permission) => (
            <Badge key={permission} variant="default" size="sm">{permission}</Badge>
          ))}
          {role.permissoes.length > 3 && (
            <span className="text-2xs text-light-text" title={role.permissoes.slice(3).join(', ')}>
              +{role.permissoes.length - 3}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
