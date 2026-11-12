import { useMemo, useState } from 'react';
import { opcaoDeConclusao } from '../utils/prazos';

const CHAVE_PREFERENCIA = (id) => `levit_visao_${id}`;

/** Lista ou quadro, por tabela. Conveniência local: falhar ao ler/gravar não quebra nada. */
function lerPreferencia(id) {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIA(id))) || {};
  } catch {
    return {};
  }
}

function salvarPreferencia(id, valor) {
  try {
    localStorage.setItem(CHAVE_PREFERENCIA(id), JSON.stringify(valor));
  } catch {
    // armazenamento indisponível: só não lembra a escolha
  }
}

/**
 * Visão em quadro: disponível quando a tabela tem uma coluna de lista, e cada
 * opção vira uma coluna do quadro. A escolha (lista/quadro e coluna) fica
 * lembrada por tabela.
 */
export function useVisaoDaTabela(id, campos) {
  const camposLista = useMemo(() => campos.filter((c) => c.tipo === 'selecao' && c.opcoes?.length), [campos]);
  // Por tabela: trocar de tabela mantém a tela montada (mesma rota, outro id).
  const [preferencias, setPreferencias] = useState({});
  const preferencia = preferencias[id] ?? lerPreferencia(id);
  const podeQuadro = camposLista.length > 0;
  const visao = podeQuadro && preferencia.visao === 'quadro' ? 'quadro' : 'lista';
  // Sem escolha salva, agrupa pela lista que é o andamento do trabalho (a que
  // tem uma opção de conclusão, como "Entregue"), não pela primeira que houver.
  const campoGrupo =
    camposLista.find((c) => c.id === preferencia.campo) ||
    camposLista.find((c) => c.opcoes.some(opcaoDeConclusao)) ||
    camposLista[0];
  const mudarPreferencia = (parcial) => {
    const nova = { ...preferencia, ...parcial };
    setPreferencias((atual) => ({ ...atual, [id]: nova }));
    salvarPreferencia(id, nova);
  };

  return { camposLista, podeQuadro, visao, campoGrupo, mudarPreferencia };
}
