import { useState, useRef, useCallback, useEffect } from 'react';

const BORDA_AUTOSCROLL = 100; // px da borda que dispara o auto-scroll durante o arraste
const VELOCIDADE_AUTOSCROLL = 18;

/**
 * Arrastar e soltar candidatos entre colunas, com auto-scroll horizontal perto
 * das bordas. O item arrastado fica em `dragRef` (vem de `useFunilDaVaga`):
 * iniciar o arraste não precisa re-renderizar nada.
 */
export function useArrasteKanban({ dragRef, moverCandidato }) {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const scrollContainerRef = useRef(null);
  const velocidadeScroll = useRef(0);
  const rafScroll = useRef(null);

  const pararAutoScroll = useCallback(() => {
    velocidadeScroll.current = 0;
    if (rafScroll.current) {
      cancelAnimationFrame(rafScroll.current);
      rafScroll.current = null;
    }
  }, []);

  useEffect(() => pararAutoScroll, [pararAutoScroll]);

  // Auto-scroll ao arrastar perto das bordas: um laço por frame, não um salto por evento.
  const handleContainerDragOver = useCallback(
    (e) => {
      const container = scrollContainerRef.current;
      if (!container || !dragRef.current) return;

      const rect = container.getBoundingClientRect();
      if (e.clientX - rect.left < BORDA_AUTOSCROLL) velocidadeScroll.current = -VELOCIDADE_AUTOSCROLL;
      else if (rect.right - e.clientX < BORDA_AUTOSCROLL) velocidadeScroll.current = VELOCIDADE_AUTOSCROLL;
      else velocidadeScroll.current = 0;

      if (velocidadeScroll.current !== 0 && !rafScroll.current) {
        const passo = () => {
          const el = scrollContainerRef.current;
          if (!el || velocidadeScroll.current === 0) {
            rafScroll.current = null;
            return;
          }
          el.scrollLeft += velocidadeScroll.current;
          rafScroll.current = requestAnimationFrame(passo);
        };
        rafScroll.current = requestAnimationFrame(passo);
      }
    },
    [dragRef]
  );

  const handleCardDragStart = useCallback((e, item, sourceColumn) => {
    dragRef.current = { item, sourceColumn };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.currentTarget.classList.add('opacity-50');
  }, [dragRef]);

  const finalizarArraste = useCallback(() => {
    dragRef.current = null;
    pararAutoScroll();
    setDragOverColumn(null);
  }, [dragRef, pararAutoScroll]);

  const handleCardDragEnd = useCallback(
    (e) => {
      e.currentTarget.classList.remove('opacity-50');
      finalizarArraste();
    },
    [finalizarArraste]
  );

  const handleColumnDragOver = useCallback(
    (e, colId) => {
      // Sem preventDefault o navegador mostra o cursor de "proibido".
      if (!dragRef.current) return;
      e.preventDefault();
      setDragOverColumn((atual) => (atual === colId ? atual : colId));
    },
    [dragRef]
  );

  const handleColumnDragLeave = useCallback((colId) => {
    setDragOverColumn((atual) => (atual === colId ? null : atual));
  }, []);

  const handleColumnDrop = useCallback(
    (e, colunaDestino) => {
      e.preventDefault();
      const arraste = dragRef.current;
      finalizarArraste();
      if (!arraste) return;
      moverCandidato(arraste.item, arraste.sourceColumn, colunaDestino);
    },
    [dragRef, finalizarArraste, moverCandidato]
  );

  return {
    dragOverColumn,
    scrollContainerRef,
    handleContainerDragOver,
    handleCardDragStart,
    handleCardDragEnd,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
  };
}
