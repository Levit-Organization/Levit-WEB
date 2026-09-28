/**
 * src/components/kanban/KanbanColuna.jsx
 *
 * Coluna memoizada com paginação independente por fase.
 *
 * Correções aplicadas (vs. versão anterior):
 *
 *  1. Handlers de DnD criados INTERNAMENTE com useCallback([colId, ...])
 *     → handlers estáveis por coluna, `areEqual` agora funciona de verdade.
 *     → o pai passa `onScrollDragOver`, `onSetDragOverColumn`, `onDrop`
 *       (primitivos estáveis) em vez de closures inline.
 *
 *  2. Indicador de posição de inserção:
 *     → `dropIndicatorIdx` rastreado durante dragover sobre a área de cards.
 *     → Linha azul renderizada entre os cards na posição exata do cursor.
 *     → Reset ao sair da coluna ou soltar.
 */
import { memo, useState, useCallback, useRef } from 'react';
import CandidatoCard from './CandidatoCard';

const PAGE_SIZE = 25;

// ── Linha indicadora de posição de drop ──────────────────────────────────────
function DropLine() {
  return (
    <div className="relative py-0.5 shrink-0 pointer-events-none">
      <div className="h-0.5 w-full rounded-full bg-primary" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-surface -ml-1" />
    </div>
  );
}

function KanbanColuna({
  colId,
  colData,
  cor,
  ativa,
  campos,
  // Primitivos estáveis passados pelo pai (useCallback / setState do React)
  onScrollDragOver,      // handleDragOverWithScroll — useCallback sem deps
  onSetDragOverColumn,   // setDragOverColumn         — setState React (estável)
  onDrop,                // handleDrop(e, colId)       — useCallback([vagaSelecionada, moverCandidato])
  onDragStart,           // useCallback estável
  onCardClick,           // useCallback estável
}) {
  const [limite, setLimite] = useState(PAGE_SIZE);
  const [dropIndicatorIdx, setDropIndicatorIdx] = useState(null);
  const cardsAreaRef = useRef(null);

  const todos    = colData.candidatos ?? [];
  const visiveis = todos.slice(0, limite);
  const restantes = todos.length - visiveis.length;

  const carregarMais = useCallback(() => setLimite((l) => l + PAGE_SIZE), []);

  // ── Handlers estáveis por coluna ──────────────────────────────────────────
  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      onScrollDragOver(e);
      // Sinaliza que esta coluna é a ativa — usando setter funcional para
      // não precisar de `dragOverColumn` como dependência
      onSetDragOverColumn((cur) => (cur === colId ? cur : colId));

      // Calcula índice de inserção pelo Y do cursor relativo aos cards
      const area = cardsAreaRef.current;
      if (!area) return;
      const cards = Array.from(area.querySelectorAll('[data-card-id]'));
      let idx = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          idx = i;
          break;
        }
      }
      setDropIndicatorIdx(idx);
    },
    [colId, onScrollDragOver, onSetDragOverColumn],
  );

  const handleDragLeave = useCallback(
    (e) => {
      // Ignora eventos de filhos (bubbling): só processa quando o cursor
      // realmente saiu da coluna inteira
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setDropIndicatorIdx(null);
      onSetDragOverColumn((c) => (c === colId ? null : c));
    },
    [colId, onSetDragOverColumn],
  );

  const handleDrop = useCallback(
    (e) => {
      setDropIndicatorIdx(null);
      onDrop(e, colId);
    },
    [colId, onDrop],
  );

  return (
    <div
      className="flex h-full max-h-full w-[300px] shrink-0 flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Cabeçalho ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${cor.dot}`} />
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft truncate">
            {colData.fase || colId}
          </h2>
        </div>
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular ${cor.bg} ${cor.text}`}
        >
          {colData.total ?? todos.length}
        </span>
      </div>

      {/* ── Área de cards ────────────────────────────────────────────────────── */}
      <div
        ref={cardsAreaRef}
        className={`flex-1 min-h-0 flex flex-col overflow-y-auto rounded-xl p-2 gap-2.5 transition-colors duration-150 ${
          ativa ? 'bg-primary-100 ring-2 ring-primary-200' : 'bg-sidebar/60'
        }`}
      >
        {/* Indicador no topo (inserir antes do primeiro card) */}
        {ativa && dropIndicatorIdx === 0 && <DropLine />}

        {visiveis.map((item, idx) => (
          <div key={item.id}>
            <CandidatoCard
              item={item}
              colId={colId}
              faseNome={colData.fase || colId}
              cor={cor}
              campos={campos}
              onDragStart={onDragStart}
              onClick={onCardClick}
              data-card-id={item.id}
            />
            {/* Indicador entre cards */}
            {ativa && dropIndicatorIdx === idx + 1 && <DropLine />}
          </div>
        ))}

        {/* Indicador ao final quando há mais pages não carregadas */}
        {ativa && dropIndicatorIdx === visiveis.length && restantes > 0 && <DropLine />}

        {/* Placeholder vazio */}
        {todos.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-divider-strong px-4 text-center text-xs text-light-text">
            {ativa ? 'Soltar aqui' : 'Arraste um candidato para cá'}
          </div>
        )}

        {/* Botão "Carregar mais" — sticky no rodapé da área scrollável */}
        {restantes > 0 && (
          <button
            type="button"
            onClick={carregarMais}
            className="sticky bottom-0 mt-auto w-full shrink-0 rounded-lg border border-divider bg-surface/90 backdrop-blur-sm py-2 text-xs font-medium text-light-text transition-colors hover:bg-background hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            + {restantes > PAGE_SIZE ? PAGE_SIZE : restantes} de {restantes} restantes
          </button>
        )}
      </div>
    </div>
  );
}

// Compara apenas os primitivos estáveis passados pelo pai.
// Os handlers internos (handleDragOver etc.) são criados via useCallback
// dentro do componente — não entram na comparação.
function areEqual(prev, next) {
  return (
    prev.colId              === next.colId              &&
    prev.colData.candidatos === next.colData.candidatos &&
    prev.colData.total      === next.colData.total      &&
    prev.ativa              === next.ativa              &&
    prev.onScrollDragOver   === next.onScrollDragOver   &&
    prev.onSetDragOverColumn === next.onSetDragOverColumn &&
    prev.onDrop             === next.onDrop             &&
    prev.onDragStart        === next.onDragStart        &&
    prev.onCardClick        === next.onCardClick
  );
}

export default memo(KanbanColuna, areEqual);
