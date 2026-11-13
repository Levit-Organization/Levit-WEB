import { useQuery } from '@tanstack/react-query';
import { financeiroService } from '../services/financeiroService';
import { categoriasFaltando, listaDeCategorias, listaDeLancamentos } from '../utils/financeiro';

const SEM_DADOS = [];

/**
 * Categorias + lançamentos numa consulta só. As categorias padrão são criadas
 * na primeira visita (como antes); `skipInvalidate` evita que essas criações
 * invalidem a própria consulta e causem um segundo fetch.
 */
async function carregarFinanceiro(moduloId) {
  const [catsRes, lancRes] = await Promise.all([
    financeiroService.listarCategorias(),
    financeiroService.listarLancamentos(moduloId),
  ]);

  let categorias = listaDeCategorias(catsRes);

  const faltando = categoriasFaltando(categorias);
  if (faltando.length > 0) {
    const criacoes = await Promise.allSettled(
      faltando.map((nome) => financeiroService.criarCategoria(nome, { skipInvalidate: true }))
    );
    if (criacoes.some((r) => r.status === 'fulfilled')) {
      categorias = listaDeCategorias(await financeiroService.listarCategorias());
    }
  }

  return { categorias, lancamentos: listaDeLancamentos(lancRes) };
}

/** Lançamentos e categorias da tabela financeira. */
export function useFinanceiro(moduloId) {
  const query = useQuery({
    queryKey: ['financeiro', moduloId],
    queryFn: () => carregarFinanceiro(moduloId),
    enabled: !!moduloId,
  });
  return {
    query,
    lancamentos: query.data?.lancamentos ?? SEM_DADOS,
    categorias: query.data?.categorias ?? SEM_DADOS,
  };
}
