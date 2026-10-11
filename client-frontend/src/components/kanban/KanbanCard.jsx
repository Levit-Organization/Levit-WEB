import { memo } from 'react';
import { Avatar, Badge, tempoRelativo, estaParado } from '../ui';

/**
 * Cartão de candidato. Mesma estrutura do cartão das tabelas (QuadroItens):
 * área que abre o perfil, detalhes e, no rodapé, o seletor de etapa, que move
 * pelo teclado e no celular, onde arrastar não funciona.
 */
function KanbanCard({ item, colId, arrastavel, etapas = [], onOpen, onDragStart, onDragEnd, onMover }) {
  const referencia = item.atualizado_em || item.criado_em;
  const desde = tempoRelativo(referencia);
  const parado = estaParado(referencia);
  const nome = item.nome || 'Sem nome';

  return (
    <div
      draggable={arrastavel}
      onDragStart={arrastavel ? (e) => onDragStart(e, item, colId) : undefined}
      onDragEnd={arrastavel ? onDragEnd : undefined}
      className={`group relative rounded-xl border border-divider bg-surface shadow-xs transition-[box-shadow,border-color] hover:shadow-sm hover:border-divider-strong ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onOpen(item.id, colId)}
        className={`w-full text-left px-3.5 pt-3 ${arrastavel ? 'pb-2 rounded-t-xl' : 'pb-3 rounded-xl'} focus-visible:outline-2 focus-visible:outline-primary`}
      >
        <span className="flex items-center gap-2.5">
          <Avatar name={item.nome} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink truncate">{nome}</span>
            <span className="block text-xs text-light-text truncate">
              {item.cargo_desejado || item.vaga || 'Sem cargo informado'}
            </span>
          </span>
        </span>
        {(desde || parado) && (
          <span className="mt-2 flex items-center justify-between gap-2">
            <span className="text-2xs text-light-text truncate">{desde ? `Nesta etapa ${desde}` : ''}</span>
            {parado && (
              <Badge variant="warning" size="sm" dot>
                Parado
              </Badge>
            )}
          </span>
        )}
      </button>

      {arrastavel && etapas.length > 1 && (
        <div className="px-3.5 pb-3">
          <label className="sr-only" htmlFor={`etapa-${item.id}`}>{`Etapa de ${nome}`}</label>
          <select
            id={`etapa-${item.id}`}
            value={colId}
            onChange={(e) => onMover(item, colId, e.target.value)}
            className="w-full h-8 rounded-md border border-divider bg-background px-2 text-xs text-ink-soft focus-visible:outline-2 focus-visible:outline-primary"
          >
            {etapas.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>{etapa.nome}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default memo(KanbanCard);
