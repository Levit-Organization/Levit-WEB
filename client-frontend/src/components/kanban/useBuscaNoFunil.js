import { useState, useMemo } from 'react';
import { contarCandidatos, filtrarColunasPorNome, normalizarBusca } from '../../utils/kanban';

/** Busca por nome na vaga aberta: colunas filtradas e quantos foram encontrados. */
export function useBuscaNoFunil(colunas, totalCandidatos) {
  const [busca, setBusca] = useState('');
  const termo = normalizarBusca(busca.trim());
  const colunasVisiveis = useMemo(() => filtrarColunasPorNome(colunas, termo), [colunas, termo]);
  const totalEncontrados = termo ? contarCandidatos(colunasVisiveis) : totalCandidatos;

  return { busca, setBusca, termo, colunasVisiveis, totalEncontrados };
}
