import { useMemo } from 'react';
import { Button, Input, Select } from '../ui';
import { cn } from '../ui/cn';
import { usePessoas, useTitulos } from '../../hooks/queries';
import { REPETICOES } from '../../utils/recorrencia';
import { tituloDoItem } from '../../utils/vinculos';
import {
  MAX_FILTROS,
  OPERADORES_SEM_VALOR,
  novoFiltro,
  operadoresDoTipo,
  operadorPadrao,
} from '../../utils/filtros';

function ValorPessoa(props) {
  const pessoas = usePessoas().data ?? [];
  return <Select {...props} placeholder="Selecione" options={pessoas.map((p) => ({ value: p.id, label: p.nome }))} />;
}

function ValorItemLigado({ moduloId, ...props }) {
  const itens = useTitulos(moduloId).data ?? [];
  return <Select {...props} placeholder="Selecione o item" options={itens.map((i) => ({ value: i.id, label: tituloDoItem(i.titulo) }))} />;
}

/** Campo de valor conforme o tipo da coluna: lista, pessoa, item ligado, data, número ou texto. */
function ValorDoFiltro({ campo, label, value, onChange }) {
  const comum = { label, value: value ?? '', onChange: (e) => onChange(e.target.value) };

  switch (campo.tipo) {
    case 'selecao':
      return <Select {...comum} placeholder="Selecione" options={(campo.opcoes || []).map((op) => ({ value: op, label: op }))} />;
    case 'recorrencia':
      return <Select {...comum} placeholder="Selecione" options={REPETICOES.map((r) => ({ value: r.valor, label: r.rotulo }))} />;
    case 'responsavel':
      return <ValorPessoa {...comum} />;
    case 'vinculo':
      return <ValorItemLigado {...comum} moduloId={campo.modulo_vinculado_id} />;
    case 'data':
    case 'prazo':
    case 'momento':
      return <Input {...comum} type="date" />;
    case 'numero':
      return <Input {...comum} type="number" inputMode="decimal" placeholder="0" />;
    default:
      return <Input {...comum} type="text" autoComplete="off" placeholder="Digite..." />;
  }
}

function Filtro({ regra, indice, alvos, grupos, onChange, onRemove }) {
  const alvo = alvos.find((a) => a.chave === regra.alvo);
  const tipo = alvo?.campo.tipo;
  const semValor = !alvo || OPERADORES_SEM_VALOR.includes(regra.operador);

  return (
    <li className="flex items-start gap-2">
      <div
        className={cn(
          'grid flex-1 grid-cols-1 gap-3',
          semValor ? 'sm:grid-cols-2' : regra.operador === 'entre' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
        )}
      >
        <Select
          label="Filtrar por"
          value={regra.alvo}
          onChange={(e) => {
            const novo = alvos.find((a) => a.chave === e.target.value);
            onChange({ ...novoFiltro(), alvo: e.target.value, operador: novo ? operadorPadrao(novo.campo.tipo) : '' });
          }}
          placeholder="Escolha uma coluna"
        >
          {grupos.map(([grupo, lista]) => (
            <optgroup key={grupo} label={grupo}>
              {lista.map((a) => (
                <option key={a.chave} value={a.chave}>{a.rotulo}</option>
              ))}
            </optgroup>
          ))}
        </Select>
        {alvo && (
          <Select
            label="Condição"
            value={regra.operador}
            onChange={(e) => onChange({ ...regra, operador: e.target.value })}
            options={operadoresDoTipo(tipo)}
          />
        )}
        {!semValor && (
          <ValorDoFiltro
            campo={alvo.campo}
            label={regra.operador === 'entre' ? 'De' : 'Valor'}
            value={regra.valor}
            onChange={(v) => onChange({ ...regra, valor: v })}
          />
        )}
        {!semValor && regra.operador === 'entre' && (
          <ValorDoFiltro campo={alvo.campo} label="Até" value={regra.valor_ate} onChange={(v) => onChange({ ...regra, valor_ate: v })} />
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${indice + 1}`}
        className="mt-7 w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-light-text hover:text-danger hover:bg-danger-bg transition-colors"
      >
        <span className="material-icons text-[18px]" aria-hidden="true">close</span>
      </button>
    </li>
  );
}

/**
 * Pesquisa avançada: filtros por qualquer coluna da tabela e das tabelas
 * ligadas, combinados por "todas" (E) ou "qualquer uma" (OU). Regras ainda
 * incompletas não filtram nada até serem preenchidas.
 */
export default function PainelFiltros({ alvos, filtros, onChange }) {
  const grupos = useMemo(
    () =>
      Object.entries(
        alvos.reduce((acc, alvo) => {
          (acc[alvo.grupo] ||= []).push(alvo);
          return acc;
        }, {})
      ),
    [alvos]
  );
  const temLigacoes = grupos.length > 1;
  const { logica, regras } = filtros;
  const atualizar = (parcial) => onChange({ ...filtros, ...parcial });

  return (
    <div className="flex flex-col gap-4">
      {regras.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">Mostrar itens que atendem a</span>
          <div role="group" aria-label="Como combinar os filtros" className="flex gap-1 rounded-lg bg-background p-1">
            {[
              { valor: 'e', label: 'todos' },
              { valor: 'ou', label: 'qualquer um' },
            ].map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => atualizar({ logica: opcao.valor })}
                aria-pressed={logica === opcao.valor}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  logica === opcao.valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
                )}
              >
                {opcao.label}
              </button>
            ))}
          </div>
          <span className="text-ink-soft">os filtros</span>
        </div>
      )}

      {regras.length === 0 ? (
        <p className="text-sm text-light-text">
          Nenhum filtro ainda.{' '}
          {temLigacoes
            ? 'Dá para filtrar também pelos dados das tabelas ligadas, como “Cliente › Cidade”.'
            : 'Combine colunas para achar exatamente os itens que procura.'}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {regras.map((regra, indice) => (
            <Filtro
              // A posição identifica o filtro: eles não têm id próprio.
              key={indice}
              regra={regra}
              indice={indice}
              alvos={alvos}
              grupos={grupos}
              onChange={(nova) => atualizar({ regras: regras.map((r, i) => (i === indice ? nova : r)) })}
              onRemove={() => atualizar({ regras: regras.filter((_, i) => i !== indice) })}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {regras.length < MAX_FILTROS && (
          <Button variant="ghost" size="sm" icon="add" onClick={() => atualizar({ regras: [...regras, novoFiltro()] })}>
            Adicionar filtro
          </Button>
        )}
        {regras.length > 0 && (
          <Button variant="ghost" size="sm" icon="filter_list_off" onClick={() => onChange({ logica: 'e', regras: [] })}>
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
