import { memo, useState } from 'react';
import { coresDaFase } from '../ui';
import Button from '../ui/Button';
import KanbanCard from './KanbanCard';

// Renderizar centenas de cartões por coluna pesa no DOM: mostra em lotes.
const LOTE = 30;

function KanbanColumn({
  colId,
  coluna,
  indice,
  totalColunas,
  ativa,
  arrastavel,
  onOpenCard,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  etapas,
  onMover,
}) {
  const [limite, setLimite] = useState(LOTE);
  const cor = coresDaFase(indice, totalColunas);
  const candidatos = coluna.candidatos;
  const visiveis = candidatos.length > limite ? candidatos.slice(0, limite) : candidatos;
  const restantes = candidatos.length - visiveis.length;

  return (
    <section
      aria-label={`Etapa ${coluna.fase || colId}`}
      className="flex h-full max-h-full w-[300px] shrink-0 flex-col"
      onDragOver={(e) => onColumnDragOver(e, colId)}
      onDragLeave={(e) => {
        // Passar por cima de um cartão dispara dragleave na coluna: só conta quando sai de fato.
        if (!e.currentTarget.contains(e.relatedTarget)) onColumnDragLeave(colId);
      }}
      onDrop={(e) => onColumnDrop(e, colId)}
    >
      {/* Cabeçalho da etapa */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${cor.dot}`} aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft truncate">
            {coluna.fase || colId}
          </h2>
        </div>
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular ${cor.bg} ${cor.text}`}
        >
          {coluna.total ?? candidatos.length}
        </span>
      </div>

      {/* Cartões */}
      <div
        className={`flex-1 min-h-0 space-y-2 overflow-y-auto rounded-2xl p-2.5 transition-colors duration-150 ${
          ativa ? 'bg-primary-50 ring-2 ring-primary-300' : 'bg-sidebar'
        }`}
      >
        {visiveis.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            colId={colId}
            arrastavel={arrastavel}
            onOpen={onOpenCard}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            etapas={etapas}
            onMover={onMover}
          />
        ))}

        {restantes > 0 && (
          <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setLimite((l) => l + LOTE)}>
            Mostrar mais {Math.min(restantes, LOTE)} de {restantes}
          </Button>
        )}

        {candidatos.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-divider-strong px-4 text-center text-xs text-light-text">
            {arrastavel ? 'Arraste um candidato para cá' : 'Nenhum candidato nesta etapa'}
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(KanbanColumn);
