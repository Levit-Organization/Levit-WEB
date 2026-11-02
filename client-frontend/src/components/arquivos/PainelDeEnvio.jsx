import { Button, Card } from '../ui';
import { cn } from '../ui/cn';
import { tamanhoLegivel, tipoDoArquivo } from '../../utils/arquivos';

const ESTADOS = {
  aguardando: { icone: 'schedule', cor: 'text-light-text', texto: () => 'Na fila' },
  enviando: { icone: null, cor: 'text-primary-700', texto: (item) => `Enviando… ${item.progresso}%` },
  enviado: { icone: 'check_circle', cor: 'text-success', texto: () => 'Enviado' },
  erro: { icone: 'error', cor: 'text-danger', texto: (item) => item.erro },
  recusado: { icone: 'block', cor: 'text-danger', texto: (item) => item.erro },
};

/** Fila de envio logo acima da lista: progresso de cada arquivo e o que fazer quando falha. */
export default function PainelDeEnvio({ envio }) {
  const { itens, pendentes, tentarDeNovo, cancelar, limparConcluidos } = envio;
  if (itens.length === 0) return null;

  const enviados = itens.filter((item) => item.status === 'enviado').length;
  const problemas = itens.filter((item) => item.status === 'erro' || item.status === 'recusado').length;
  const titulo = pendentes
    ? `Enviando ${enviados + 1} de ${enviados + pendentes}`
    : problemas
      ? `${problemas} ${problemas === 1 ? 'arquivo não foi enviado' : 'arquivos não foram enviados'}`
      : 'Tudo enviado';

  return (
    <Card padding="none" className="mb-6 overflow-hidden animate-rise">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-divider">
        <p className="text-sm font-semibold text-ink" aria-live="polite">{titulo}</p>
        {!pendentes && (
          <Button variant="ghost" size="sm" onClick={limparConcluidos}>
            Dispensar
          </Button>
        )}
      </div>
      <ul className="divide-y divide-divider max-h-72 overflow-y-auto">
        {itens.map((item) => {
          const tipo = tipoDoArquivo(item.nome);
          const estado = ESTADOS[item.status];
          const falhou = item.status === 'erro' || item.status === 'recusado';
          return (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tipo.cor)} aria-hidden="true">
                <span className="material-icons text-[18px]">{tipo.icone}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-medium text-ink truncate" title={item.nome}>{item.nome}</span>
                  <span className="text-2xs text-light-text shrink-0 tabular">{tamanhoLegivel(item.tamanho)}</span>
                </div>
                {item.status === 'enviando' ? (
                  <div
                    className="mt-1.5 h-1.5 rounded-full bg-primary-100 overflow-hidden"
                    role="progressbar"
                    aria-label={`Enviando ${item.nome}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progresso}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out-quart"
                      style={{ width: `${Math.max(item.progresso, 3)}%` }}
                    />
                  </div>
                ) : (
                  <p className={cn('mt-0.5 text-xs flex items-center gap-1', estado.cor)}>
                    {estado.icone && <span className="material-icons text-[14px]" aria-hidden="true">{estado.icone}</span>}
                    <span className={falhou ? '' : 'truncate'}>{estado.texto(item)}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.status === 'erro' && (
                  <Button variant="ghost" size="icon-sm" icon="refresh" onClick={() => tentarDeNovo(item.id)} aria-label={`Tentar enviar ${item.nome} de novo`} title="Tentar de novo" />
                )}
                {item.status !== 'enviado' && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon="close"
                    onClick={() => cancelar(item.id)}
                    aria-label={falhou ? `Dispensar ${item.nome}` : `Cancelar envio de ${item.nome}`}
                    title={falhou ? 'Dispensar' : 'Cancelar'}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
