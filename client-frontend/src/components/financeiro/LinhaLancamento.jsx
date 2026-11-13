import { Badge } from '../ui';
import { BRL, formatarData } from '../../utils/financeiro';

/** Uma linha da tabela de lançamentos do mês. */
export default function LinhaLancamento({ item }) {
  const isIncome = item.tipo === 'entrada';
  const isConciliado = item.conciliado === 't' || item.conciliado === true;

  return (
    <tr className="hover:bg-primary-50/60 transition-colors">
      <td className="px-5 py-4 text-ink-soft tabular whitespace-nowrap">{formatarData(item.data_lancamento)}</td>
      <td className="px-5 py-4 font-medium text-ink max-w-[280px]">
        <span className="block truncate" title={item.descricao}>{item.descricao}</span>
      </td>
      <td className="px-5 py-4">
        <Badge variant={isIncome ? 'success' : 'danger'} dot>
          {isIncome ? 'Entrada' : 'Saída'}
        </Badge>
      </td>
      <td className="px-5 py-4">
        <Badge variant="default">{item.categoria_nome || 'Sem categoria'}</Badge>
      </td>
      <td className={`px-5 py-4 text-right font-semibold tabular whitespace-nowrap ${isIncome ? 'text-success' : 'text-danger'}`}>
        {isIncome ? '' : '-'}{BRL.format(parseFloat(item.valor))}
      </td>
      <td className={`px-5 py-4 text-right font-semibold tabular whitespace-nowrap ${parseFloat(item.saldo_acumulado) >= 0 ? 'text-ink' : 'text-danger'}`}>
        {BRL.format(parseFloat(item.saldo_acumulado))}
      </td>
      <td className="px-5 py-4">
        <Badge variant={isConciliado ? 'info' : 'warning'}>
          {isConciliado ? 'Sim' : 'Pendente'}
        </Badge>
      </td>
    </tr>
  );
}
