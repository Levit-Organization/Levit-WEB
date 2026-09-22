import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { moduloService } from '../services/moduloService';
import { financeiroService } from '../services/financeiroService';
import Layout from '../components/Layout';
import { Badge, Card, Input, Select, Button, Alert, Drawer, Toggle } from '../components/ui';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
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
            {BRL.format(value || 0)}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBox}`}>
          <span className="material-icons text-[20px]">{icon}</span>
        </div>
      </div>
    </Card>
  );
}

function MonthCard({ monthData, selectedYear, monthTransactions, monthTotals, hasTransactions, BRL, formatDate, Badge, Card }) {
  const [open, setOpen] = useState(hasTransactions);

  return (
    <Card padding="none" className={`overflow-hidden transition-all ${hasTransactions ? 'shadow-sm' : 'opacity-70'}`}>
      {/* Header — clicável para expandir/recolher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-5 py-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-left transition-colors
          ${hasTransactions ? 'bg-background hover:bg-primary-50/40' : 'bg-background/60 hover:bg-background'}`}
      >
        <div className="flex items-center gap-3">
          <span className={`material-icons text-[18px] transition-transform ${open ? 'rotate-90' : ''} ${hasTransactions ? 'text-primary' : 'text-light-text'}`}>
            chevron_right
          </span>
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-[0.05em] ${hasTransactions ? 'text-ink' : 'text-light-text'}`}>
              {monthData.label} {selectedYear}
            </h2>
            <p className="text-xs text-light-text mt-0.5">
              {hasTransactions
                ? `${monthTransactions.length} lançamento${monthTransactions.length !== 1 ? 's' : ''}`
                : 'Nenhum lançamento'}
            </p>
          </div>
        </div>

        {hasTransactions && (
          <div className="text-xs font-semibold tabular flex items-center gap-2 pl-9 sm:pl-0">
            <span className="text-success">+{BRL.format(monthTotals.profit)}</span>
            <span className="text-faint">|</span>
            <span className="text-danger">-{BRL.format(monthTotals.expenses)}</span>
            <span className="text-faint">|</span>
            <span className={`font-bold ${monthTotals.balance >= 0 ? 'text-success' : 'text-danger'}`}>
              {monthTotals.balance >= 0 ? '+' : ''}{BRL.format(monthTotals.balance)}
            </span>
          </div>
        )}
      </button>

      {/* Tabela — visível apenas quando expandido */}
      {open && (
        <div className="border-t border-divider overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-divider bg-background">
                {['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo acum.', 'Conciliado'].map((column) => (
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
              {monthTransactions.map((item) => {
                const isIncome = item.tipo === 'entrada';
                const isConciliado = item.conciliado === 't' || item.conciliado === true;
                return (
                  <tr key={item.id} className="hover:bg-primary-50/60 transition-colors">
                    <td className="px-5 py-4 text-ink-soft tabular whitespace-nowrap">{formatDate(item.data_lancamento)}</td>
                    <td className="px-5 py-4 font-medium text-ink max-w-[280px]">
                      <span className="block truncate" title={item.descricao}>{item.descricao}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={isIncome ? 'success' : 'danger'} dot>
                        {isIncome ? 'Entrada' : 'Saída'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="default">{item.categoria_nome || 'Sem Categoria'}</Badge>
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
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function FinancialModule() {
  const { id: moduloId } = useParams();
  const [moduleName, setModuleName] = useState('Carregando...');
  const [moduleIcon, setModuleIcon] = useState('account_balance_wallet');
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'saida',
    valor: '',
    categoria_id: '',
    conciliado: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let [catsRes, lancRes] = await Promise.all([
        financeiroService.listarCategorias(),
        financeiroService.listarLancamentos(moduloId)
      ]);
      
      let fetchedCategories = Array.isArray(catsRes) ? catsRes : catsRes?.data || [];
      
      // Auto-cria as categorias solicitadas caso não existam
      const defaultCategorias = ['Fixo', 'Variável', 'Investimento', 'Receita'];
      let requiresRefetch = false;
      
      for (const cat of defaultCategorias) {
        if (!fetchedCategories.some(c => c.nome.toLowerCase() === cat.toLowerCase())) {
          try {
            await financeiroService.criarCategoria(cat);
            requiresRefetch = true;
          } catch (err) {
            console.error('Erro ao auto-criar categoria:', err);
          }
        }
      }

      if (requiresRefetch) {
        catsRes = await financeiroService.listarCategorias();
        fetchedCategories = Array.isArray(catsRes) ? catsRes : catsRes?.data || [];
      }

      setCategories(fetchedCategories);
      setTransactions(Array.isArray(lancRes.lancamentos) ? lancRes.lancamentos : lancRes?.data?.lancamentos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduloId) {
      moduloService.getById(moduloId)
        .then(mod => {
          setModuleName(mod.nome || 'Módulo Financeiro');
          if (mod.icone) setModuleIcon(mod.icone);
        })
        .catch(() => setModuleName('Módulo Financeiro'));
      
      fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [moduloId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentYear = new Date().getFullYear().toString();
  
  const years = useMemo(() => {
    const y = [...new Set(transactions.map((item) => item.data_lancamento.slice(0, 4)))];
    if (!y.includes(currentYear)) y.push(currentYear);
    return y.sort().reverse();
  }, [transactions, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  const ALL_MONTHS = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const visibleTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    
    return transactions.filter((item) => {
      const yearMatches = item.data_lancamento.slice(0, 4) === selectedYear;
      const categoryMatches = selectedCategory === 'all' || item.categoria_id === selectedCategory;
      const searchMatches =
        !normalizedSearch ||
        (item.descricao && item.descricao.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) ||
        (item.categoria_nome && item.categoria_nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) ||
        (item.tipo && item.tipo.toLocaleLowerCase('pt-BR').includes(normalizedSearch));

      return yearMatches && categoryMatches && searchMatches;
    }).sort((a, b) => new Date(b.data_lancamento) - new Date(a.data_lancamento) || (b.criado_em > a.criado_em ? 1 : -1));
  }, [transactions, selectedYear, selectedCategory, search]);

  const visibleTotals = useMemo(() => {
    return visibleTransactions.reduce(
      (acc, item) => {
        const val = parseFloat(item.valor) || 0;
        if (item.tipo === 'entrada') acc.profit += val;
        if (item.tipo === 'saida') acc.expenses += val;
        acc.balance = acc.profit - acc.expenses;
        return acc;
      },
      { profit: 0, expenses: 0, balance: 0 }
    );
  }, [visibleTransactions]);

  const handleOpenModal = () => {
    setFormData({
      descricao: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'saida',
      valor: '',
      categoria_id: '',
      conciliado: false
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    
    try {
      const payload = {
        descricao: formData.descricao,
        data: formData.data,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        conciliado: formData.conciliado,
        categoria_id: formData.categoria_id || null
      };
      
      await financeiroService.criarLancamento(moduloId, payload);
      setIsModalOpen(false);
      fetchData(); // recarrega a lista real e o saldo global da api
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Erro ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <section className="animate-page-in relative">
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
                  <span className="material-icons text-[22px]">{moduleIcon}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-ink">{moduleName}</h1>
                  <p className="text-sm text-light-text mt-1">
                    Acompanhe entradas, saídas e o resultado financeiro do módulo.
                  </p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleOpenModal} icon="add">
              Novo Lançamento
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Total de Entradas (Visível)" value={visibleTotals.profit} tone="profit" icon="trending_up" />
          <SummaryCard label="Total de Saídas (Visível)" value={visibleTotals.expenses} tone="expense" icon="trending_down" />
          <SummaryCard label="Saldo do Período (Visível)" value={visibleTotals.balance} tone="balance" icon="account_balance" />
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
                    ...['Fixo', 'Variável', 'Investimento', 'Receita'].map((catName) => {
                      const found = categories.find((c) => c.nome.toLowerCase() === catName.toLowerCase());
                      return { value: found ? found.id : catName, label: catName };
                    }),
                  ]}
                />
              </div>

              <div className="sm:min-w-[190px]">
                <Select
                  label="Ano"
                  icon="calendar_month"
                  value={selectedYear}
                  onChange={(event) => {
                    setSelectedYear(event.target.value);
                  }}
                  options={years.map((year) => ({ value: year, label: year }))}
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

        {loading ? (
          <Card padding="none" className="overflow-hidden">
            <div className="py-14 px-5 text-center text-light-text">Carregando lançamentos...</div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {ALL_MONTHS.map((monthData) => {
              const monthTransactions = visibleTransactions.filter(t => t.data_lancamento.slice(5, 7) === monthData.value);
              const hasTransactions = monthTransactions.length > 0;

              const monthTotals = monthTransactions.reduce(
                (acc, item) => {
                  const val = parseFloat(item.valor) || 0;
                  if (item.tipo === 'entrada') acc.profit += val;
                  if (item.tipo === 'saida') acc.expenses += val;
                  acc.balance = acc.profit - acc.expenses;
                  return acc;
                },
                { profit: 0, expenses: 0, balance: 0 }
              );

              return (
                <MonthCard
                  key={monthData.value}
                  monthData={monthData}
                  selectedYear={selectedYear}
                  monthTransactions={monthTransactions}
                  monthTotals={monthTotals}
                  hasTransactions={hasTransactions}
                  BRL={BRL}
                  formatDate={formatDate}
                  Badge={Badge}
                  Card={Card}
                />
              );
            })}
          </div>
        )}

        <Drawer
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Novo Lançamento"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
              <Button onClick={handleSave} loading={isSaving}>Salvar Lançamento</Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
            
            <Input 
              label="Descrição" 
              value={formData.descricao} 
              onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
              required 
              placeholder="Ex: Pagamento de fornecedor" 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                type="date" 
                label="Data" 
                value={formData.data} 
                onChange={(e) => setFormData({...formData, data: e.target.value})} 
                required 
              />
              
              <Input 
                type="number" 
                step="0.01"
                min="0.01"
                label="Valor (R$)" 
                value={formData.valor} 
                onChange={(e) => setFormData({...formData, valor: e.target.value})} 
                required 
                placeholder="0.00" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Tipo" 
                value={formData.tipo} 
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                options={[
                  {value: 'saida', label: 'saída (Despesa)'},
                  {value: 'entrada', label: 'Entrada (Receita)'},
                ]}
              />
              
              <Select 
                label="Categoria" 
                value={formData.categoria_id} 
                onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                options={[
                  {value: '', label: 'Selecione...'},
                  ...['Fixo', 'Variável', 'Investimento', 'Receita'].map((catName) => {
                    const found = categories.find((c) => c.nome.toLowerCase() === catName.toLowerCase());
                    return { value: found ? found.id : catName, label: catName };
                  }),
                ]}
              />
            </div>

            <div className="pt-2">
              <Toggle 
                label="Lançamento Conciliado"
                description="Marque se este valor já foi efetivamente pago/recebido na conta."
                checked={formData.conciliado}
                onChange={(val) => setFormData({...formData, conciliado: val})}
              />
            </div>
          </div>
        </Drawer>
        
      </section>
    </Layout>
  );
}




