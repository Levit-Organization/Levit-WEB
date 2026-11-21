import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import SeloPrazo from '../prazos/SeloPrazo';
import PessoaResponsavel from '../prazos/PessoaResponsavel';
import { itemConcluido } from '../../utils/prazos';
import { rotuloDaRepeticao } from '../../utils/recorrencia';
import { idsLigados, linkDoItem, tituloDoItem } from '../../utils/vinculos';

/** Uma célula da tabela de itens, formatada conforme o tipo da coluna. Vazia vira "--". */
export default function CelulaDoRegistro({ registro, coluna, campos, titulosLigados }) {
  const valor = coluna.ler(registro);
  const vazio = valor === null || valor === undefined || valor === '';
  let exibicao = valor;
  if (coluna.key === 'criado_em') exibicao = valor ? new Date(valor).toLocaleDateString('pt-BR') : null;
  const textoVazio = exibicao === null || exibicao === undefined || exibicao === '';
  if (!textoVazio && coluna.tipo === 'prazo') {
    exibicao = <SeloPrazo data={valor} concluido={itemConcluido(registro.dados, campos)} />;
  }
  if (!textoVazio && coluna.tipo === 'recorrencia') {
    exibicao = (
      <span className="inline-flex items-center gap-1 text-ink-soft">
        <span className="material-icons text-[16px] text-primary" aria-hidden="true">event_repeat</span>
        {rotuloDaRepeticao(valor) ?? valor}
      </span>
    );
  }
  if (!textoVazio && coluna.tipo === 'responsavel') {
    exibicao = <PessoaResponsavel nome={valor} />;
  }
  // Ligação: cada item ligado é um link para ele na tabela dele.
  const mapaLigados = coluna.tipo === 'vinculo' ? titulosLigados[coluna.campo.modulo_vinculado_id] : null;
  if (!textoVazio && mapaLigados) {
    exibicao = idsLigados(registro.dados?.[coluna.key]).map((itemId, i) => (
      <Fragment key={itemId}>
        {i > 0 && ', '}
        {itemId in mapaLigados ? (
          <Link to={linkDoItem(coluna.campo.modulo_vinculado_id, itemId)} className="text-primary-700 hover:underline">
            {tituloDoItem(mapaLigados[itemId])}
          </Link>
        ) : (
          'Item excluído'
        )}
      </Fragment>
    ));
  }

  return (
    <td
      className={`px-4 py-3 truncate max-w-[200px] ${
        coluna.key === 'criado_em' ? 'text-light-text text-xs' : ''
      }`}
      title={vazio ? undefined : String(valor)}
    >
      {textoVazio ? <span className="text-light-text">--</span> : exibicao}
    </td>
  );
}
