import { Badge, Skeleton } from '../ui';
import { useEnviosRelatorio } from '../../hooks/queries';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { relatorioService } from '../../services/relatorioService';
import { dataHora, periodoDoEnvio } from '../../utils/relatoriosAgendados';

/** Envios já feitos de um relatório agendado; cada um dá para baixar de novo em PDF. */
export default function HistoricoDeEnvios({ relatorio }) {
  const toast = useToast();
  const envios = useEnviosRelatorio(relatorio.id, { enabled: true });
  const baixar = async (envio) => {
    try {
      await relatorioService.baixarPdf({
        ...periodoDoEnvio(envio),
        titulo: relatorio.nome,
        secoes: relatorio.secoes,
      });
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível gerar o PDF.'));
    }
  };

  if (envios.isLoading) return <Skeleton className="h-10 w-full mt-3" />;
  if (envios.isError) return <p className="text-sm text-danger mt-3">{mensagemDeErro(envios.error, 'Erro ao carregar o histórico.')}</p>;
  if (!envios.data?.length) return <p className="text-sm text-light-text mt-3">Ainda não houve nenhum envio.</p>;

  return (
    <ul className="mt-3 flex flex-col divide-y divide-divider border-t border-divider">
      {envios.data.map((envio) => (
        <li key={envio.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          <span className="text-ink-soft">{dataHora(envio.enviado_em)}</span>
          {envio.status === 'enviado' ? (
            <Badge variant="success" size="sm">{envio.total_atividades} atividades</Badge>
          ) : (
            <Badge variant="danger" size="sm" title={envio.erro || ''}>Não enviado</Badge>
          )}
          <button type="button" onClick={() => baixar(envio)} className="ml-auto text-primary font-semibold hover:underline">
            Baixar PDF
          </button>
        </li>
      ))}
    </ul>
  );
}
