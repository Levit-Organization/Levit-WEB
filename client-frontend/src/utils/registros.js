/**
 * Tabela de registros (itens) de uma tabela de dados: quais colunas aparecem,
 * como ler o valor de cada uma e como ordenar.
 */
import { rotuloDosLigados } from './vinculos';

const COLATOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** Nome do tipo de cada coluna, mostrado ao lado do nome no formulário do item. */
export const ROTULO_DO_TIPO = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  selecao: 'Seleção',
  responsavel: 'Pessoa da equipe',
  prazo: 'Data',
  recorrencia: 'Repetição',
  vinculo: 'Ligação',
};

/**
 * Colunas da tabela: até 5 (o formulário mostra todas), mas Responsável e
 * Prazo sempre aparecem, porque dizem de quem é e até quando. Fecha com "Criado em".
 * `nomes`: { [pessoaId]: nome }; `titulosLigados`: { [moduloId]: { [itemId]: titulo } }.
 */
export function colunasDaTabela(campos, nomes, titulosLigados) {
  const visiveis = campos.filter(
    (campo, i) => i < 5 || campo.tipo === 'responsavel' || campo.tipo === 'prazo'
  );
  return [
    ...visiveis.map((campo) => ({
      key: campo.id,
      titulo: campo.nome,
      tipo: campo.tipo,
      campo,
      ler:
        campo.tipo === 'responsavel'
          ? (r) => nomes[r.dados?.[campo.id]]
          : campo.tipo === 'vinculo'
            ? (r) => rotuloDosLigados(r.dados?.[campo.id], titulosLigados[campo.modulo_vinculado_id])
            : (r) => r.dados?.[campo.id],
    })),
    { key: 'criado_em', titulo: 'Criado em', tipo: 'data', ler: (r) => r.criado_em },
  ];
}

function valorOrdenavel(registro, coluna) {
  const bruto = coluna.ler(registro);
  if (bruto === null || bruto === undefined || bruto === '') return null;
  if (coluna.tipo === 'numero') {
    const n = Number(bruto);
    return Number.isNaN(n) ? null : n;
  }
  return String(bruto);
}

/** Comparador para `sort`: números pelo valor, o resto pela ordem do pt-BR. */
export function compararRegistros(a, b, coluna, direcao) {
  const va = valorOrdenavel(a, coluna);
  const vb = valorOrdenavel(b, coluna);
  // Vazios sempre no fim, qualquer que seja a direção.
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const resultado = typeof va === 'number' && typeof vb === 'number' ? va - vb : COLATOR.compare(va, vb);
  return direcao === 'asc' ? resultado : -resultado;
}

/** Clicar no cabeçalho: crescente, depois decrescente, depois sem ordem. */
export function proximaOrdem(atual, key) {
  if (atual?.key !== key) return { key, direcao: 'asc' };
  return atual.direcao === 'asc' ? { key, direcao: 'desc' } : null;
}
