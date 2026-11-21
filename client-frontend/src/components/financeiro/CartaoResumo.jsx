import { Card } from '../ui';
import { BRL } from '../../utils/financeiro';

const CORES = {
  profit: 'text-success',
  expense: 'text-danger',
  balance: 'text-ink',
};

/** Total do topo da tela (entradas, saídas ou saldo). */
export default function CartaoResumo({ label, value, tone }) {
  return (
    <Card padding="md">
      <p className="text-sm text-light-text">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular tracking-tight ${CORES[tone] || CORES.balance}`}>
        {BRL.format(value || 0)}
      </p>
    </Card>
  );
}
