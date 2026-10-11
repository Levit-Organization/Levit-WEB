import { useState } from 'react';
import { Button, Card, EmptyState, ErrorState, Select, Skeleton, Toggle } from '../ui';
import { useAgrupamento, useTabelasRelatorio } from '../../hooks/queries';
import { mensagemDeErro } from '../../lib/queryClient';
import { baixarTexto, gerarCsv, numero, rotuloMes, textoDoPeriodo } from '../../utils/relatorios';
import { BarrasHorizontais } from './Graficos';

const OPERACOES = [
  { value: 'contar', label: 'Contar itens' },
  { value: 'somar', label: 'Somar uma coluna' },
  { value: 'media', label: 'Média de uma coluna' },
];

const POR_MES = ['data', 'prazo'];

/**
 * Relatório montado sem código: escolhe a tabela, agrupa por uma coluna e
 * conta, soma ou tira a média de uma coluna de número. Exporta em CSV.
 */
export default function MontarRelatorio({ inicio, fim }) {
  const tabelas = useTabelasRelatorio();
  const [escolha, setEscolha] = useState({ modulo_id: '', agrupar_por: '', operacao: 'contar', campo_valor: '' });
  const [noPeriodo, setNoPeriodo] = useState(false);

  const tabela = tabelas.data?.find((t) => t.id === escolha.modulo_id);
  const colunaGrupo = tabela?.agrupar.find((c) => c.id === escolha.agrupar_por);
  const params = { ...escolha, ...(noPeriodo ? { inicio, fim } : {}) };
  const resultado = useAgrupamento(params);

  const mudar = (parcial) => setEscolha((e) => ({ ...e, ...parcial }));
  const escolherTabela = (id) => {
    const t = tabelas.data?.find((x) => x.id === id);
    mudar({ modulo_id: id, agrupar_por: t?.agrupar[0]?.id || '', campo_valor: t?.numeros[0]?.id || '' });
  };

  if (tabelas.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (tabelas.isError) {
    return <Card><ErrorState description={mensagemDeErro(tabelas.error, 'Não foi possível carregar as tabelas.')} onRetry={() => tabelas.refetch()} /></Card>;
  }
  if (!tabelas.data.length) {
    return (
      <Card padding="lg">
        <EmptyState icon="table_chart" title="Nenhuma tabela ainda" description="Crie uma tabela e adicione itens para montar relatórios com ela." />
      </Card>
    );
  }

  const precisaValor = escolha.operacao !== 'contar';
  const semNumeros = precisaValor && tabela && tabela.numeros.length === 0;
  const dados = resultado.data;
  const rotulo = (g) => (POR_MES.includes(colunaGrupo?.tipo) && /^\d{4}-\d{2}$/.test(g.rotulo) ? rotuloMes(g.rotulo) : g.rotulo);
  const nomeValor = escolha.operacao === 'contar' ? 'Itens' : `${escolha.operacao === 'somar' ? 'Soma' : 'Média'} de ${dados?.coluna_valor ?? ''}`;

  const exportar = () => {
    const linhas = dados.grupos.map((g) => (escolha.operacao === 'contar' ? [rotulo(g), g.valor] : [rotulo(g), g.valor ?? '', g.itens]));
    const cabecalho = escolha.operacao === 'contar' ? [dados.agrupado_por, 'Itens'] : [dados.agrupado_por, nomeValor, 'Itens'];
    const nome = `${dados.tabela}-por-${dados.agrupado_por}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').toLowerCase();
    baixarTexto(gerarCsv(cabecalho, linhas), `${nome}.csv`);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Select
            label="Tabela"
            value={escolha.modulo_id}
            onChange={(e) => escolherTabela(e.target.value)}
            placeholder="Escolha uma tabela"
            options={tabelas.data.map((t) => ({ value: t.id, label: t.nome }))}
          />
          <Select
            label="Agrupar por"
            value={escolha.agrupar_por}
            onChange={(e) => mudar({ agrupar_por: e.target.value })}
            disabled={!tabela || tabela.agrupar.length === 0}
            placeholder={tabela && tabela.agrupar.length === 0 ? 'Sem colunas para agrupar' : 'Escolha a coluna'}
            options={(tabela?.agrupar ?? []).map((c) => ({ value: c.id, label: POR_MES.includes(c.tipo) ? `${c.nome} (por mês)` : c.nome }))}
          />
          <Select label="Calcular" value={escolha.operacao} onChange={(e) => mudar({ operacao: e.target.value })} options={OPERACOES} />
          {precisaValor && (
            <Select
              label="Coluna de número"
              value={escolha.campo_valor}
              onChange={(e) => mudar({ campo_valor: e.target.value })}
              disabled={!tabela || semNumeros}
              placeholder={semNumeros ? 'A tabela não tem colunas de número' : 'Escolha a coluna'}
              options={(tabela?.numeros ?? []).map((c) => ({ value: c.id, label: c.nome }))}
            />
          )}
        </div>
        <div className="mt-4">
          <Toggle
            checked={noPeriodo}
            onChange={setNoPeriodo}
            label={`Só itens criados entre ${textoDoPeriodo({ inicio, fim })}`}
            description="Desligado, considera todos os itens da tabela."
          />
        </div>
      </Card>

      {!escolha.modulo_id ? (
        <Card padding="lg">
          <EmptyState icon="bar_chart" title="Monte seu relatório" description="Escolha uma tabela e uma coluna. Ex.: Pedidos agrupados por Status, somando o Valor." />
        </Card>
      ) : resultado.isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : resultado.isError ? (
        <Card><ErrorState description={mensagemDeErro(resultado.error, 'Não foi possível montar o relatório.')} onRetry={() => resultado.refetch()} /></Card>
      ) : dados ? (
        <Card className={resultado.isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink">{dados.tabela} por {dados.agrupado_por}</h2>
              <p className="text-sm text-light-text">
                {nomeValor} · {numero(dados.total_itens)} {dados.total_itens === 1 ? 'item' : 'itens'}
                {dados.cortados > 0 ? ` · mostrando os 50 maiores grupos (${dados.cortados} ficaram de fora)` : ''}
              </p>
            </div>
            <Button size="sm" variant="secondary" icon="download" onClick={exportar} disabled={!dados.grupos.length}>
              Exportar CSV
            </Button>
          </div>
          <BarrasHorizontais
            titulo={`${dados.tabela} por ${dados.agrupado_por}`}
            vazio="Nenhum item para mostrar."
            itens={dados.grupos.map((g) => ({
              rotulo: rotulo(g),
              valor: g.valor ?? 0,
              detalhe: escolha.operacao === 'contar' ? null : `${numero(g.itens)} ${g.itens === 1 ? 'item' : 'itens'}`,
            }))}
          />
        </Card>
      ) : null}
    </div>
  );
}
