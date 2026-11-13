import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queries';
import { useConfirm, useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { arquivoService } from '../../services/arquivoService';

/**
 * Baixar (com o estado de cada download) e excluir arquivos da tabela. A
 * exclusão tira o arquivo da lista na hora e o devolve se a API recusar.
 */
export function useAcoesDosArquivos(moduloId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const chave = queryKeys.registros(moduloId);
  const [baixando, setBaixando] = useState(() => new Set());

  const baixar = async (arquivo) => {
    setBaixando((atual) => new Set(atual).add(arquivo.id));
    try {
      await arquivoService.downloadFile(moduloId, arquivo.id, arquivo.arquivo_nome);
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Não foi possível baixar o arquivo.'));
    } finally {
      setBaixando((atual) => {
        const novo = new Set(atual);
        novo.delete(arquivo.id);
        return novo;
      });
    }
  };

  const excluir = async (arquivo) => {
    const ok = await confirm({
      title: 'Excluir arquivo?',
      message: `"${arquivo.arquivo_nome}" será apagado para todos da equipe. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;

    const anterior = queryClient.getQueryData(chave);
    queryClient.setQueryData(chave, (atual) => atual?.filter((r) => r.id !== arquivo.id));
    try {
      await arquivoService.delete(moduloId, arquivo.id);
      toast.success('Arquivo excluído.');
    } catch (err) {
      queryClient.setQueryData(chave, anterior);
      toast.error(mensagemDeErro(err, 'Não foi possível excluir o arquivo.'));
    }
  };

  return { baixando, baixar, excluir };
}
