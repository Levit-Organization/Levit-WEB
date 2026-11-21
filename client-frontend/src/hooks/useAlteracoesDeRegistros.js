import { useQueryClient } from '@tanstack/react-query';
import { registroService } from '../services/registroService';
import { useToast, useConfirm } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

/**
 * Alterações feitas direto na lista de itens (sem o formulário): excluir e
 * mover no quadro. Ambas mexem no cache da lista em `chaveRegistros`.
 */
export function useAlteracoesDeRegistros(id, chaveRegistros, campoGrupo) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  /**
   * Mover no quadro = trocar o valor da coluna de lista. Otimista: o cartão
   * muda na hora e volta se a API recusar.
   */
  const moverItem = async (item, valor) => {
    const chave = chaveRegistros;
    const aplicar = (dados) =>
      queryClient.setQueryData(chave, (atual) => atual?.map((r) => (r.id === item.id ? { ...r, dados } : r)));
    const novosDados = { ...item.dados, [campoGrupo.id]: valor || null };

    aplicar(novosDados);
    try {
      await registroService.update(id, item.id, { dados: novosDados }, { skipInvalidate: true });
    } catch (err) {
      aplicar(item.dados);
      toast.error(mensagemDeErro(err, 'Não foi possível mover o item.'));
    }
  };

  const handleDelete = async (registro) => {
    const ok = await confirm({
      title: 'Excluir item?',
      message: 'Este item será removido definitivamente. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await registroService.delete(id, registro.id);
      queryClient.setQueryData(chaveRegistros, (atual) =>
        atual?.filter((r) => r.id !== registro.id)
      );
      toast.success('Item excluído.');
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Erro ao excluir.'));
    }
  };

  return { moverItem, handleDelete };
}
