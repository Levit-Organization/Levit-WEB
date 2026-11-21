import { useState, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { recrutamentoService } from '../../services/recrutamentoService';
import { useModulos, useKanban, queryKeys } from '../../hooks/queries';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { moverCandidatoNoFunil, contarCandidatos } from '../../utils/kanban';

const SEM_DADOS = [];

/**
 * Vagas de recrutamento, a vaga aberta e o funil dela (com polling), mais o
 * movimento otimista de candidatos entre etapas. `dragRef` guarda o arraste em
 * andamento: enquanto houver arraste ou movimento sendo gravado, o polling espera.
 */
export function useFunilDaVaga() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // --- Vagas e funil ---------------------------------------------------------
  const modulosQuery = useModulos();
  const vagas = useMemo(
    () => (modulosQuery.data ?? SEM_DADOS).filter((m) => m.tipo === 'recrutamento'),
    [modulosQuery.data]
  );

  const [vagaEscolhida, setVagaEscolhida] = useState(null);
  // Sem escolha (ou com a vaga escolhida removida) usa a primeira vaga. Sem vagas
  // nenhuma, mostra o funil global em modo somente leitura ('all').
  const vagaSelecionada =
    vagas.find((v) => v.id === vagaEscolhida)?.id ?? vagas[0]?.id ?? 'all';
  const modoSomenteLeitura = vagaSelecionada === 'all';

  // Espera saber quais vagas existem: evita buscar o funil global e logo em seguida o da vaga.
  // Durante um arraste ou com movimentos ainda sendo gravados, o polling espera:
  // um refetch nesse intervalo traria o cartão de volta à coluna antiga.
  const dragRef = useRef(null);
  const movimentosPendentes = useRef(0);
  const sincronizacaoPausada = useCallback(
    () => dragRef.current !== null || movimentosPendentes.current > 0,
    []
  );
  const kanbanQuery = useKanban(modoSomenteLeitura ? undefined : vagaSelecionada, {
    enabled: !modulosQuery.isLoading,
    pausado: sincronizacaoPausada,
  });
  const kanbanData = kanbanQuery.data ?? null;
  const loading = modulosQuery.isLoading || kanbanQuery.isLoading;

  const colunas = useMemo(() => (kanbanData ? Object.entries(kanbanData) : []), [kanbanData]);
  // Opções do seletor de etapa no cartão (mesma ideia do quadro das tabelas).
  const etapasParaMover = useMemo(() => colunas.map(([colId, col]) => ({ id: colId, nome: col.fase || colId })), [colunas]);
  const totalCandidatos = useMemo(() => contarCandidatos(colunas), [colunas]);

  /**
   * Move o candidato no cache (otimista) e persiste. Se a API falhar, desfaz só
   * esse cartão — o resto do funil continua como está, sem skeleton nem refetch visível.
   */
  const moverCandidato = useCallback(
    async (item, deColuna, paraColuna) => {
      if (deColuna === paraColuna) return;

      movimentosPendentes.current += 1;
      const chave = queryKeys.kanban(vagaSelecionada);
      await queryClient.cancelQueries({ queryKey: chave });

      const movido = { ...item, fase_atual_id: paraColuna, atualizado_em: new Date().toISOString() };
      queryClient.setQueryData(chave, (atual) => moverCandidatoNoFunil(atual, movido, deColuna, paraColuna));

      try {
        await recrutamentoService.moverFaseDaVaga(item.modulo_id || vagaSelecionada, item.id, paraColuna);
      } catch (err) {
        queryClient.setQueryData(chave, (atual) => moverCandidatoNoFunil(atual, item, paraColuna, deColuna));
        toast.error(mensagemDeErro(err, 'Erro ao mover candidato.'));
        queryClient.invalidateQueries({ queryKey: chave });
      } finally {
        movimentosPendentes.current -= 1;
      }
    },
    [queryClient, toast, vagaSelecionada]
  );

  return {
    vagas,
    vagaSelecionada,
    setVagaEscolhida,
    modoSomenteLeitura,
    dragRef,
    kanbanQuery,
    kanbanData,
    loading,
    colunas,
    etapasParaMover,
    totalCandidatos,
    moverCandidato,
  };
}
