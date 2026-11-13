import { useMemo } from 'react';
import { useModulos, useEquipe, useKanban, useAutomacoes, useConvites, usePrazos } from '../../hooks/queries';
import { itensDeAtencao, resumirAutomacoes, resumirVaga, separarModulos } from '../../utils/dashboard';

const SEM_DADOS = [];

/**
 * Tudo o que a tela inicial busca e resume: tabelas, equipe, a vaga mais
 * recente, automações, convites e prazos, mais a lista do que pede atenção.
 */
export function useDadosDoDashboard() {
  const modulosQuery = useModulos();
  const modulos = modulosQuery.data ?? SEM_DADOS;

  const equipeQuery = useEquipe();
  const equipe = equipeQuery.data ?? SEM_DADOS;
  const equipeIndisponivel = equipeQuery.error?.response?.status === 403;

  // Convites e automações dependem de permissão: sem acesso, só não aparecem.
  const convites = useConvites({ retry: false }).data ?? SEM_DADOS;
  const automacoes = useAutomacoes().data?.automacoes ?? SEM_DADOS;

  const { tabelas, vagas, totalItens } = useMemo(() => separarModulos(modulos), [modulos]);
  const vagaDestaque = vagas[vagas.length - 1] || null;

  const kanbanQuery = useKanban(vagaDestaque?.id, { enabled: !!vagaDestaque });
  const vagaKanban = kanbanQuery.data ?? null;
  const vagaIndisponivel = kanbanQuery.error?.response?.status === 403;
  const resumoVaga = useMemo(() => resumirVaga(vagaKanban), [vagaKanban]);

  const resumoAutomacoes = useMemo(() => resumirAutomacoes(automacoes), [automacoes]);

  const prazosQuery = usePrazos('todos');
  const atrasados = prazosQuery.data?.atrasados ?? SEM_DADOS;

  const atencao = itensDeAtencao({
    atrasados,
    pausadas: resumoAutomacoes.pausadas,
    paradosVaga: resumoVaga.paradosVaga,
    vagaDestaque,
    convites,
  });

  return {
    modulosQuery,
    tabelas,
    vagas,
    totalItens,
    equipeQuery,
    equipe,
    equipeIndisponivel,
    vagaDestaque,
    kanbanQuery,
    vagaIndisponivel,
    resumoVaga,
    resumoAutomacoes,
    prazosQuery,
    atencao,
  };
}
