import { SECOES_RELATORIO } from '../../utils/relatorios';
import { alternarNaLista } from '../../utils/relatoriosAgendados';

/** Escolha das partes do PDF (caixas de seleção). */
export default function EscolhaDeSecoes({ valor, onChange, legenda = 'O que entra no PDF' }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink mb-1.5">{legenda}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {SECOES_RELATORIO.map((s) => (
          // O rótulo já diz o que é; o detalhe fica para quem passar o mouse.
          <label key={s.valor} title={s.descricao} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={valor.includes(s.valor)}
              onChange={() => onChange(alternarNaLista(valor, s.valor))}
              className="w-4 h-4 accent-primary shrink-0"
            />
            <span className="text-sm text-ink">{s.rotulo}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
