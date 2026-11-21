import { fieldClasses } from '../ui/fieldUtils';

const VISOES = [
  ['lista', 'view_list', 'Lista'],
  ['quadro', 'view_kanban', 'Quadro'],
];

/**
 * Lista ou quadro e, no quadro com mais de uma coluna de lista, por qual agrupar.
 * `visaoDaTabela` é o retorno de useVisaoDaTabela.
 */
export default function SeletorDeVisao({ visaoDaTabela }) {
  const { visao, camposLista, campoGrupo, mudarPreferencia } = visaoDaTabela;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
      {visao === 'quadro' && camposLista.length > 1 && (
        <label className="flex items-center gap-2 text-xs text-light-text">
          Agrupar por
          {/* O Select do ui só tem a altura de formulário (h-11); aqui, na barra, o
              nativo compacto com as mesmas classes de campo. */}
          <select
            value={campoGrupo.id}
            onChange={(e) => mudarPreferencia({ campo: e.target.value })}
            className={`${fieldClasses.replace('w-full ', '')} h-9 px-2.5 cursor-pointer`}
          >
            {camposLista.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
      )}
      <div role="group" aria-label="Como ver os itens" className="flex gap-1 rounded-lg bg-sidebar p-1">
        {VISOES.map(([valor, icone, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={visao === valor}
            onClick={() => mudarPreferencia({ visao: valor })}
            className={`flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-semibold transition-colors ${
              visao === valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
            }`}
          >
            <span className="material-icons text-[16px]" aria-hidden="true">{icone}</span>
            {rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
