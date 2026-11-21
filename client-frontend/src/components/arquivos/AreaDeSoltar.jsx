import { cn } from '../ui/cn';

/** Tabela sem arquivos: a área inteira é o botão de escolher e acende ao arrastar por cima. */
export function AreaDeEnvioVazia({ arrastando, onEscolher }) {
  return (
    <button
      type="button"
      onClick={onEscolher}
      className={cn(
        'w-full rounded-xl border-2 border-dashed px-6 py-14 flex flex-col items-center text-center transition-colors duration-150',
        arrastando ? 'border-primary bg-primary-50' : 'border-divider-strong bg-surface hover:border-primary-300 hover:bg-primary-50'
      )}
    >
      <span className="w-16 h-16 rounded-xl bg-primary-100 text-primary flex items-center justify-center mb-4" aria-hidden="true">
        <span className="material-icons text-[30px]">cloud_upload</span>
      </span>
      <span className="text-base font-semibold text-ink">Arraste arquivos para cá ou clique para escolher</span>
      <span className="mt-1.5 text-sm text-light-text max-w-[48ch]">
        Contratos, notas, fotos, planilhas: tudo da equipe num lugar só. PDF, imagens, documentos, planilhas e
        apresentações de até 10 MB cada.
      </span>
    </button>
  );
}

/** Aviso por cima da página inteira enquanto há arquivos sendo arrastados. */
export function AvisoDeSoltar({ nomeDaTabela }) {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none p-4 animate-fade-in" aria-hidden="true">
      <div className="h-full w-full rounded-2xl border-2 border-dashed border-primary bg-primary-50/90 flex flex-col items-center justify-center text-center">
        <span className="w-16 h-16 rounded-xl bg-primary-100 text-primary flex items-center justify-center mb-4">
          <span className="material-icons text-[30px]">cloud_upload</span>
        </span>
        <p className="text-lg font-semibold text-ink">Solte para enviar para “{nomeDaTabela}”</p>
        <p className="mt-1 text-sm text-light-text">Até 10 MB por arquivo</p>
      </div>
    </div>
  );
}
