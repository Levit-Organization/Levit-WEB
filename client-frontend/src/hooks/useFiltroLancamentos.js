import { useDeferredValue, useMemo, useState } from 'react';
import { MESES, agruparPorMes, anosDisponiveis, filtrarLancamentos, somarTotais } from '../utils/financeiro';

/** Ano, categoria e busca da tela financeira, com os totais e os meses que sobram. */
export function useFiltroLancamentos(lancamentos) {
  const anoAtual = new Date().getFullYear().toString();
  const anos = useMemo(() => anosDisponiveis(lancamentos, anoAtual), [lancamentos, anoAtual]);

  const [ano, setAno] = useState(anoAtual);
  const [categoria, setCategoria] = useState('all');
  const [busca, setBusca] = useState('');

  // Digitar na busca não trava: o filtro pesado roda com o valor adiado.
  const buscaAdiada = useDeferredValue(busca);

  const visiveis = useMemo(
    () => filtrarLancamentos(lancamentos, { ano, categoria, busca: buscaAdiada }),
    [lancamentos, ano, categoria, buscaAdiada]
  );
  const totais = useMemo(() => somarTotais(visiveis), [visiveis]);
  // Agrupa por mês numa passada só (antes: 12 filtros + 12 somas a cada render).
  const porMes = useMemo(() => agruparPorMes(visiveis), [visiveis]);

  // Mês sem lançamento não aparece: 12 cartões vazios só faziam ruído.
  const meses = MESES.filter((m) => porMes[m.value].lista.length > 0);
  const filtrando = categoria !== 'all' || buscaAdiada.trim() !== '';

  return { anos, ano, setAno, categoria, setCategoria, busca, setBusca, totais, porMes, meses, filtrando };
}
