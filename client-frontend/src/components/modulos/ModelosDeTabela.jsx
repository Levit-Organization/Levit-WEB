import { GRUPOS_DE_MODELOS } from '../../utils/modulos';

/** "Comece por um modelo": os modelos prontos por segmento; o aplicado fica marcado. */
export default function ModelosDeTabela({ modeloAplicado, onAplicar }) {
  return (
    <section aria-labelledby="modelos-titulo" className="mb-6">
      <h2 id="modelos-titulo" className="text-sm font-semibold text-ink mb-3">Comece por um modelo</h2>
      <div className="flex flex-col gap-4">
        {GRUPOS_DE_MODELOS.map(([grupo, modelos]) => (
          <div key={grupo}>
            <h3 className="text-xs font-semibold text-light-text mb-2">{grupo}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {modelos.map((modelo) => {
                const ativo = modeloAplicado === modelo.id;
                return (
                  <button
                    key={modelo.id}
                    type="button"
                    onClick={() => onAplicar(modelo)}
                    aria-pressed={ativo}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      ativo
                        ? 'border-primary bg-primary-50 shadow-xs'
                        : 'border-divider bg-surface hover:border-primary-300 hover:bg-primary-50/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ativo ? 'bg-primary text-white' : 'bg-primary-100 text-primary'}`}>
                        <span className="material-icons text-[20px]" aria-hidden="true">{modelo.icone}</span>
                      </span>
                      <span className="text-sm font-semibold text-ink">{modelo.titulo}</span>
                    </span>
                    <span className="block text-xs text-light-text mt-2 truncate" title={modelo.descricao}>{modelo.descricao}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
