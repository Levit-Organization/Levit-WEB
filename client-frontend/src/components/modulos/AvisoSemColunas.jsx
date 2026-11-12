import { Card } from '../ui';

/** Tabelas de estrutura fixa (financeiro, arquivos): explica que não há colunas a criar. */
export default function AvisoSemColunas({ icone, titulo, children }) {
  return (
    <Card className="bg-primary-50/50 border-primary-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0">
          <span className="material-icons text-[24px]">{icone}</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary-900">{titulo}</h2>
          <p className="text-sm text-primary-800 mt-1">
            {children}
          </p>
        </div>
      </div>
    </Card>
  );
}
