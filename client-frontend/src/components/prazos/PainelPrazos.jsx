import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, Skeleton } from '../ui';
import { cn } from '../ui/cn';
import SeloPrazo from './SeloPrazo';
import PessoaResponsavel from './PessoaResponsavel';
import { mensagemDeErro } from '../../lib/queryClient';

const GRUPOS = [
  ['atrasados', 'Atrasados'],
  ['hoje', 'Vencem hoje'],
  ['proximos', 'Próximos 7 dias'],
];

const POR_GRUPO = 5;

function Linha({ item }) {
  return (
    <li>
      <Link
        to={`/modulos/${item.modulo_id}/registros`}
        className="flex items-center gap-3 py-2.5 group rounded-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
          <span className="material-icons text-[17px]">{item.modulo_icone || 'table_chart'}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
            {item.titulo || 'Item sem título'}
          </span>
          <span className="block text-xs text-light-text truncate">
            {item.modulo_nome} · {item.coluna_prazo}
          </span>
          {/* No celular o selo desce para baixo do nome, para o nome não ser cortado. */}
          <span className="block mt-1 sm:hidden">
            <SeloPrazo data={item.prazo} />
          </span>
        </span>
        <span className="hidden sm:block shrink-0">
          <SeloPrazo data={item.prazo} />
        </span>
        <span className="hidden sm:inline-flex w-6 shrink-0 justify-end">
          {item.responsavel_nome && <PessoaResponsavel nome={item.responsavel_nome} comNome={false} />}
        </span>
      </Link>
    </li>
  );
}

/**
 * O que vence e o que já venceu, em todas as tabelas: o centro de "ninguém
 * esquece nada". Alterna entre os itens da pessoa e os da equipe toda.
 */
export default function PainelPrazos({ query }) {
  const [escopo, setEscopo] = useState('meus');
  const dados = query.data;
  const filtrar = (lista = []) => (escopo === 'meus' ? lista.filter((i) => i.meu) : lista);
  const grupos = GRUPOS.map(([chave, titulo]) => [chave, titulo, filtrar(dados?.[chave])]);
  const total = grupos.reduce((soma, [, , lista]) => soma + lista.length, 0);

  return (
    <Card id="prazos" className="min-w-0 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <h2 className="text-base font-bold text-ink">Prazos</h2>
        <div role="group" aria-label="De quem" className="flex gap-1 rounded-lg bg-sidebar p-1">
          {[
            ['meus', 'Meus'],
            ['todos', 'Da equipe'],
          ].map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={escopo === valor}
              onClick={() => setEscopo(valor)}
              className={cn(
                'rounded-md px-3 h-7 text-xs font-semibold transition-colors',
                escopo === valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-9 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState description={mensagemDeErro(query.error, 'Erro ao carregar os prazos.')} onRetry={() => query.refetch()} />
      ) : total === 0 ? (
        <EmptyState
          size="sm"
          icon="event_available"
          title={escopo === 'meus' ? 'Nada vencendo com você' : 'Nada vencendo na equipe'}
          description='Nos próximos 7 dias não há prazos em aberto. Tabelas com colunas "Prazo" e "Responsável" aparecem aqui, e o Levit avisa antes de algo vencer.'
          className="py-4"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map(([chave, titulo, lista]) =>
            lista.length === 0 ? null : (
              <section key={chave} aria-label={`${titulo}: ${lista.length}`}>
                <h3
                  className={cn(
                    'text-xs font-semibold mb-1',
                    chave === 'atrasados' ? 'text-danger' : chave === 'hoje' ? 'text-warning' : 'text-light-text'
                  )}
                >
                  {titulo} · {lista.length}
                </h3>
                <ul className="flex flex-col divide-y divide-divider">
                  {lista.slice(0, POR_GRUPO).map((item) => (
                    <Linha key={`${item.registro_id}-${item.coluna_prazo}`} item={item} />
                  ))}
                </ul>
                {lista.length > POR_GRUPO && (
                  <p className="text-xs text-light-text mt-1">e mais {lista.length - POR_GRUPO}</p>
                )}
              </section>
            )
          )}
        </div>
      )}
    </Card>
  );
}
