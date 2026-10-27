/**
 * Colunas de ligação ("vinculo"): cada item guarda o id de um item de outra
 * tabela, ou uma lista de ids quando a coluna aceita vários.
 */

/** Ids guardados na coluna, sempre como lista. */
export function idsLigados(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  return valor ? [valor] : [];
}

/** Nome do item ligado para mostrar ("Item sem nome" se a primeira coluna estiver vazia). */
export function tituloDoItem(titulo) {
  return titulo === null || titulo === undefined || titulo === '' ? 'Item sem nome' : titulo;
}

/**
 * Texto da coluna: os nomes dos itens ligados, separados por vírgula. Sem os
 * nomes (tabela sem acesso ou ainda carregando), diz quantos são.
 * @returns {string|null} null quando não há nada ligado
 */
export function rotuloDosLigados(valor, titulos) {
  const ids = idsLigados(valor);
  if (ids.length === 0) return null;
  if (!titulos) return `${ids.length} ${ids.length === 1 ? 'item ligado' : 'itens ligados'}`;
  return ids.map((id) => (id in titulos ? tituloDoItem(titulos[id]) : 'Item excluído')).join(', ');
}

/** Tabelas (com acesso) para onde as colunas de ligação apontam, para buscar os nomes dos itens. */
export function tabelasLigadas(campos = []) {
  return [
    ...new Set(
      campos
        .filter((c) => c.tipo === 'vinculo' && c.modulo_vinculado_id && c.modulo_vinculado?.acesso !== false)
        .map((c) => c.modulo_vinculado_id)
    ),
  ];
}

export const aceitaVarios = (campo) => !!campo?.opcoes?.multiplo;

/** Endereço que abre um item na tela da tabela dele. */
export const linkDoItem = (moduloId, itemId) => `/modulos/${moduloId}/registros?item=${encodeURIComponent(itemId)}`;
