import { Alert, Card } from '../ui';

/** Etapas do funil de uma vaga nova. Sempre sobra um campo, mesmo vazio. */
export default function EtapasDoQuadro({ fases, onChange }) {
  const fasesValidas = fases.map((f) => f.trim()).filter(Boolean);

  const handleAddFase = () => onChange([...fases, '']);
  const handleFaseChange = (index, value) => {
    const updated = [...fases];
    updated[index] = value;
    onChange(updated);
  };
  const handleRemoveFase = (index) => {
    const updated = [...fases];
    updated.splice(index, 1);
    onChange(updated.length ? updated : ['']);
  };

  return (
    <Card>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-base font-semibold">Etapas do quadro</h2>
        <button
          type="button"
          onClick={handleAddFase}
          className="h-9 px-3.5 rounded-lg border border-divider text-sm font-medium text-light-text hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span className="material-icons text-[16px]">add</span>
          Etapa
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {fases.map((fase, index) => (
          <div key={index} className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-2xs font-bold flex items-center justify-center shrink-0 tabular">
              {index + 1}
            </span>
            <input
              type="text"
              value={fase}
              onChange={(e) => handleFaseChange(index, e.target.value)}
              placeholder={`Ex: ${index === 0 ? 'Triagem' : 'Entrevista'}`}
              className="flex-1 h-10 px-3.5 bg-surface text-ink border border-divider-strong rounded-lg text-sm placeholder:text-light-text transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100"
            />
            <button
              type="button"
              onClick={() => handleRemoveFase(index)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-light-text hover:text-danger hover:bg-danger-bg transition-colors shrink-0"
              title="Remover etapa"
            >
              <span className="material-icons text-[20px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {fasesValidas.length === 0 && (
        <div className="mt-3">
          <Alert variant="warning">Adicione pelo menos uma etapa para criar a vaga.</Alert>
        </div>
      )}
    </Card>
  );
}
