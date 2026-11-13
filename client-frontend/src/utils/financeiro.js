/**
 * Regras da tela financeira: categorias padrão, filtro e agrupamento dos
 * lançamentos por mês, totais e validação do formulário de lançamento.
 */

export const CATEGORIAS_PADRAO = ['Fixo', 'Variável', 'Investimento', 'Receita'];

export const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** "2026-03-15" → "15/03/2026". */
export function formatarData(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** A API às vezes devolve a lista direto, às vezes dentro de `data`. */
export function listaDeCategorias(resposta) {
  return Array.isArray(resposta) ? resposta : resposta?.data || [];
}

export function listaDeLancamentos(resposta) {
  return Array.isArray(resposta?.lancamentos) ? resposta.lancamentos : resposta?.data?.lancamentos || [];
}

/** Categorias padrão que ainda não existem (comparação sem maiúsculas). */
export function categoriasFaltando(categorias) {
  return CATEGORIAS_PADRAO.filter((nome) => !categorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase()));
}

/** Opções das categorias padrão, com o id da categoria quando ela já existe. */
export function opcoesDeCategoria(categorias) {
  return CATEGORIAS_PADRAO.map((nomeCategoria) => {
    const encontrada = categorias.find((c) => c.nome.toLowerCase() === nomeCategoria.toLowerCase());
    return { value: encontrada ? encontrada.id : nomeCategoria, label: nomeCategoria };
  });
}

export function somarTotais(lista) {
  return lista.reduce(
    (acc, item) => {
      const val = parseFloat(item.valor) || 0;
      if (item.tipo === 'entrada') acc.profit += val;
      if (item.tipo === 'saida') acc.expenses += val;
      acc.balance = acc.profit - acc.expenses;
      return acc;
    },
    { profit: 0, expenses: 0, balance: 0 }
  );
}

/** Anos com lançamento, sempre com o ano atual, do mais recente ao mais antigo. */
export function anosDisponiveis(lancamentos, anoAtual) {
  const anos = [...new Set(lancamentos.map((item) => item.data_lancamento.slice(0, 4)))];
  if (!anos.includes(anoAtual)) anos.push(anoAtual);
  return anos.sort().reverse();
}

/**
 * Lançamentos do ano e da categoria escolhidos que batem com a busca (descrição,
 * categoria ou tipo), do mais recente ao mais antigo.
 */
export function filtrarLancamentos(lancamentos, { ano, categoria, busca }) {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');

  return lancamentos
    .filter((item) => {
      const anoBate = item.data_lancamento.slice(0, 4) === ano;
      const categoriaBate = categoria === 'all' || item.categoria_id === categoria;
      const buscaBate =
        !termo ||
        (item.descricao && item.descricao.toLocaleLowerCase('pt-BR').includes(termo)) ||
        (item.categoria_nome && item.categoria_nome.toLocaleLowerCase('pt-BR').includes(termo)) ||
        (item.tipo && item.tipo.toLocaleLowerCase('pt-BR').includes(termo));

      return anoBate && categoriaBate && buscaBate;
    })
    .sort((a, b) => new Date(b.data_lancamento) - new Date(a.data_lancamento) || (b.criado_em > a.criado_em ? 1 : -1));
}

/** Agrupa por mês numa passada só: { '01': { lista, totais }, ... }. */
export function agruparPorMes(lancamentos) {
  const grupos = Object.fromEntries(MESES.map((m) => [m.value, []]));
  lancamentos.forEach((t) => grupos[t.data_lancamento.slice(5, 7)]?.push(t));
  return Object.fromEntries(Object.entries(grupos).map(([mes, lista]) => [mes, { lista, totais: somarTotais(lista) }]));
}

export function formularioVazio() {
  return {
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'saida',
    valor: '',
    categoria_id: '',
    conciliado: false,
  };
}

/** Erros por campo do formulário de lançamento ({} quando está tudo certo). */
export function validarLancamento(form) {
  const erros = {};
  if (!form.descricao.trim()) erros.descricao = 'Informe uma descrição.';
  if (!form.data) erros.data = 'Informe a data.';
  const valor = parseFloat(form.valor);
  if (Number.isNaN(valor) || valor <= 0) erros.valor = 'Informe um valor maior que zero.';
  return erros;
}

/** Corpo enviado à API para criar o lançamento. */
export function lancamentoParaApi(form) {
  return {
    descricao: form.descricao.trim(),
    data: form.data,
    tipo: form.tipo,
    valor: parseFloat(form.valor),
    conciliado: form.conciliado,
    categoria_id: form.categoria_id || null,
  };
}
