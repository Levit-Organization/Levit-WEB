import { useState } from 'react';
import { Button, Card } from '../ui';
import { BRL } from '../../utils/financeiro';
import LinhaLancamento from './LinhaLancamento';

const LINHAS_POR_LOTE = 50;
const COLUNAS = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo acum.', 'Conciliado'];
const COLUNAS_A_DIREITA = ['Valor', 'Saldo acum.'];

/** Lançamentos de um mês: cabeçalho com os totais (expande/recolhe) e a tabela, 50 linhas por vez. */
export default function CartaoDoMes({ monthData, selectedYear, monthTransactions, monthTotals }) {
  const [open, setOpen] = useState(true);
  const [limite, setLimite] = useState(LINHAS_POR_LOTE);
  const visiveis = monthTransactions.length > limite ? monthTransactions.slice(0, limite) : monthTransactions;
  const restantes = monthTransactions.length - visiveis.length;
  const painelId = `mes-${monthData.value}`;

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header — clicável para expandir/recolher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={painelId}
        className="w-full px-5 py-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-left bg-background hover:bg-primary-50/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`material-icons text-[18px] text-primary transition-transform ${open ? 'rotate-90' : ''}`}>
            chevron_right
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">
              {monthData.label} {selectedYear}
            </h2>
            <p className="text-xs text-light-text mt-0.5">
              {monthTransactions.length} lançamento{monthTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold tabular flex items-center gap-2 pl-9 sm:pl-0">
          <span className="text-success">+{BRL.format(monthTotals.profit)}</span>
          <span className="text-faint">|</span>
          <span className="text-danger">-{BRL.format(monthTotals.expenses)}</span>
          <span className="text-faint">|</span>
          <span className={`font-bold ${monthTotals.balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {monthTotals.balance >= 0 ? '+' : ''}{BRL.format(monthTotals.balance)}
          </span>
        </div>
      </button>

      {/* Tabela — visível apenas quando expandido */}
      {open && (
        <div id={painelId} className="border-t border-divider overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-divider bg-background">
                {COLUNAS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className={`th-label px-5 py-3 ${COLUNAS_A_DIREITA.includes(column) ? 'text-right' : 'text-left'}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {visiveis.map((item) => (
                <LinhaLancamento key={item.id} item={item} />
              ))}
            </tbody>
          </table>
          {restantes > 0 && (
            <div className="border-t border-divider p-3 text-center">
              <Button variant="ghost" size="sm" onClick={() => setLimite((l) => l + LINHAS_POR_LOTE)}>
                Mostrar mais {Math.min(restantes, LINHAS_POR_LOTE)} de {restantes} lançamentos
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
