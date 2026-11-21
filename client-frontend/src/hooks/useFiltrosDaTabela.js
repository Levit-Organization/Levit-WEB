import { useMemo, useState } from 'react';
import { alvosDoFiltro, filtrosParaApi, filtrosVazios } from '../utils/filtros';
import { useDebouncedValue } from './useDebouncedValue';

const SEM_FILTROS = filtrosVazios();

/**
 * Pesquisa avançada de uma tabela. Os filtros ficam guardados por tabela:
 * trocar de tabela mantém a tela montada (mesma rota, outro id).
 * `filtrosAtivos` é o que vai para a API (null = sem filtro), depois que a digitação para.
 */
export function useFiltrosDaTabela(id, modulo) {
  const [filtrosPorTabela, setFiltrosPorTabela] = useState({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const filtros = filtrosPorTabela[id] ?? SEM_FILTROS;
  const alvosFiltro = useMemo(() => alvosDoFiltro(modulo), [modulo]);
  const filtrosApi = useMemo(() => filtrosParaApi(filtros, alvosFiltro), [filtros, alvosFiltro]);
  // Espera a digitação parar; o id junto evita mandar os filtros de uma tabela para outra.
  const pedidoFiltros = useMemo(() => ({ tabela: id, filtros: filtrosApi }), [id, filtrosApi]);
  const filtrosAdiados = useDebouncedValue(pedidoFiltros);
  const filtrosAtivos = filtrosAdiados.tabela === id ? filtrosAdiados.filtros : null;
  const totalFiltros = filtrosApi?.regras.length ?? 0;

  const definirFiltros = (novos) => setFiltrosPorTabela((atual) => ({ ...atual, [id]: novos }));

  return { filtros, definirFiltros, mostrarFiltros, setMostrarFiltros, alvosFiltro, filtrosAtivos, totalFiltros };
}
