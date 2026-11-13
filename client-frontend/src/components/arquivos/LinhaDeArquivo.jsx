import { Avatar, Button, tempoRelativo } from '../ui';
import { cn } from '../ui/cn';
import { tamanhoLegivel, tipoDoArquivo, tipoParaVisualizar } from '../../utils/arquivos';

const DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

/** "hoje, 14:30", "há 3 dias"... e a data completa para o title. */
function quando(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return { curto: null, completo: undefined };
  const relativo = tempoRelativo(valor);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return {
    curto: relativo === 'hoje' ? `hoje, ${hora}` : relativo || data.toLocaleDateString('pt-BR'),
    completo: DATA_COMPLETA.format(data),
  };
}

/** Uma linha da tabela de arquivos: nome (abre ou baixa), tamanho, quem enviou, quando e ações. */
export default function LinhaDeArquivo({ arquivo, baixando, onAbrir, onVisualizar, onBaixar, onExcluir }) {
  const tipo = tipoDoArquivo(arquivo.arquivo_nome);
  const podeVer = !!tipoParaVisualizar(arquivo.arquivo_nome);
  const data = quando(arquivo.criado_em);

  return (
    <tr className="border-b border-divider last:border-0 hover:bg-background transition-colors">
      <td className="px-4 py-2.5 max-w-0 w-full">
        <button
          type="button"
          onClick={() => onAbrir(arquivo)}
          className="group flex items-center gap-3 min-w-0 w-full text-left rounded-md"
          title={podeVer ? `Visualizar ${arquivo.arquivo_nome}` : `Baixar ${arquivo.arquivo_nome}`}
        >
          <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', tipo.cor)} aria-hidden="true">
            <span className="material-icons text-[18px]">{tipo.icone}</span>
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-ink truncate group-hover:text-primary-700 group-hover:underline">
              {arquivo.arquivo_nome || 'Arquivo sem nome'}
            </span>
            <span className="block text-2xs text-light-text">
              {tipo.rotulo}
              <span className="sm:hidden"> · {tamanhoLegivel(arquivo.arquivo_tamanho)}</span>
            </span>
          </span>
        </button>
      </td>
      <td className="hidden sm:table-cell px-4 py-2.5 whitespace-nowrap text-xs text-light-text tabular">
        {tamanhoLegivel(arquivo.arquivo_tamanho) ?? '--'}
      </td>
      <td className="hidden md:table-cell px-4 py-2.5 whitespace-nowrap">
        {arquivo.enviado_por_nome ? (
          <span className="flex items-center gap-2 text-ink-soft">
            <Avatar name={arquivo.enviado_por_nome} size="xs" />
            <span className="truncate max-w-[160px]">{arquivo.enviado_por_nome}</span>
          </span>
        ) : (
          <span className="text-light-text">--</span>
        )}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-light-text" title={data.completo}>
        {data.curto ?? '--'}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          {podeVer && (
            <Button
              variant="ghost"
              size="icon-sm"
              icon="visibility"
              onClick={() => onVisualizar(arquivo)}
              title="Visualizar"
              aria-label={`Visualizar ${arquivo.arquivo_nome}`}
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            icon="download"
            loading={baixando}
            onClick={() => onBaixar(arquivo)}
            title="Baixar"
            aria-label={`Baixar ${arquivo.arquivo_nome}`}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            icon="delete_outline"
            onClick={() => onExcluir(arquivo)}
            title="Excluir"
            aria-label={`Excluir ${arquivo.arquivo_nome}`}
            className="hover:bg-danger-bg hover:text-danger"
          />
        </div>
      </td>
    </tr>
  );
}
