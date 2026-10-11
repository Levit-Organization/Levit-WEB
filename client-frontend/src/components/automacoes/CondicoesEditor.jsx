import { Button, Input, Select } from '../ui';
import { cn } from '../ui/cn';
import { usePessoas } from '../../hooks/queries';
import {
  MAX_REGRAS,
  OPERADOR_INFO,
  OPERADORES_DE_MUDANCA,
  OPERADORES_SEM_VALOR,
  novaRegra,
} from '../../utils/automacaoConstants';

/** Escolha de uma pessoa da equipe (colunas "Responsável"). Só busca a equipe quando aparece. */
function CampoValorPessoa({ label, value, onChange, required }) {
  const pessoas = usePessoas().data ?? [];
  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder="Selecione"
      options={pessoas.map((p) => ({ value: p.id, label: p.nome }))}
    />
  );
}

/**
 * Valor de comparação: lista para colunas de seleção/etapa, a equipe para
 * "Responsável", calendário para datas e prazos, texto livre para o resto.
 */
export function CampoValor({ label, campo, opcoesEtapa = [], value, onChange, required, placeholder = 'Valor' }) {
  if (campo?.tipo === 'responsavel') {
    return <CampoValorPessoa label={label} value={value} onChange={onChange} required={required} />;
  }

  const opcoes = campo?.tipo === 'selecao' ? campo.opcoes || [] : campo?.tipo === 'etapa' ? opcoesEtapa : null;

  if (opcoes && opcoes.length > 0) {
    return (
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder="Selecione"
        options={opcoes.map((op) => ({ value: op, label: op }))}
      />
    );
  }
  const ehData = campo?.tipo === 'data' || campo?.tipo === 'prazo';
  return (
    <Input
      label={label}
      type={ehData ? 'date' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
    />
  );
}

function Regra({ regra, indice, campos, opcoesEtapa, onChange, onRemove, podeRemover }) {
  const campo = campos.find((c) => String(c.id) === String(regra.campo));
  const mudanca = OPERADORES_DE_MUDANCA.includes(regra.operador);
  const atualizar = (parcial) => onChange({ ...regra, ...parcial });

  return (
    <li className="rounded-lg border border-divider p-3">
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'grid flex-1 grid-cols-1 gap-3',
            regra.operador === 'mudou_de_para' ? 'sm:grid-cols-4' : OPERADORES_SEM_VALOR.includes(regra.operador) ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
          )}
        >
          <Select
            label="Coluna"
            value={regra.campo}
            onChange={(e) => atualizar({ campo: e.target.value, valor: '', valor_de: '' })}
            required
            placeholder="Selecione"
            options={campos.map((c) => ({ value: c.id, label: c.nome }))}
          />
          <Select
            label="Operador"
            value={regra.operador}
            onChange={(e) => atualizar({ operador: e.target.value })}
            required
            options={Object.entries(OPERADOR_INFO).map(([value, label]) => ({ value, label }))}
          />
          {regra.operador === 'mudou_de_para' && (
            <CampoValor
              label="De"
              campo={campo}
              opcoesEtapa={opcoesEtapa}
              value={regra.valor_de}
              onChange={(v) => atualizar({ valor_de: v })}
              required
            />
          )}
          {!OPERADORES_SEM_VALOR.includes(regra.operador) && (
            <CampoValor
              label={mudanca ? 'Para' : 'Valor'}
              campo={campo}
              opcoesEtapa={opcoesEtapa}
              value={regra.valor}
              onChange={(v) => atualizar({ valor: v })}
              required
              placeholder={regra.operador === 'maior' || regra.operador === 'menor' ? 'Número ou data (AAAA-MM-DD)' : 'Valor'}
            />
          )}
        </div>
        {podeRemover && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover condição ${indice + 1}`}
            className="mt-7 w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-light-text hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <span className="material-icons text-[18px]" aria-hidden="true">close</span>
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Lista de condições combinadas por E (todas) ou OU (qualquer uma).
 * `onMudanca`: chamado quando uma regra passa a usar um operador de mudança.
 */
export default function CondicoesEditor({ logica, regras, campos, opcoesEtapa, onChangeLogica, onChangeRegras, onMudanca }) {
  const atualizarRegra = (indice, regra) => {
    if (OPERADORES_DE_MUDANCA.includes(regra.operador)) onMudanca?.();
    onChangeRegras(regras.map((r, i) => (i === indice ? regra : r)));
  };

  return (
    <div className="flex flex-col gap-3">
      {regras.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">Disparar quando</span>
          <div role="group" aria-label="Como combinar as condições" className="flex gap-1 rounded-lg bg-background p-1">
            {[
              { valor: 'e', label: 'todas' },
              { valor: 'ou', label: 'qualquer uma' },
            ].map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => onChangeLogica(opcao.valor)}
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
          <span className="text-ink-soft">as condições forem verdadeiras</span>
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {regras.map((regra, indice) => (
          <Regra
            // A posição identifica a regra: elas não têm id próprio.
            key={indice}
            regra={regra}
            indice={indice}
            campos={campos}
            opcoesEtapa={opcoesEtapa}
            onChange={(r) => atualizarRegra(indice, r)}
            onRemove={() => onChangeRegras(regras.filter((_, i) => i !== indice))}
            podeRemover={regras.length > 1}
          />
        ))}
      </ol>

      {regras.length < MAX_REGRAS && (
        <Button
          variant="ghost"
          size="sm"
          icon="add"
          className="self-start"
          onClick={() => onChangeRegras([...regras, novaRegra()])}
        >
          Adicionar condição
        </Button>
      )}
    </div>
  );
}
