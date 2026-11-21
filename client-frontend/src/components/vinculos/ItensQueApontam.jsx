import { Link } from 'react-router-dom';
import { Skeleton } from '../ui';
import { useItensQueApontam } from '../../hooks/queries';
import { linkDoItem, tituloDoItem } from '../../utils/vinculos';

/**
 * O outro lado das ligações, dentro do item: os itens de outras tabelas que
 * apontam para ele (num cliente, os pedidos dele), com link para cada um.
 */
export default function ItensQueApontam({ moduloId, registroId, onNavegar }) {
  const ligados = useItensQueApontam(moduloId, registroId);
  const grupos = ligados.data ?? [];

  if (ligados.isLoading) return <Skeleton className="h-16 w-full" />;
  if (ligados.isError || grupos.length === 0) return null;

  return (
    <section aria-labelledby="itens-que-apontam" className="flex flex-col gap-4">
      <h3 id="itens-que-apontam" className="text-sm font-semibold text-ink">Ligados a este item</h3>
      {grupos.map((grupo) => (
        <div key={grupo.campo_id}>
          <p className="flex items-center gap-1.5 text-xs text-light-text mb-1.5">
            <span className="material-icons text-[16px] text-primary" aria-hidden="true">{grupo.modulo.icone || 'table_rows'}</span>
            <span>
              <strong className="font-semibold text-ink-soft">{grupo.modulo.nome}</strong> pela coluna “{grupo.campo_nome}” · {grupo.total}
            </span>
          </p>
          <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider">
            {grupo.itens.map((item) => (
              <li key={item.id}>
                <Link
                  to={linkDoItem(grupo.modulo.id, item.id)}
                  onClick={onNavegar}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-ink hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  <span className="truncate">{tituloDoItem(item.titulo)}</span>
                  <span className="material-icons text-[16px] text-light-text" aria-hidden="true">chevron_right</span>
                </Link>
              </li>
            ))}
          </ul>
          {grupo.total > grupo.itens.length && (
            <p className="mt-1.5 text-xs text-light-text">Mostrando os {grupo.itens.length} mais recentes.</p>
          )}
        </div>
      ))}
    </section>
  );
}
