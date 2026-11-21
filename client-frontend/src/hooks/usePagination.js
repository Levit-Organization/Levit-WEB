import { useMemo, useState } from 'react';

/** Paginação no cliente: a API devolve a lista completa, mas o DOM não precisa. */
export function usePagination(items, pageSize = 25) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Se a lista encolher (exclusão, filtro), a página atual nunca fica fora do intervalo.
  const current = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize]
  );

  return {
    page: current,
    setPage,
    totalPages,
    total,
    pageSize,
    pageItems,
    from: total === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, total),
  };
}
