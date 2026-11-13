import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queries';
import { useConfirm, useToast } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { relatorioService } from '../services/relatorioService';

/** Enviar agora, ligar/pausar e excluir um relatório agendado. */
export function useAcoesDoRelatorio(relatorio) {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);

  const enviarAgora = async () => {
    setEnviando(true);
    try {
      await relatorioService.enviarAgora(relatorio.id);
      toast.success('Relatório enviado por e-mail.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível enviar agora.'));
    } finally {
      setEnviando(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.relatorios });
    }
  };

  const alternar = async (ativo) => {
    try {
      await relatorioService.atualizar(relatorio.id, { ...relatorio, ativo });
      toast.success(ativo ? 'Relatório ligado.' : 'Relatório pausado.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível alterar.'));
    }
  };

  const excluir = async () => {
    const ok = await confirm({
      title: 'Excluir relatório?',
      message: `"${relatorio.nome}" deixa de ser enviado. O histórico de atividades continua guardado.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await relatorioService.excluir(relatorio.id);
      toast.success('Relatório excluído.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível excluir.'));
    }
  };

  return { enviando, enviarAgora, alternar, excluir };
}
