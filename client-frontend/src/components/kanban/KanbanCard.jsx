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
        className="w-full text-left px-3.5 pt-3 pb-3 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex items-center gap-2.5">
          <Avatar name={item.nome} size="md" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-semibold text-ink truncate">{nome}</span>
              {item.tem_curriculo && (
                <span className="material-icons text-[14px] text-light-text shrink-0" role="img" title="Enviou currículo" aria-label="Enviou currículo">
                  attach_file
                </span>
              )}
            </span>
            <span className="block text-xs text-light-text truncate">{item.vaga || item.email}</span>
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

      {/* Com mouse, o seletor só abre no hover ou no foco (Tab chega nele mesmo
          recolhido); no toque fica sempre à mostra, porque lá não se arrasta. */}
      {arrastavel && etapas.length > 1 && (
        <div className="grid grid-rows-[1fr] pointer-fine:grid-rows-[0fr] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr] transition-[grid-template-rows] duration-200 ease-out-quart">
          <div className="min-h-0 overflow-hidden">
            <div className="px-3.5 pt-0.5 pb-3">
              <label className="sr-only" htmlFor={`etapa-${item.id}`}>{`Etapa de ${nome}`}</label>
              <select
                id={`etapa-${item.id}`}
                value={colId}
                onChange={(e) => onMover(item, colId, e.target.value)}
                className="w-full h-8 rounded-md border border-divider bg-background px-2 text-xs text-ink-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                {etapas.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>{etapa.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(KanbanCard);
