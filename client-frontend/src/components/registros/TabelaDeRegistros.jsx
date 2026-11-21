import { Button, Card, Pagination } from '../ui';
import CelulaDoRegistro from './CelulaDoRegistro';

/**
 * Visão em lista: cabeçalhos que ordenam, uma linha por item com editar/excluir
 * e a paginação no rodapé. `paginacao` é o retorno de usePagination.
 */
export default function TabelaDeRegistros({
  colunas,
  campos,
  titulosLigados,
  ordem,
  onOrdenar,
  paginacao,
  buscando,
  onEditar,
  onExcluir,
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className={`overflow-x-auto transition-opacity duration-150 ${buscando ? 'opacity-60' : ''}`} aria-busy={buscando}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider bg-background">
              {colunas.map((coluna) => {
                const ativa = ordem?.key === coluna.key;
                return (
                  <th
                    key={coluna.key}
                    scope="col"
                    aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="th-label text-left px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOrdenar(coluna.key)}
                      className="inline-flex items-center gap-1 hover:text-ink transition-colors rounded"
                    >
                      {coluna.titulo}
                      <span
                        className={`material-icons text-[14px] ${ativa ? 'text-primary' : 'text-faint'}`}
                        aria-hidden="true"
                      >
                        {ativa ? (ordem.direcao === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="th-label text-right px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginacao.pageItems.map((registro) => (
              <tr key={registro.id} className="border-b border-divider last:border-0 hover:bg-background transition-colors">
                {colunas.map((coluna) => (
                  <CelulaDoRegistro
                    key={coluna.key}
                    registro={registro}
                    coluna={coluna}
                    campos={campos}
                    titulosLigados={titulosLigados}
                  />
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      icon="edit"
                      onClick={() => onEditar(registro)}
                      title="Editar"
                      aria-label="Editar item"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      icon="delete_outline"
                      onClick={() => onExcluir(registro)}
                      title="Excluir"
                      aria-label="Excluir item"
                      className="hover:bg-danger-bg hover:text-danger"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...paginacao} onPageChange={paginacao.setPage} />
    </Card>
  );
}
