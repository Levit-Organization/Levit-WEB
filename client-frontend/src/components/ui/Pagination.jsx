import Button from './Button';

/** Rodapé de tabela: "Mostrando 1–25 de 120" + anterior/próxima. Some quando cabe numa página. */
export default function Pagination({ page, totalPages, from, to, total, onPageChange, label = 'registros' }) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-3 border-t border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-light-text tabular" aria-live="polite">
        Mostrando {from}–{to} de {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon="chevron_left"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <span className="text-xs text-light-text tabular px-1">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
        >
          Próxima
          <span className="material-icons text-[18px] leading-none" aria-hidden="true">chevron_right</span>
        </Button>
      </div>
    </nav>
  );
}
