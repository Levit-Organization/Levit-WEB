import { Alert, Card, EmptyState, ErrorState, Skeleton } from '../ui';
import { useIndicadores } from '../../hooks/queries';
import { mensagemDeErro } from '../../lib/queryClient';
import { moeda, numero, textoDoPeriodo } from '../../utils/relatorios';
import { BarrasHorizontais, ColunasMensais, Indicador } from './Graficos';

const SERIES_FINANCEIRO = [
  { chave: 'entradas', rotulo: 'Entradas', cor: 'bg-serie-1' },
  { chave: 'saidas', rotulo: 'Saídas', cor: 'bg-serie-2' },
];

function Secao({ titulo, descricao, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-bold text-ink">{titulo}</h2>
        {descricao && <p className="text-sm text-light-text">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function Vaga({ vaga }) {
  const noFunil = vaga.fases.filter((f) => !f.saida);
  const saidas = vaga.fases.filter((f) => f.saida);
  const primeira = noFunil[0]?.chegaram || 0;

  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">{vaga.nome}</h3>
        <span className="text-xs text-light-text">{numero(vaga.total)} candidatos no total</span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Indicador rotulo="Inscritos no período" comparacao={vaga.inscritos} />
        <Indicador rotulo="Chegaram à última etapa" comparacao={vaga.concluidos} />
        <Indicador rotulo="Saíram do processo" comparacao={vaga.sairam} subirEBom={false} />
      </div>

      {vaga.parados > 0 && (
        <Alert variant="warning" className="mt-3">
          {vaga.parados === 1 ? '1 candidato está parado' : `${vaga.parados} candidatos estão parados`} na mesma etapa há mais de 14 dias.
        </Alert>
      )}

      <h4 className="text-sm font-semibold text-ink mt-5 mb-1">Até onde chegaram os inscritos no período</h4>
      <p className="text-xs text-light-text mb-3">Cada barra conta quem chegou até a etapa ou passou dela (e a % dos inscritos). Embaixo: quantos estão nela agora e o tempo médio que ficam.</p>
      <BarrasHorizontais
        titulo={`Funil de ${vaga.nome}`}
        vazio="Ninguém se inscreveu neste período."
        itens={primeira === 0 ? [] : noFunil.map((f) => ({
          rotulo: f.nome,
          valor: f.chegaram,
          extra: `${Math.round((f.chegaram / primeira) * 100)}%`,
          detalhe: [`${numero(f.atual)} agora`, f.dias_medios !== null ? `${numero(f.dias_medios)} dias em média` : null]
            .filter(Boolean)
            .join(' · '),
        }))}
      />
      {saidas.length > 0 && (
        <p className="text-xs text-light-text mt-3">
          Fora do funil: {saidas.map((f) => `${f.nome} (${numero(f.atual)} agora)`).join(', ')}.
        </p>
      )}
    </Card>
  );
}

function Financeiro({ fin }) {
  return (
    <Card className="min-w-0">
      <h3 className="font-semibold text-ink">{fin.nome}</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Indicador rotulo="Entradas" comparacao={fin.entradas} formatar={moeda} />
        <Indicador rotulo="Saídas" comparacao={fin.saidas} formatar={moeda} subirEBom={false} />
        <Indicador rotulo="Saldo" comparacao={fin.saldo} formatar={moeda} />
      </div>
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink mb-3">Últimos 6 meses</h4>
          <ColunasMensais titulo={`Entradas e saídas por mês em ${fin.nome}`} meses={fin.meses} series={SERIES_FINANCEIRO} formatar={moeda} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink mb-3">Saídas por categoria no período</h4>
          <BarrasHorizontais
            titulo="Saídas por categoria"
            formatar={moeda}
            vazio="Nenhuma saída neste período."
            itens={fin.saidas_por_categoria.slice(0, 8).map((c) => ({ rotulo: c.categoria, valor: c.total }))}
          />
        </div>
      </div>
    </Card>
  );
}

function Prazos({ prazos }) {
  const taxa = prazos.taxa_conclusao;
  return (
    <Card className="min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Indicador rotulo="Prazos que venceram no período" comparacao={prazos.vencendo} />
        <Indicador
          rotulo="Desses, já concluídos"
          comparacao={prazos.concluidos}
          dica={taxa.atual === null ? 'nenhum prazo no período' : `${taxa.atual}% concluídos${taxa.anterior !== null ? ` (antes: ${taxa.anterior}%)` : ''}`}
        />
        <div className="rounded-xl border border-divider bg-surface px-4 py-3.5">
          <p className="text-sm text-light-text">Atrasados agora</p>
          <p className={prazos.atrasados_agora ? 'text-2xl font-bold text-danger tabular mt-1' : 'text-2xl font-bold text-ink tabular mt-1'}>
            {numero(prazos.atrasados_agora)}
          </p>
          <p className="text-2xs text-light-text mt-0.5">em todas as tabelas</p>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-ink mt-5 mb-3">Atrasados por responsável</h4>
      <BarrasHorizontais
        titulo="Itens atrasados por responsável"
        vazio="Nenhum item atrasado."
        itens={prazos.atrasados_por_responsavel.map((r) => ({ rotulo: r.responsavel, valor: r.total }))}
      />
    </Card>
  );
}

/** Painel com os números do período escolhido, comparados ao período anterior. */
export default function PainelIndicadores({ inicio, fim }) {
  const consulta = useIndicadores(inicio, fim);

  if (consulta.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  if (consulta.isError) {
    return (
      <Card>
        <ErrorState description={mensagemDeErro(consulta.error, 'Não foi possível carregar os indicadores.')} onRetry={() => consulta.refetch()} />
      </Card>
    );
  }

  const d = consulta.data;
  const r = d.resumo;
  const semDados = d.recrutamento.length === 0 && d.financeiro.length === 0;

  return (
    <div className={consulta.isFetching ? 'flex flex-col gap-8 opacity-70 transition-opacity' : 'flex flex-col gap-8 transition-opacity'} aria-busy={consulta.isFetching}>
      <Secao titulo="Resumo" descricao={`Comparado com ${textoDoPeriodo(d.periodo_anterior)}.`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Indicador rotulo="Itens criados nas tabelas" comparacao={r.itens_criados} />
          <Indicador rotulo="Candidatos inscritos" comparacao={r.candidatos} />
          <Indicador rotulo="Atividades na plataforma" comparacao={r.atividades} />
          <Indicador rotulo="Pessoas ativas" comparacao={r.pessoas_ativas} />
        </div>
      </Secao>

      <Secao titulo="Prazos" descricao="Itens com prazo em todas as tabelas. Concluído = alguma lista do item numa opção como Concluído, Entregue ou Pago.">
        <Prazos prazos={d.prazos} />
      </Secao>

      {d.recrutamento.length > 0 && (
        <Secao titulo="Recrutamento">
          {d.recrutamento.map((vaga) => <Vaga key={vaga.modulo_id} vaga={vaga} />)}
        </Secao>
      )}

      {d.financeiro.length > 0 && (
        <Secao titulo="Financeiro">
          {d.financeiro.map((fin) => <Financeiro key={fin.modulo_id} fin={fin} />)}
        </Secao>
      )}

      {semDados && (
        <Card padding="lg">
          <EmptyState
            icon="insights"
            title="Quadros de recrutamento e financeiro aparecem aqui"
            description="Crie uma tabela de recrutamento ou de financeiro para ver o funil de candidatos e as entradas e saídas do período."
          />
        </Card>
      )}
    </div>
  );
}
