/**
 * Pesquisa avançada de uma tabela: o que dá para filtrar (colunas desta tabela,
 * das tabelas para onde ela aponta e das que apontam para ela), os operadores
 * de cada tipo e a conversão para o formato da API ({ logica, regras }).
 * Espelha api-backend/app/Services/Pesquisa/Filtros.php.
 */

export const MAX_FILTROS = 20;

const IGUALDADE = ['igual', 'diferente', 'vazio', 'preenchido'];
const ORDEM = ['igual', 'diferente', 'maior', 'menor', 'entre', 'vazio', 'preenchido'];

const OPERADORES_POR_TIPO = {
  texto: ['contem', 'nao_contem', 'igual', 'diferente', 'vazio', 'preenchido'],
  numero: ORDEM,
  data: ORDEM,
  prazo: ORDEM,
  momento: ORDEM, // "Criado em"
  selecao: IGUALDADE,
  responsavel: IGUALDADE,
  recorrencia: IGUALDADE,
  vinculo: IGUALDADE,
  // Itens de outra tabela que apontam para este: só "tem algum" ou "nenhum".
  ligacao: ['preenchido', 'vazio'],
};

const ROTULOS = {
  igual: 'é igual a',
  diferente: 'é diferente de',
  contem: 'contém',
  nao_contem: 'não contém',
  maior: 'maior que',
  menor: 'menor que',
  entre: 'entre',
  vazio: 'está vazio',
  preenchido: 'está preenchido',
};

const ROTULOS_POR_TIPO = {
  data: { igual: 'é em', diferente: 'não é em', maior: 'depois de', menor: 'antes de' },
  vinculo: { igual: 'é', diferente: 'não é' },
  ligacao: { preenchido: 'tem algum item', vazio: 'não tem nenhum item' },
};
ROTULOS_POR_TIPO.prazo = ROTULOS_POR_TIPO.data;
ROTULOS_POR_TIPO.momento = ROTULOS_POR_TIPO.data;

export const OPERADORES_SEM_VALOR = ['vazio', 'preenchido'];

/** [{ value, label }] dos operadores que valem para o tipo da coluna. */
export function operadoresDoTipo(tipo) {
  return (OPERADORES_POR_TIPO[tipo] ?? IGUALDADE).map((op) => ({
    value: op,
    label: ROTULOS_POR_TIPO[tipo]?.[op] ?? ROTULOS[op],
  }));
}

export const operadorPadrao = (tipo) => operadoresDoTipo(tipo)[0].value;

export const filtrosVazios = () => ({ logica: 'e', regras: [] });

export const novoFiltro = () => ({ alvo: '', operador: '', valor: '', valor_ate: '' });

/**
 * Tudo o que dá para filtrar numa tabela, em grupos:
 * - as colunas dela e "Criado em";
 * - as colunas de cada tabela que ela aponta ("Cliente › Cidade");
 * - as tabelas que apontam para ela ("Pedidos ligados": tem algum, nenhum,
 *   ou algum com uma coluna que atende).
 * Tabela ligada sem acesso não aparece.
 *
 * @returns {{ chave: string, grupo: string, rotulo: string, campo: object, via: object[] }[]}
 */
export function alvosDoFiltro(modulo) {
  if (!modulo) return [];
  const campos = modulo.campos ?? [];

  const alvos = [
    ...campos.map((campo) => ({ chave: campo.id, grupo: 'Esta tabela', rotulo: campo.nome, campo, via: [] })),
    {
      chave: 'criado_em',
      grupo: 'Esta tabela',
      rotulo: 'Criado em',
      campo: { id: 'criado_em', nome: 'Criado em', tipo: 'momento' },
      via: [],
    },
  ];

  campos
    .filter((c) => c.tipo === 'vinculo' && c.modulo_vinculado?.acesso)
    .forEach((ligacao) => {
      const via = [{ campo: ligacao.id, sentido: 'ida' }];
      const grupo = `${ligacao.nome} (tabela ${ligacao.modulo_vinculado.nome})`;
      ligacao.modulo_vinculado.campos.forEach((campo) => {
        alvos.push({ chave: `${ligacao.id}>${campo.id}`, grupo, rotulo: `${ligacao.nome} › ${campo.nome}`, campo, via });
      });
    });

  (modulo.ligacoes_recebidas ?? []).forEach((recebida) => {
    const via = [{ campo: recebida.campo_id, sentido: 'volta' }];
    const nome = recebida.modulo.nome;
    const grupo = `${nome} ligados pela coluna “${recebida.campo_nome}”`;
    alvos.push({
      chave: `${recebida.campo_id}<`,
      grupo,
      rotulo: `${nome} ligados`,
      campo: { id: '', nome, tipo: 'ligacao' },
      via,
    });
    recebida.modulo.campos.forEach((campo) => {
      alvos.push({ chave: `${recebida.campo_id}<${campo.id}`, grupo, rotulo: `Algum de ${nome} › ${campo.nome}`, campo, via });
    });
  });

  return alvos;
}

const preenchido = (v) => String(v ?? '').trim() !== '';

/** A regra tem tudo o que precisa para ir à API (as incompletas são ignoradas). */
export function regraCompleta(regra, alvo) {
  if (!alvo || !operadoresDoTipo(alvo.campo.tipo).some((o) => o.value === regra.operador)) return false;
  if (OPERADORES_SEM_VALOR.includes(regra.operador)) return true;
  return preenchido(regra.valor) && (regra.operador !== 'entre' || preenchido(regra.valor_ate));
}

/** Filtros da tela no formato da API. null = nada para filtrar. */
export function filtrosParaApi(filtros, alvos) {
  const porChave = new Map(alvos.map((a) => [a.chave, a]));
  const regras = (filtros?.regras ?? []).flatMap((regra) => {
    const alvo = porChave.get(regra.alvo);
    if (!regraCompleta(regra, alvo)) return [];
    const convertida = { campo: alvo.campo.id, operador: regra.operador };
    if (!OPERADORES_SEM_VALOR.includes(regra.operador)) convertida.valor = String(regra.valor).trim();
    if (regra.operador === 'entre') convertida.valor_ate = String(regra.valor_ate).trim();
    if (alvo.via.length > 0) convertida.via = alvo.via;
    return [convertida];
  });
  return regras.length > 0 ? { logica: filtros.logica === 'ou' ? 'ou' : 'e', regras } : null;
}
