import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, ErrorState, Input, Select, Skeleton, Toggle } from '../ui';
import { useAgrupamento, useModulo, useTabelasRelatorio } from '../../hooks/queries';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import PainelFiltros from '../filtros/PainelFiltros';
import { alvosDoFiltro, filtrosParaApi, filtrosVazios } from '../../utils/filtros';
import { mensagemDeErro } from '../../lib/queryClient';
import { useToast } from '../../hooks/useFeedback';
import { relatorioService } from '../../services/relatorioService';
import { baixarTexto, gerarCsv, numero, rotuloMes, textoDoPeriodo } from '../../utils/relatorios';
import { BarrasHorizontais } from './Graficos';

const OPERACOES = [
  { value: 'contar', label: 'Contar itens' },
  { value: 'somar', label: 'Somar uma coluna' },
  { value: 'media', label: 'Média de uma coluna' },
];

const POR_MES = ['data', 'prazo'];

/** Colunas para agrupar em grupos: as desta tabela e as de cada tabela ligada. */
function gruposDeColunas(colunas = []) {
  return Object.entries(
    colunas.reduce((acc, c) => {
      (acc[c.grupo || 'Esta tabela'] ||= []).push(c);
      return acc;
    }, {})
  );
}

/**
 * Relatório montado sem código: escolhe a tabela, agrupa por uma coluna (dela
 * ou de uma tabela ligada) e conta, soma ou tira a média de uma coluna de
 * número. Os filtros da pesquisa avançada escolhem quais itens entram.
 * Exporta em CSV.
 */
export default function MontarRelatorio({ inicio, fim }) {
  const tabelas = useTabelasRelatorio();
  const [escolha, setEscolha] = useState({ modulo_id: '', agrupar_por: '', operacao: 'contar', campo_valor: '' });
  const [noPeriodo, setNoPeriodo] = useState(false);
  const [filtros, setFiltros] = useState(filtrosVazios);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [tituloPdf, setTituloPdf] = useState('');
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const toast = useToast();

  const tabela = tabelas.data?.find((t) => t.id === escolha.modulo_id);
  const colunaGrupo = tabela?.agrupar.find((c) => c.id === escolha.agrupar_por);

  // Filtros: as colunas vêm da tabela escolhida e das ligadas a ela.
  const modulo = useModulo(escolha.modulo_id || undefined).data;
  const alvos = useMemo(() => alvosDoFiltro(modulo), [modulo]);
  const filtrosApi = useMemo(() => filtrosParaApi(filtros, alvos), [filtros, alvos]);
  const filtrosAtivos = useDebouncedValue(filtrosApi);
  const totalFiltros = filtrosApi?.regras.length ?? 0;

  const params = {
    ...escolha,
    ...(noPeriodo ? { inicio, fim } : {}),
    ...(filtrosAtivos ? { filtros: JSON.stringify(filtrosAtivos) } : {}),
  };
  const resultado = useAgrupamento(params);

  const mudar = (parcial) => setEscolha((e) => ({ ...e, ...parcial }));
  const escolherTabela = (id) => {
    const t = tabelas.data?.find((x) => x.id === id);
    mudar({ modulo_id: id, agrupar_por: t?.agrupar[0]?.id || '', campo_valor: t?.numeros[0]?.id || '' });
    setFiltros(filtrosVazios()); // as colunas do filtro eram da tabela anterior
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

  const tituloPadrao = dados ? `${dados.tabela} por ${dados.agrupado_por}` : '';
  const nomeDeArquivo = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'relatorio';

  const exportar = () => {
    const linhas = dados.grupos.map((g) => (escolha.operacao === 'contar' ? [rotulo(g), g.valor] : [rotulo(g), g.valor ?? '', g.itens]));
    const cabecalho = escolha.operacao === 'contar' ? [dados.agrupado_por, 'Itens'] : [dados.agrupado_por, nomeValor, 'Itens'];
    baixarTexto(gerarCsv(cabecalho, linhas), `${nomeDeArquivo(`${dados.tabela}-por-${dados.agrupado_por}`)}.csv`);
  };

  /** PDF com os mesmos critérios da tela (tabela, coluna, cálculo, período e filtros) por extenso. */
  const baixarPdf = async () => {
    setBaixandoPdf(true);
    try {
      const titulo = tituloPdf.trim();
      await relatorioService.baixarRelatorioMontado(params, { titulo, nomeArquivo: `${nomeDeArquivo(titulo || tituloPadrao)}.pdf` });
    } catch (erro) {
      toast.error(mensagemDeErro(erro, 'Não foi possível gerar o PDF.'));
    } finally {
      setBaixandoPdf(false);
    }
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
          >
            {gruposDeColunas(tabela?.agrupar).map(([grupo, colunas]) => (
              <optgroup key={grupo} label={grupo}>
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>{POR_MES.includes(c.tipo) ? `${c.nome} (por mês)` : c.nome}</option>
                ))}
              </optgroup>
            ))}
          </Select>
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
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <Toggle
            checked={noPeriodo}
            onChange={setNoPeriodo}
            label={`Só itens criados entre ${textoDoPeriodo({ inicio, fim })}`}
            description="Desligado, considera todos os itens da tabela."
          />
          {tabela && (
            <Button
              variant={mostrarFiltros || totalFiltros > 0 ? 'subtle' : 'secondary'}
              size="sm"
              icon="filter_list"
              aria-expanded={mostrarFiltros}
              onClick={() => setMostrarFiltros((v) => !v)}
            >
              {totalFiltros > 0 ? `Filtros (${totalFiltros})` : 'Filtrar itens'}
            </Button>
          )}
        </div>
        {tabela && mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-divider">
            <PainelFiltros alvos={alvos} filtros={filtros} onChange={setFiltros} />
          </div>
        )}
      </Card>

      {!escolha.modulo_id ? (
        <Card padding="lg">
          <EmptyState
            icon="bar_chart"
            title="Monte seu relatório"
            description="Escolha uma tabela e uma coluna. Ex.: Pedidos agrupados por Cliente › Cidade, somando o Valor, só dos pedidos deste ano."
          />
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
                {filtrosAtivos ? ` · ${filtrosAtivos.regras.length} ${filtrosAtivos.regras.length === 1 ? 'filtro' : 'filtros'}` : ''}
                {dados.cortados > 0 ? ` · mostrando os 50 maiores grupos (${dados.cortados} ficaram de fora)` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon="download" onClick={exportar} disabled={!dados.grupos.length}>
                Exportar CSV
              </Button>
              <Button size="sm" icon="picture_as_pdf" onClick={baixarPdf} loading={baixandoPdf}>
                {baixandoPdf ? 'Gerando...' : 'Baixar PDF'}
              </Button>
            </div>
          </div>
          <div className="mb-5 sm:max-w-md">
            <Input
              label="Título no PDF"
              value={tituloPdf}
              onChange={(e) => setTituloPdf(e.target.value)}
              maxLength={100}
              placeholder={tituloPadrao}
              hint="Opcional. O PDF traz os critérios, os filtros, os grupos e o total."
            />
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
