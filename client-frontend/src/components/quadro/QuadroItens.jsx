import { memo, useState } from 'react';
import { coresDaFase } from '../ui';
import { cn } from '../ui/cn';
import SeloPrazo from '../prazos/SeloPrazo';
import PessoaResponsavel from '../prazos/PessoaResponsavel';
import { itemConcluido } from '../../utils/prazos';

const SEM_VALOR = '';

function formatar(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (tipo === 'data') {
    const data = new Date(`${valor}T00:00:00`);
    return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleDateString('pt-BR');
  }
  if (tipo === 'numero') return Number(valor).toLocaleString('pt-BR');
  return String(valor);
}

/**
 * Cartão de um item. Arrastável com o mouse; o seletor de etapa no rodapé faz o
 * mesmo pelo teclado e no celular (onde arrastar não funciona).
 */
const Cartao = memo(function Cartao({ item, titulo, detalhes, prazo, concluido, responsavel, etapas, valorAtual, nomeGrupo, onAbrir, onMover, onArrastar }) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        onArrastar(item);
      }}
      onDragEnd={() => onArrastar(null)}
      className="group relative rounded-xl border border-divider bg-surface shadow-xs hover:shadow-sm hover:border-divider-strong transition-[box-shadow,border-color] cursor-grab active:cursor-grabbing"
    >
      <button
        type="button"
        onClick={() => onAbrir(item)}
        className="w-full text-left px-3.5 pt-3 pb-2 rounded-t-xl focus-visible:outline-2 focus-visible:outline-primary"
      >
        <p className="text-sm font-semibold text-ink break-words">{titulo}</p>
        {detalhes.length > 0 && (
          <dl className="mt-1.5 flex flex-col gap-0.5">
            {detalhes.map(([nome, valor]) => (
              <div key={nome} className="flex gap-1.5 text-xs min-w-0">
                <dt className="text-light-text shrink-0">{nome}:</dt>
                <dd className="text-ink-soft truncate">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
        {(prazo || responsavel) && (
          <div className="mt-2 flex items-center justify-between gap-2">
            {prazo ? <SeloPrazo data={prazo} concluido={concluido} /> : <span />}
            {responsavel && <PessoaResponsavel nome={responsavel} comNome={false} />}
          </div>
        )}
      </button>
      <div className="px-3.5 pb-3">
        <label className="sr-only" htmlFor={`mover-${item.id}`}>{`${nomeGrupo} de ${titulo}`}</label>
        <select
          id={`mover-${item.id}`}
          value={valorAtual}
          onChange={(e) => onMover(item, e.target.value)}
          className="w-full h-8 rounded-md border border-divider bg-background px-2 text-xs text-ink-soft focus-visible:outline-2 focus-visible:outline-primary"
        >
          {etapas.map((etapa) => (
            <option key={etapa.valor || 'sem'} value={etapa.valor}>{etapa.rotulo}</option>
          ))}
        </select>
      </div>
    </li>
  );
});

/**
 * Visão em quadro de qualquer tabela: cada opção de uma coluna de lista vira uma
 * coluna do quadro. É o mesmo conceito do quadro de recrutamento, para tudo.
 */
export default function QuadroItens({ itens, campos, campoGrupo, nomes = {}, onAbrir, onMover }) {
  const [arrastando, setArrastando] = useState(null);
  const [sobre, setSobre] = useState(null);

  const opcoes = campoGrupo.opcoes || [];
  const temSemValor = itens.some((i) => !opcoes.includes(i.dados?.[campoGrupo.id]));
  const etapas = [
    ...opcoes.map((op) => ({ valor: op, rotulo: op })),
    ...(temSemValor ? [{ valor: SEM_VALOR, rotulo: `Sem ${campoGrupo.nome.toLowerCase()}` }] : []),
  ];

  // Título do cartão: a primeira coluna de texto; o resto vira detalhe (até 2).
  // Prazo e responsável têm lugar próprio no rodapé do cartão.
  const campoPrazo = campos.find((c) => c.tipo === 'prazo');
  const campoResponsavel = campos.find((c) => c.tipo === 'responsavel');
  const especiais = new Set([campoGrupo.id, campoPrazo?.id, campoResponsavel?.id]);
  const campoTitulo = campos.find((c) => c.tipo === 'texto' && !especiais.has(c.id)) || campos.find((c) => !especiais.has(c.id));
  const camposDetalhe = campos.filter((c) => !especiais.has(c.id) && c.id !== campoTitulo?.id).slice(0, 2);

  const porEtapa = new Map(etapas.map((e) => [e.valor, []]));
  itens.forEach((item) => {
    const valor = item.dados?.[campoGrupo.id];
    porEtapa.get(opcoes.includes(valor) ? valor : SEM_VALOR)?.push(item);
  });

  const soltar = (valor) => {
    if (arrastando && (arrastando.dados?.[campoGrupo.id] ?? SEM_VALOR) !== valor) onMover(arrastando, valor);
    setArrastando(null);
    setSobre(null);
  };

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-4 items-start min-w-min">
        {etapas.map((etapa, indice) => {
          const cor = etapa.valor === SEM_VALOR ? { dot: 'bg-faint', bg: 'bg-background', text: 'text-light-text' } : coresDaFase(indice, opcoes.length);
          const lista = porEtapa.get(etapa.valor) || [];
          const ativa = sobre === etapa.valor && arrastando;
          return (
            <section
              key={etapa.valor || 'sem'}
              aria-label={`${etapa.rotulo}, ${lista.length} ${lista.length === 1 ? 'item' : 'itens'}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (sobre !== etapa.valor) setSobre(etapa.valor);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setSobre(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                soltar(etapa.valor);
              }}
              className={cn(
                'w-[280px] shrink-0 rounded-2xl p-2.5 transition-colors',
                ativa ? 'bg-primary-50 ring-2 ring-primary-300' : 'bg-sidebar'
              )}
            >
              <header className="flex items-center justify-between gap-2 px-1.5 pb-2.5">
                <h3 className="flex items-center gap-2 min-w-0 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', cor.dot)} aria-hidden="true" />
                  <span className="truncate">{etapa.rotulo}</span>
                </h3>
                <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full text-2xs font-bold flex items-center justify-center tabular', cor.bg, cor.text)}>
                  {lista.length}
                </span>
              </header>

              {lista.length === 0 ? (
                <p className="rounded-xl border border-dashed border-divider-strong px-3 py-6 text-center text-xs text-light-text">
                  Arraste um item para cá
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {lista.map((item) => (
                    <Cartao
                      key={item.id}
                      item={item}
                      titulo={formatar(item.dados?.[campoTitulo?.id], campoTitulo?.tipo) || 'Item sem título'}
                      detalhes={camposDetalhe
                        .map((c) => [c.nome, formatar(item.dados?.[c.id], c.tipo)])
                        .filter(([, v]) => v !== null)}
                      prazo={campoPrazo ? item.dados?.[campoPrazo.id] : null}
                      concluido={itemConcluido(item.dados, campos)}
                      responsavel={campoResponsavel ? nomes[item.dados?.[campoResponsavel.id]] : null}
                      etapas={etapas}
                      valorAtual={opcoes.includes(item.dados?.[campoGrupo.id]) ? item.dados[campoGrupo.id] : SEM_VALOR}
                      nomeGrupo={campoGrupo.nome}
                      onAbrir={onAbrir}
                      onMover={onMover}
                      onArrastar={setArrastando}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
