import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, EmptyState, ErrorState, Skeleton, PageHeader } from '../components/ui';
import CartaoResumo from '../components/financeiro/CartaoResumo';
import CartaoDoMes from '../components/financeiro/CartaoDoMes';
import FiltrosLancamentos from '../components/financeiro/FiltrosLancamentos';
import PainelLancamento from '../components/financeiro/PainelLancamento';
import { useModulo } from '../hooks/queries';
import { useFinanceiro } from '../hooks/useFinanceiro';
import { useFiltroLancamentos } from '../hooks/useFiltroLancamentos';
import { useFormularioLancamento } from '../hooks/useFormularioLancamento';
import { mensagemDeErro } from '../lib/queryClient';

/**
 * Tabela financeira: entradas, saídas e saldo do ano, lançamentos agrupados
 * por mês (com filtro por categoria e busca) e o painel de novo lançamento.
 */
export default function FinancialModule() {
  const { id: moduloId } = useParams();

  const moduloQuery = useModulo(moduloId);
  const moduleName = moduloQuery.data?.nome || (moduloQuery.isError ? 'Financeiro' : 'Carregando...');
  const moduleIcon = moduloQuery.data?.icone || 'account_balance_wallet';

  const { query: financeiroQuery, lancamentos, categorias } = useFinanceiro(moduloId);
  const filtro = useFiltroLancamentos(lancamentos);
  const formulario = useFormularioLancamento(moduloId);
  const { totais, porMes, meses, filtrando, ano } = filtro;

  return (
    <Layout>
      <section className="relative">
        <PageHeader
          backTo="/modulos"
          icon={moduleIcon}
          title={moduleName}
          actions={
            <Button onClick={formulario.abrir} icon="add">
              Novo lançamento
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <CartaoResumo label="Entradas" value={totais.profit} tone="profit" />
          <CartaoResumo label="Saídas" value={totais.expenses} tone="expense" />
          <CartaoResumo label="Saldo" value={totais.balance} tone="balance" />
        </div>

        <FiltrosLancamentos filtro={filtro} categorias={categorias} />

        {financeiroQuery.isLoading ? (
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
        ) : meses.length === 0 ? (
          <Card padding="lg" className="py-12">
            <EmptyState
              size="lg"
              icon="account_balance_wallet"
              title={filtrando ? 'Nenhum lançamento encontrado' : `Nenhum lançamento em ${ano}`}
              description={
                filtrando
                  ? 'Tente outra busca ou outra categoria.'
                  : 'Registre entradas e saídas para ver o saldo de cada mês.'
              }
              actionLabel={filtrando ? undefined : 'Novo lançamento'}
              actionIcon="add"
              onAction={formulario.abrir}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {meses.map((mes) => (
              <CartaoDoMes
                key={mes.value}
                monthData={mes}
                selectedYear={ano}
                monthTransactions={porMes[mes.value].lista}
                monthTotals={porMes[mes.value].totais}
              />
            ))}
          </div>
        )}

        <PainelLancamento formulario={formulario} categorias={categorias} />
      </section>
    </Layout>
  );
}
