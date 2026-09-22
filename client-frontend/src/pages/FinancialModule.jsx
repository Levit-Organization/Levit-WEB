import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { Badge, Card, Input, Select } from '../components/ui';

const DEFAULT_TRANSACTIONS = [
  { id: 1, date: '2026-04-01', description: 'Aporte inicial', type: 'entrada', category: 'Receita', amount: 30000, completed: true },
  { id: 2, date: '2026-04-02', description: 'Marketing digital', type: 'saida', category: 'Variável', amount: 1300, completed: true },
  { id: 3, date: '2026-04-05', description: 'Rendimento de aplicação', type: 'entrada', category: 'Receita', amount: 3400, completed: true },
  { id: 4, date: '2026-04-08', description: 'Impostos e taxas', type: 'saida', category: 'Fixo', amount: 5600, completed: true },
  { id: 5, date: '2026-04-10', description: 'Recebimento de serviço', type: 'entrada', category: 'Receita', amount: 15000, completed: true },
  { id: 6, date: '2026-04-12', description: 'Consultoria financeira', type: 'saida', category: 'Variável', amount: 2400, completed: true },
  { id: 7, date: '2026-04-15', description: 'Assinatura de software', type: 'saida', category: 'Variável', amount: 980, completed: true },
  { id: 8, date: '2026-04-18', description: 'Compra de equipamentos', type: 'saida', category: 'Investimento', amount: 7500, completed: true },
  { id: 9, date: '2026-04-20', description: 'Aluguel do escritório', type: 'saida', category: 'Fixo', amount: 3200, completed: true },
  { id: 10, date: '2026-04-22', description: 'Recebimento de cliente', type: 'entrada', category: 'Receita', amount: 9300, completed: true },
  { id: 11, date: '2026-04-25', description: 'Salário da equipe', type: 'saida', category: 'Fixo', amount: 12000, completed: true },
  { id: 12, date: '2026-04-27', description: 'Serviços terceirizados', type: 'saida', category: 'Variável', amount: 17020, completed: false },
  { id: 13, date: '2026-04-28', description: 'Pagamento de fornecedor', type: 'saida', category: 'Variável', amount: 4800, completed: true },
  { id: 14, date: '2026-04-30', description: 'Receita de vendas', type: 'entrada', category: 'Receita', amount: 18500, completed: true },
];

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function formatDate(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function getMonthKey(dateString) {
  return dateString.slice(0, 7);
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const label = MONTH_LABEL.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function SummaryCard({ label, value, tone, icon }) {
  const tones = {
    profit: {
      accent: 'bg-success',
      iconBox: 'bg-success-bg text-success',
      value: 'text-success',
    },
    expense: {
      accent: 'bg-danger',
      iconBox: 'bg-danger-bg text-danger',
      value: 'text-danger',
    },
    balance: {
      accent: 'bg-primary',
      iconBox: 'bg-primary-100 text-primary',
      value: 'text-primary-700',
    },
  };

  const styles = tones[tone] || tones.balance;

  return (
    <Card padding="none" className="relative overflow-hidden p-5 min-h-[122px]">
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4 pl-1">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-light-text">
            {label}
          </p>
          <p className={`mt-3 text-2xl sm:text-3xl font-bold tabular tracking-tight ${styles.value}`}>
            {BRL.format(value)}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBox}`}>
          <span className="material-icons text-[20px]">{icon}</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Protótipo isolado do módulo Financeiro.
 *
 * Ele foi mantido autocontido de propósito: não altera rotas, services,
 * ModuleForm ou qualquer outra parte do projeto. Para integrar posteriormente,
 * basta passar os lançamentos reais via `transactions` e o nome do módulo de
 * origem via `sourceModuleName`.
 */
export default function FinancialModule({
  moduleName = 'Fluxo de Caixa',
  sourceModuleName = 'Módulo de Operações',
  transactions = DEFAULT_TRANSACTIONS,
}) {
  const months = useMemo(() => {
    return [...new Set(transactions.map((item) => getMonthKey(item.date)))].sort().reverse();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(months[0] || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  const periodTransactions = useMemo(() => {
    return transactions.filter((item) => !selectedMonth || getMonthKey(item.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  const categories = useMemo(() => {
    return [...new Set(periodTransactions.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [periodTransactions]);

  const totals = useMemo(() => {
    return periodTransactions.reduce(
      (acc, item) => {
        if (item.type === 'entrada') acc.profit += item.amount;
        if (item.type === 'saida') acc.expenses += item.amount;
        acc.balance = acc.profit - acc.expenses;
        return acc;
      },
      { profit: 0, expenses: 0, balance: 0 }
    );
  }, [periodTransactions]);

  const transactionsWithBalance = useMemo(() => {
    let runningBalance = 0;

    return [...periodTransactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id)
      .map((item) => {
        runningBalance += item.type === 'entrada' ? item.amount : -item.amount;
        return { ...item, accumulatedBalance: runningBalance };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
  }, [periodTransactions]);

  const visibleTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return transactionsWithBalance.filter((item) => {
      const categoryMatches = selectedCategory === 'all' || item.category === selectedCategory;
      const searchMatches =
        !normalizedSearch ||
        item.description.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
        item.category.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
        item.type.toLocaleLowerCase('pt-BR').includes(normalizedSearch);

      return categoryMatches && searchMatches;
    });
  }, [transactionsWithBalance, selectedCategory, search]);

  return (
    <Layout>
      <section className="animate-page-in">
        <header className="mb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-light-text mb-2">
                <span>Meus Módulos</span>
                <span className="material-icons text-[14px]">chevron_right</span>
                <span className="font-semibold text-ink-soft">Módulo Financeiro</span>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0">
                  <span className="material-icons text-[22px]">account_balance_wallet</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-ink">{moduleName}</h1>
                  <p className="text-sm text-light-text mt-1">
                    Acompanhe entradas, saídas e o resultado financeiro do módulo conectado.
                  </p>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2.5 rounded-xl border border-divider bg-surface px-4 py-3 shadow-xs self-start lg:self-auto">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
                <span className="material-icons text-[17px]">link</span>
              </div>
              <div className="min-w-0">
                <p className="text-2xs uppercase tracking-[0.07em] font-semibold text-light-text">Conectado a</p>
                <p className="text-sm font-semibold text-ink truncate max-w-[240px]">{sourceModuleName}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Total de lucro" value={totals.profit} tone="profit" icon="trending_up" />
          <SummaryCard label="Total de gastos" value={totals.expenses} tone="expense" icon="trending_down" />
          <SummaryCard label="Saldo do período" value={totals.balance} tone="balance" icon="account_balance" />
        </div>

        <Card padding="md" className="mb-5">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full xl:w-auto">
              <div className="sm:min-w-[220px]">
                <Select
                  label="Filtrar por categoria"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  options={[
                    { value: 'all', label: 'Todas as categorias' },
                    ...categories.map((category) => ({ value: category, label: category })),
                  ]}
                />
              </div>

              <div className="sm:min-w-[190px]">
                <Select
                  label="Período"
                  icon="calendar_month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                    setSelectedCategory('all');
                  }}
                  options={months.map((month) => ({ value: month, label: formatMonth(month) }))}
                />
              </div>
            </div>

            <div className="w-full xl:max-w-sm">
              <Input
                label="Buscar lançamento"
                type="search"
                icon="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Descrição, categoria ou tipo..."
              />
            </div>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-divider flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink uppercase tracking-[0.05em]">
                {selectedMonth ? formatMonth(selectedMonth) : 'Lançamentos'}
              </h2>
              <p className="text-xs text-light-text mt-0.5">
                {visibleTransactions.length} lançamento{visibleTransactions.length !== 1 ? 's' : ''} exibido{visibleTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="text-xs font-semibold tabular flex items-center gap-2">
              <span className="text-light-text uppercase tracking-[0.05em]">Subtotal:</span>
              <span className="text-success">+{BRL.format(totals.profit)}</span>
              <span className="text-faint">|</span>
              <span className="text-danger">-{BRL.format(totals.expenses)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-divider bg-background">
                  {['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo acum.', 'Conclusão'].map((column) => (
                    <th
                      key={column}
                      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-light-text ${
                        ['Valor', 'Saldo acum.'].includes(column) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-divider">
                {visibleTransactions.map((item) => {
                  const isIncome = item.type === 'entrada';

                  return (
                    <tr key={item.id} className="hover:bg-primary-50/60 transition-colors">
                      <td className="px-5 py-4 text-ink-soft tabular whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-5 py-4 font-medium text-ink max-w-[280px]">
                        <span className="block truncate" title={item.description}>{item.description}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={isIncome ? 'success' : 'danger'} dot>
                          {isIncome ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="default">{item.category}</Badge>
                      </td>
                      <td className={`px-5 py-4 text-right font-semibold tabular whitespace-nowrap ${isIncome ? 'text-success' : 'text-danger'}`}>
                        {isIncome ? '' : '-'}{BRL.format(item.amount)}
                      </td>
                      <td className={`px-5 py-4 text-right font-semibold tabular whitespace-nowrap ${item.accumulatedBalance >= 0 ? 'text-ink' : 'text-danger'}`}>
                        {BRL.format(item.accumulatedBalance)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={item.completed ? 'info' : 'warning'}>
                          {item.completed ? 'Sim' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleTransactions.length === 0 && (
            <div className="py-14 px-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary-100 text-primary flex items-center justify-center mb-3">
                <span className="material-icons text-[24px]">search_off</span>
              </div>
              <p className="font-semibold text-ink">Nenhum lançamento encontrado</p>
              <p className="text-sm text-light-text mt-1">Altere os filtros ou tente outro termo de busca.</p>
            </div>
          )}
        </Card>
      </section>
    </Layout>
  );
}
