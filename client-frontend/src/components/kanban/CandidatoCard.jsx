/**
 * src/components/kanban/CandidatoCard.jsx
 *
 * Componente puro memoizado. Comparador custom re-renderiza SOMENTE quando
 * id, fase_atual_id ou atualizado_em mudam.
 *
 * Correções aplicadas:
 *  - Opacidade no card durante drag (sem setState → zero re-render extra)
 *  - onDragEnd limpa o estilo imediatamente, mesmo se o drop for em outra aba
 */
import { memo, useCallback, useRef } from 'react';
import { Avatar, Badge, tempoRelativo, estaParado } from '../ui';

function CandidatoCard({ item, colId, faseNome, cor, campos, onDragStart, onClick }) {
  const articleRef = useRef(null);

  const desde  = tempoRelativo(item.atualizado_em || item.criado_em);
  const parado = estaParado(item.atualizado_em || item.criado_em);

  // ── Drag: aplica opacidade APÓS o browser capturar a drag-image ────────────
  // requestAnimationFrame garante que o fantasma já foi tirado antes de escurecer
  const handleDragStart = useCallback(
    (e) => {
      onDragStart(e, item, colId);
      const el = articleRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.style.opacity = '0.4';
          el.style.transform = 'scale(0.98)';
        });
      }
    },
    [onDragStart, item, colId],
  );

  // ── Drag: restaura estilo ao terminar (drop ou cancelamento) ──────────────
  const handleDragEnd = useCallback(() => {
    const el = articleRef.current;
    if (el) {
      el.style.opacity = '';
      el.style.transform = '';
    }
  }, []);

  const handleClick = useCallback(
    () => onClick({ ...item, colId, faseNome, cor }),
    [onClick, item, colId, faseNome, cor],
  );

  return (
    <article
      ref={articleRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className="group cursor-grab rounded-lg bg-surface border border-divider p-3.5 shadow-xs transition-[box-shadow,border-color,transform] duration-150 ease-out-quart hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center gap-3">
        <Avatar name={item.nome} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
            {item.nome || 'Sem nome'}
          </h3>
          <p className="text-xs text-light-text truncate">
            {item.cargo_desejado || item.vaga || 'Sem cargo informado'}
          </p>
        </div>
      </div>

      {campos && campos.length > 0 && item.dados && Object.keys(item.dados).length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {campos.filter(c => item.dados[c.id] !== undefined && item.dados[c.id] !== '').slice(0, 2).map(campo => (
            <div key={campo.id} className="flex justify-between items-center text-xs">
              <span className="text-light-text truncate max-w-[50%]">{campo.nome}:</span>
              <span className="text-ink font-medium truncate max-w-[50%] text-right">{String(item.dados[campo.id])}</span>
            </div>
          ))}
        </div>
      )}

      {(desde || parado) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-divider pt-2.5">
          <span className="text-2xs text-light-text truncate">
            {desde ? `Nesta etapa ${desde}` : ''}
          </span>
          {parado && (
            <Badge variant="warning" size="sm" dot>
              Parado
            </Badge>
          )}
        </div>
      )}
    </article>
  );
}

function areEqual(prev, next) {
  return (
    prev.item.id            === next.item.id            &&
    prev.item.fase_atual_id === next.item.fase_atual_id &&
    prev.item.atualizado_em === next.item.atualizado_em &&
    prev.item.dados         === next.item.dados         &&
    prev.colId              === next.colId              &&
    prev.onDragStart        === next.onDragStart        &&
    prev.onClick            === next.onClick
  );
}

export default memo(CandidatoCard, areEqual);
