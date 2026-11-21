import { useQueryClient } from '@tanstack/react-query';
import Automacoes from './Automacoes';
import { automacaoService } from '../services/automacaoService';
import { useAutomacoes, queryKeys } from '../hooks/queries';
import { useToast, useConfirm } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

const SEM_DADOS = [];

export default function AutomacoesContainer() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const query = useAutomacoes();
  const modulos = query.data?.modulos ?? SEM_DADOS;
  const automacoes = query.data?.automacoes ?? SEM_DADOS;

  const handleToggleAtivo = async (automacao, ativo) => {
    const aplicar = (campos) =>
      queryClient.setQueryData(queryKeys.automacoes, (atual) =>
        atual
          ? {
              ...atual,
              automacoes: atual.automacoes.map((a) => (a.id === automacao.id ? { ...a, ...campos } : a)),
            }
          : atual
      );

    // Otimista. Reativar limpa a marca de pausa automática (o backend faz o mesmo).
    aplicar(ativo ? { ativo, pausada_por_falhas_em: null } : { ativo });
    try {
      // O resultado já está na tela; não precisa refazer a lista de todos os módulos.
      await automacaoService.alternarAtivo(automacao.modulo_id, automacao.id, ativo, { skipInvalidate: true });
    } catch (error) {
      aplicar({ ativo: automacao.ativo, pausada_por_falhas_em: automacao.pausada_por_falhas_em });
      toast.error(mensagemDeErro(error, 'Erro ao atualizar o status da automação.'));
    }
  };

  const handleDelete = async (automacao) => {
    const ok = await confirm({
      title: `Excluir "${automacao.nome}"?`,
      message: 'A automação deixa de rodar imediatamente. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir automação',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await automacaoService.excluir(automacao.modulo_id, automacao.id);
      toast.success('Automação excluída.');
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao excluir a automação.'));
    }
  };

  return (
    <Automacoes
      automacoes={automacoes}
      modulos={modulos}
      loading={query.isLoading}
      error={query.isError ? mensagemDeErro(query.error, 'Erro ao carregar as automações.') : ''}
      onRetry={() => query.refetch()}
      onToggleAtivo={handleToggleAtivo}
      onDelete={handleDelete}
    />
  );
}
