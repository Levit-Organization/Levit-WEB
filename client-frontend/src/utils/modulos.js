/**
 * Formulário de tabela (módulo): os tipos de tabela e de coluna, os modelos
 * agrupados e o que vai para a API de cada coluna.
 */
import { MODELOS_TABELA } from './modelosTabela';

export const TIPO_INFO = {
  dados: {
    label: 'Uma lista do seu jeito',
    icon: 'table_rows',
    description: 'Clientes, pedidos, estoque, tarefas: você escolhe as colunas e pode ver como lista ou quadro.',
  },
  arquivo: {
    label: 'Arquivos e documentos',
    icon: 'folder_open',
    description: 'Um lugar para enviar e guardar arquivos da equipe, como contratos e comprovantes.',
  },
  recrutamento: {
    label: 'Vaga de recrutamento',
    icon: 'groups',
    description: 'Candidatos se inscrevem por um link e passam pelas etapas que você definir.',
  },
  financeiro: {
    label: 'Entradas e saídas',
    icon: 'account_balance_wallet',
    description: 'Controle de dinheiro que entra e sai, com categorias e saldo do período.',
  },
};

export const CAMPO_TIPO_INFO = {
  texto: { label: 'Texto', icon: 'text_fields' },
  numero: { label: 'Número', icon: 'tag' },
  data: { label: 'Data', icon: 'event' },
  selecao: { label: 'Lista de opções', icon: 'list_alt' },
  responsavel: { label: 'Responsável', icon: 'person' },
  prazo: { label: 'Prazo', icon: 'event_available' },
  recorrencia: { label: 'Repetição', icon: 'event_repeat' },
  vinculo: { label: 'Ligação com tabela', icon: 'link' },
};

/** O que cada tipo novo faz, mostrado embaixo da coluna. */
export const CAMPO_TIPO_DICA = {
  responsavel: 'A pessoa vê os itens dela em "Meus itens" e pode ser avisada pelas automações.',
  prazo: 'Itens atrasados aparecem em "Precisa da sua atenção" no Início.',
  recorrencia: 'Ao concluir o item, o Levit cria o próximo com o prazo avançado.',
  vinculo: 'Cada item aponta para itens de outra tabela, como o cliente de um pedido. Dá para filtrar pelos dados da tabela ligada.',
};

/** Modelos agrupados: primeiro os segmentos em que o Levit foca, depois os usos gerais. */
export function agruparModelos(modelos) {
  return Object.entries(
    modelos.reduce((grupos, modelo) => {
      const grupo = modelo.segmento || 'Outros usos';
      (grupos[grupo] ||= []).push(modelo);
      return grupos;
    }, {})
  );
}

export const GRUPOS_DE_MODELOS = agruparModelos(MODELOS_TABELA);

/** O que vai para a API de cada coluna. Ligação: a tabela de destino e se aceita vários itens. */
export function payloadDaColuna({ nome, tipo, opcoes, modulo_vinculado_id }) {
  if (tipo === 'vinculo') {
    return { nome, tipo, modulo_vinculado_id, opcoes: { multiplo: !!opcoes?.multiplo } };
  }
  return { nome, tipo, ...(Array.isArray(opcoes) && opcoes.length > 0 ? { opcoes } : {}) };
}

/** O que mudou numa coluna já salva (nome e/ou opções), ou null se nada mudou. */
export function alteracoesDaColuna(campo, original) {
  const nomeChanged = campo.nome !== original.nome;
  const opcoesChanged = JSON.stringify(campo.opcoes) !== JSON.stringify(original.opcoes);
  if (!nomeChanged && !opcoesChanged) return null;
  const updateData = {};
  if (nomeChanged) updateData.nome = campo.nome;
  if (opcoesChanged) updateData.opcoes = campo.opcoes;
  return updateData;
}
