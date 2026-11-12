/**
 * Move um candidato de uma coluna para outra sem mutar o funil. Colunas que não
 * mudam mantêm a mesma referência, então `React.memo` pula o re-render delas.
 */
export function moverCandidatoNoFunil(funil, candidato, deColuna, paraColuna) {
  if (!funil?.[deColuna] || !funil?.[paraColuna] || deColuna === paraColuna) return funil;

  const origem = funil[deColuna];
  const destino = funil[paraColuna];

  return {
    ...funil,
    [deColuna]: {
      ...origem,
      candidatos: origem.candidatos.filter((c) => c.id !== candidato.id),
      total: Math.max(0, (origem.total ?? origem.candidatos.length) - 1),
    },
    [paraColuna]: {
      ...destino,
      candidatos: [...destino.candidatos.filter((c) => c.id !== candidato.id), candidato],
      total: (destino.total ?? destino.candidatos.length) + 1,
    },
  };
}

/** Acha um candidato no funil: { candidato, colId, fase } ou null. */
export function localizarCandidato(funil, candidatoId) {
  if (!funil || !candidatoId) return null;
  for (const [colId, coluna] of Object.entries(funil)) {
    const candidato = coluna.candidatos?.find((c) => c.id === candidatoId);
    if (candidato) return { candidato, colId, fase: coluna.fase || colId };
  }
  return null;
}

/** Texto para busca por nome sem ligar para acento nem maiúscula. */
export const normalizarBusca = (texto) =>
  String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Quantos candidatos há nas colunas ([colId, coluna] de Object.entries do funil). */
export function contarCandidatos(colunas) {
  return colunas.reduce((acc, [, col]) => acc + (col.candidatos?.length || 0), 0);
}

/**
 * Deixa em cada coluna só os candidatos cujo nome contém `termo` (já passado
 * por `normalizarBusca`), com o total da coluna ajustado. Sem termo, devolve as colunas.
 */
export function filtrarColunasPorNome(colunas, termo) {
  if (!termo) return colunas;
  return colunas.map(([colId, col]) => {
    const candidatos = (col.candidatos || []).filter((c) => normalizarBusca(c.nome).includes(termo));
    return [colId, { ...col, candidatos, total: candidatos.length }];
  });
}
