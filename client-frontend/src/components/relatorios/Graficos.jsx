import { cn } from '../ui/cn';
import { compacto, descreverVariacao, numero, rotuloMes } from '../../utils/relatorios';

/**
 * Gráficos simples em HTML/CSS (sem biblioteca): barras finas com a ponta
 * arredondada, valor escrito na ponta, legenda sempre que há duas séries e
 * uma tabela equivalente para leitor de tela. Cores em `--color-serie-*`.
 */

/** "+12%" com ícone; verde ou vermelho conforme a variação seja boa ou ruim. */
export function Variacao({ comparacao, subirEBom = true, className }) {
  const v = descreverVariacao(comparacao, subirEBom);
  if (!v) return null;
  const cor = v.bom === null ? 'text-light-text' : v.bom ? 'text-success' : 'text-danger';
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular', cor, className)}>
      {v.direcao && (
        <span className="material-icons text-[14px]" aria-hidden="true">{v.direcao === 'up' ? 'trending_up' : 'trending_down'}</span>
      )}
      {v.texto}
      <span className="sr-only"> em relação ao período anterior</span>
    </span>
  );
}

/** Indicador com número grande e variação contra o período anterior. */
export function Indicador({ rotulo, comparacao, formatar = numero, subirEBom = true, dica }) {
  return (
    <div className="rounded-xl border border-divider bg-surface px-4 py-3.5 min-w-0">
      <p className="text-sm text-light-text truncate">{rotulo}</p>
      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-ink tabular">{formatar(comparacao?.atual ?? 0)}</span>
        <Variacao comparacao={comparacao} subirEBom={subirEBom} />
      </div>
      <p className="text-2xs text-light-text mt-0.5 truncate">
        {dica ?? `antes: ${formatar(comparacao?.anterior ?? 0)}`}
      </p>
    </div>
  );
}

/**
 * Barras horizontais de uma série. `itens`: [{ rotulo, valor, detalhe?, extra? }].
 * O valor vai escrito na ponta (com `extra` ao lado, ex.: "63%"); o detalhe
 * (opcional) fica embaixo do rótulo.
 */
export function BarrasHorizontais({ itens, formatar = numero, vazio = 'Nada para mostrar.', titulo }) {
  if (!itens?.length) return <p className="text-sm text-light-text py-2">{vazio}</p>;
  const max = Math.max(...itens.map((i) => Math.abs(i.valor ?? 0)), 0) || 1;

  return (
    <ul className="flex flex-col gap-2.5" aria-label={titulo}>
      {itens.map((item, i) => {
        const largura = Math.max(((Math.abs(item.valor ?? 0)) / max) * 100, item.valor ? 1.5 : 0);
        return (
          <li key={`${item.rotulo}-${i}`} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-3 items-center">
            <div className="min-w-0">
              <p className="text-sm text-ink-soft truncate" title={item.rotulo}>{item.rotulo}</p>
              {item.detalhe && <p className="text-2xs text-light-text truncate">{item.detalhe}</p>}
            </div>
            <div className="flex items-center gap-2 min-w-0" title={`${item.rotulo}: ${formatar(item.valor)}`}>
              <div className="flex-1 min-w-0">
                <div
                  className={cn('h-3 rounded-r-[4px]', item.saida ? 'bg-divider-strong' : 'bg-serie-1')}
                  style={{ width: `${largura}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-ink tabular shrink-0">
                {formatar(item.valor)}
                {item.extra && <span className="ml-1.5 text-xs font-normal text-light-text">{item.extra}</span>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Colunas por mês com duas séries lado a lado (ex.: entradas × saídas).
 * `series`: [{ chave, rotulo, cor }]; `meses`: [{ mes: 'AAAA-MM', [chave]: valor }].
 */
export function ColunasMensais({ meses, series, formatar = numero, titulo }) {
  const max = Math.max(...meses.flatMap((m) => series.map((s) => m[s.chave] ?? 0)), 0);
  const ALTURA = 140;

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3" aria-hidden="true">
        {series.map((s) => (
          <span key={s.chave} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className={cn('w-2.5 h-2.5 rounded-sm', s.cor)} />
            {s.rotulo}
          </span>
        ))}
      </div>

      <div className="relative" aria-hidden="true">
        <span className="absolute -top-1 left-0 text-2xs text-light-text tabular">{max ? compacto(max) : ''}</span>
        <div className="flex items-end gap-2 sm:gap-4 border-b border-divider-strong pt-4" style={{ height: ALTURA + 16 }}>
          {meses.map((m) => (
            <div
              key={m.mes}
              className="flex-1 h-full flex items-end justify-center gap-0.5 min-w-0"
              title={`${rotuloMes(m.mes)} · ${series.map((s) => `${s.rotulo}: ${formatar(m[s.chave] ?? 0)}`).join(' · ')}`}
            >
              {series.map((s) => (
                <div
                  key={s.chave}
                  className={cn('w-full max-w-[24px] rounded-t-[4px]', s.cor)}
                  style={{ height: max ? `${((m[s.chave] ?? 0) / max) * 100}%` : 0, minHeight: m[s.chave] ? 2 : 0 }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-2 sm:gap-4 mt-1.5">
          {meses.map((m) => (
            <span key={m.mes} className="flex-1 text-center text-2xs text-light-text truncate">{rotuloMes(m.mes)}</span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            {series.map((s) => <th key={s.chave} scope="col">{s.rotulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}>
              <th scope="row">{rotuloMes(m.mes)}</th>
              {series.map((s) => <td key={s.chave}>{formatar(m[s.chave] ?? 0)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
