import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeiroService } from '../services/financeiroService';
import Layout from '../components/Layout';
import { Badge, Card, Input, Select, Button, Alert, Drawer, Toggle, ErrorState, Skeleton } from '../components/ui';
import { useModulo } from '../hooks/queries';
import { useToast } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

const CATEGORIAS_PADRAO = ['Fixo', 'Variável', 'Investimento', 'Receita'];
const LINHAS_POR_LOTE = 50;
const SEM_DADOS = [];

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
          <span className="material-icons text-[20px]" aria-hidden="true">{icon}</span>
        </div>
      </div>
    </Card>
  );
}

function MonthCard({ monthData, selectedYear, monthTransactions, monthTotals, hasTransactions, BRL, formatDate, Badge, Card }) {
  const [open, setOpen] = useState(hasTransactions);
  const [limite, setLimite] = useState(LINHAS_POR_LOTE);
  const visiveis = monthTransactions.length > limite ? monthTransactions.slice(0, limite) : monthTransactions;
  const restantes = monthTransactions.length - visiveis.length;
  const painelId = `mes-${monthData.value}`;

  return (
    <Card padding="none" className={`overflow-hidden transition-all ${hasTransactions ? 'shadow-sm' : 'opacity-70'}`}>
      {/* Header — clicável para expandir/recolher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={painelId}
        className={`w-full px-5 py-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-left transition-colors
          ${hasTransactions ? 'bg-background hover:bg-primary-50/40' : 'bg-background/60 hover:bg-background'}`}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`material-icons text-[18px] transition-transform ${open ? 'rotate-90' : ''} ${hasTransactions ? 'text-primary' : 'text-light-text'}`}>
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
        <div id={painelId} className="border-t border-divider overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-divider bg-background">
                {['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo acum.', 'Conciliado'].map((column) => (
                  <th
                    key={column}
                    scope="col"
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
              {visiveis.map((item) => {
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

function somarTotais(lista) {
  return lista.reduce(
    (acc, item) => {
      const val = parseFloat(item.valor) || 0;
      if (item.tipo === 'entrada') acc.profit += val;
      if (item.tipo === 'saida') acc.expenses += val;
      acc.balance = acc.profit - acc.expenses;
      return acc;
    },
    { profit: 0, expenses: 0, balance: 0 }
  );
}

/**
 * Categorias + lançamentos numa consulta só. As categorias padrão são criadas
 * na primeira visita (como antes); `skipInvalidate` evita que essas criações
 * invalidem a própria consulta e causem um segundo fetch.
 */
async function carregarFinanceiro(moduloId) {
  const [catsRes, lancRes] = await Promise.all([
    financeiroService.listarCategorias(),
    financeiroService.listarLancamentos(moduloId),
  ]);

  let categorias = Array.isArray(catsRes) ? catsRes : catsRes?.data || [];

  const faltando = CATEGORIAS_PADRAO.filter(
    (nome) => !categorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase())
  );
  if (faltando.length > 0) {
    const criacoes = await Promise.allSettled(
      faltando.map((nome) => financeiroService.criarCategoria(nome, { skipInvalidate: true }))
    );
    if (criacoes.some((r) => r.status === 'fulfilled')) {
      const atualizadas = await financeiroService.listarCategorias();
      categorias = Array.isArray(atualizadas) ? atualizadas : atualizadas?.data || [];
    }
  }

  return {
    categorias,
    lancamentos: Array.isArray(lancRes?.lancamentos) ? lancRes.lancamentos : lancRes?.data?.lancamentos || [],
  };
}

export default function FinancialModule() {
  const { id: moduloId } = useParams();
  const toast = useToast();

  const moduloQuery = useModulo(moduloId);
  const moduleName = moduloQuery.data?.nome || (moduloQuery.isError ? 'Financeiro' : 'Carregando...');
  const moduleIcon = moduloQuery.data?.icone || 'account_balance_wallet';

  const financeiroQuery = useQuery({
    queryKey: ['financeiro', moduloId],
    queryFn: () => carregarFinanceiro(moduloId),
    enabled: !!moduloId,
  });
  const loading = financeiroQuery.isLoading;
  const transactions = financeiroQuery.data?.lancamentos ?? SEM_DADOS;
  const categories = financeiroQuery.data?.categorias ?? SEM_DADOS;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const formularioVazio = () => ({
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'saida',
    valor: '',
    categoria_id: '',
    conciliado: false
  });
  const [formData, setFormData] = useState(formularioVazio);
  const [formInicial, setFormInicial] = useState(formularioVazio);
  const formSujo = JSON.stringify(formData) !== JSON.stringify(formInicial);

  const alterarForm = (campo, valor) => {
    setFormData((atual) => ({ ...atual, [campo]: valor }));
    setFormErrors((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const currentYear = new Date().getFullYear().toString();
  
  const years = useMemo(() => {
    const y = [...new Set(transactions.map((item) => item.data_lancamento.slice(0, 4)))];
    if (!y.includes(currentYear)) y.push(currentYear);
    return y.sort().reverse();
  }, [transactions, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');


  // Digitar na busca não trava: o filtro pesado roda com o valor adiado.
  const deferredSearch = useDeferredValue(search);

  const visibleTransactions = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase('pt-BR');
    
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
  }, [transactions, selectedYear, selectedCategory, deferredSearch]);

  const visibleTotals = useMemo(() => somarTotais(visibleTransactions), [visibleTransactions]);

  // Agrupa por mês numa passada só (antes: 12 filtros + 12 somas a cada render).
  const porMes = useMemo(() => {
    const grupos = Object.fromEntries(ALL_MONTHS.map((m) => [m.value, []]));
    visibleTransactions.forEach((t) => grupos[t.data_lancamento.slice(5, 7)]?.push(t));
    return Object.fromEntries(
      Object.entries(grupos).map(([mes, lista]) => [mes, { lista, totais: somarTotais(lista) }])
    );
  }, [visibleTransactions]);

  const handleOpenModal = () => {
    const vazio = formularioVazio();
    setFormData(vazio);
    setFormInicial(vazio);
    setErrorMsg('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();

    const erros = {};
    if (!formData.descricao.trim()) erros.descricao = 'Informe uma descrição.';
    if (!formData.data) erros.data = 'Informe a data.';
    const valor = parseFloat(formData.valor);
    if (Number.isNaN(valor) || valor <= 0) erros.valor = 'Informe um valor maior que zero.';
    setFormErrors(erros);
    if (Object.keys(erros).length > 0) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        descricao: formData.descricao.trim(),
        data: formData.data,
        tipo: formData.tipo,
        valor,
        conciliado: formData.conciliado,
        categoria_id: formData.categoria_id || null
      };

      await financeiroService.criarLancamento(moduloId, payload);
      setIsModalOpen(false);
      toast.success('Lançamento salvo.');
      // A lista (e o saldo acumulado vindo da API) é revalidada pela invalidação global.
    } catch (err) {
      setErrorMsg(mensagemDeErro(err, 'Erro ao salvar lançamento.'));
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
                <Link to="/modulos" className="hover:text-primary hover:underline">Minhas tabelas</Link>
                <span className="material-icons text-[14px]" aria-hidden="true">chevron_right</span>
                <span className="font-semibold text-ink-soft">Financeiro</span>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary flex items-center justify-center shrink-0">
                  <span className="material-icons text-[22px]" aria-hidden="true">{moduleIcon}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-ink">{moduleName}</h1>
                  <p className="text-sm text-light-text mt-1">
                    Acompanhe entradas, saídas e o saldo do período.
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
                    ...CATEGORIAS_PADRAO.map((catName) => {
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
          <div className="flex flex-col gap-2" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <Card key={n} padding="none" className="px-5 py-4">
                <Skeleton className="h-4 w-48" />
              </Card>
            ))}
          </div>
        ) : financeiroQuery.isError ? (
          <Card padding="lg" className="py-12">
            <ErrorState
              size="lg"
              description={mensagemDeErro(financeiroQuery.error, 'Erro ao carregar os lançamentos.')}
              onRetry={() => financeiroQuery.refetch()}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {ALL_MONTHS.map((monthData) => {
              const { lista, totais } = porMes[monthData.value];

              return (
                <MonthCard
                  key={monthData.value}
                  monthData={monthData}
                  selectedYear={selectedYear}
                  monthTransactions={lista}
                  monthTotals={totais}
                  hasTransactions={lista.length > 0}
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
          dirty={formSujo}
          title="Novo Lançamento"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
              <Button type="submit" form="lancamento-form" loading={isSaving}>Salvar Lançamento</Button>
            </>
          }
        >
          <form id="lancamento-form" onSubmit={handleSave} noValidate className="flex flex-col gap-5">
            {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

            <Input
              label="Descrição"
              name="descricao"
              autoComplete="off"
              value={formData.descricao}
              onChange={(e) => alterarForm('descricao', e.target.value)}
              error={formErrors.descricao}
              required
              placeholder="Ex: Pagamento de fornecedor"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                name="data"
                label="Data"
                value={formData.data}
                onChange={(e) => alterarForm('data', e.target.value)}
                error={formErrors.data}
                required
              />

              <Input
                type="number"
                name="valor"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                label="Valor (R$)"
                value={formData.valor}
                onChange={(e) => alterarForm('valor', e.target.value)}
                error={formErrors.valor}
                required
                placeholder="0,00"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo"
                name="tipo"
                value={formData.tipo}
                onChange={(e) => alterarForm('tipo', e.target.value)}
                options={[
                  {value: 'saida', label: 'Saída (Despesa)'},
                  {value: 'entrada', label: 'Entrada (Receita)'},
                ]}
              />
              
              <Select
                label="Categoria"
                name="categoria"
                value={formData.categoria_id}
                onChange={(e) => alterarForm('categoria_id', e.target.value)}
                options={[
                  {value: '', label: 'Selecione...'},
                  ...CATEGORIAS_PADRAO.map((catName) => {
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
                onChange={(val) => alterarForm('conciliado', val)}
              />
            </div>
          </form>
        </Drawer>
        
      </section>
    </Layout>
  );
}




