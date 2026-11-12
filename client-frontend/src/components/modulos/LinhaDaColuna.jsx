import { Badge, Select } from '../ui';
import { CAMPO_TIPO_DICA, CAMPO_TIPO_INFO } from '../../utils/modulos';

/** Coluna de ligação: nova escolhe a tabela de destino e se aceita vários; salva só informa. */
function LigacaoDaColuna({ campo, moduloId, tabelasDeDados, onChange }) {
  return (
    <div className="mt-3 pl-[84px] flex flex-col gap-3">
      {campo._isNew ? (
        <>
          <Select
            label="Liga à tabela"
            value={campo.modulo_vinculado_id || ''}
            onChange={(e) => onChange('modulo_vinculado_id', e.target.value)}
            required
            placeholder={tabelasDeDados.length ? 'Escolha a tabela' : 'Crie outra tabela de lista primeiro'}
            options={tabelasDeDados.map((m) => ({ value: m.id, label: m.id === moduloId ? `${m.nome} (esta tabela)` : m.nome }))}
          />
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!campo.opcoes?.multiplo}
              onChange={(e) => onChange('opcoes', { multiplo: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            Cada item pode ligar a vários itens dessa tabela
          </label>
        </>
      ) : (
        <p className="text-xs text-light-text">
          Liga à tabela <strong className="text-ink-soft font-semibold">{campo.modulo_vinculado?.nome || 'removida'}</strong>
          {campo.opcoes?.multiplo ? ', vários itens por vez.' : ', um item por vez.'}
        </p>
      )}
    </div>
  );
}

/** Opções de uma coluna de lista. */
function OpcoesDaLista({ opcoes, onAdd, onChange, onRemove }) {
  return (
    <div className="mt-3 pl-[84px]">
      <p className="text-xs font-medium text-light-text mb-2">Opções da lista</p>
      <div className="flex flex-col gap-2">
        {opcoes.map((opcao, optIdx) => (
          <div key={optIdx} className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-divider-strong shrink-0"></span>
            <input
              type="text"
              value={opcao}
              onChange={(e) => onChange(optIdx, e.target.value)}
              placeholder={`Opção ${optIdx + 1}`}
              className="flex-1 h-9 px-3 bg-surface text-ink border border-divider-strong rounded-lg text-sm placeholder:text-light-text transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100"
            />
            <button
              type="button"
              onClick={() => onRemove(optIdx)}
              className="text-light-text hover:text-danger transition-colors shrink-0"
            >
              <span className="material-icons text-[16px]">close</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-primary hover:underline font-medium self-start mt-0.5"
        >
          + Adicionar opção
        </button>
      </div>
    </div>
  );
}

/**
 * Uma coluna no formulário de tabela: mover, nome, tipo (travado se já salva),
 * remover, a dica do tipo e, conforme o tipo, a ligação ou as opções da lista.
 * `colunas` é o retorno de useColunasDoModulo.
 */
export default function LinhaDaColuna({ campo, index, total, isEditing, moduloId, tabelasDeDados, colunas }) {
  const onChange = (field, value) => colunas.handleFieldChange(index, field, value);

  return (
    <div className="py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            onClick={() => colunas.handleMoveField(index, -1)}
            disabled={index === 0}
            className="w-6 h-5 flex items-center justify-center text-light-text hover:text-primary disabled:opacity-25 disabled:hover:text-light-text transition-colors"
            title="Mover para cima"
          >
            <span className="material-icons text-[16px]">expand_less</span>
          </button>
          <button
            type="button"
            onClick={() => colunas.handleMoveField(index, 1)}
            disabled={index === total - 1}
            className="w-6 h-5 flex items-center justify-center text-light-text hover:text-primary disabled:opacity-25 disabled:hover:text-light-text transition-colors"
            title="Mover para baixo"
          >
            <span className="material-icons text-[16px]">expand_more</span>
          </button>
        </div>

        <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary flex items-center justify-center shrink-0">
          <span className="material-icons text-[18px]">{CAMPO_TIPO_INFO[campo.tipo]?.icon || 'text_fields'}</span>
        </span>

        <input
          type="text"
          value={campo.nome}
          onChange={(e) => onChange('nome', e.target.value)}
          required
          placeholder="Nome da coluna"
          className="flex-1 min-w-0 h-10 px-3.5 bg-surface text-ink border border-divider-strong rounded-lg text-sm placeholder:text-light-text transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100"
        />

        <div className="relative shrink-0 w-40">
          <select
            value={campo.tipo}
            onChange={(e) => onChange('tipo', e.target.value)}
            disabled={isEditing && !campo._isNew}
            className="w-full h-10 appearance-none pl-3.5 pr-8 bg-surface text-ink border border-divider-strong rounded-lg text-sm cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-primary-300 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-100 disabled:bg-background disabled:text-faint disabled:border-divider disabled:cursor-not-allowed"
          >
            {Object.entries(CAMPO_TIPO_INFO).map(([value, info]) => (
              <option key={value} value={value}>{info.label}</option>
            ))}
          </select>
          <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
        </div>

        {campo._isNew && (
          <Badge variant="primary" size="sm" className="shrink-0">
            Novo
          </Badge>
        )}

        <button
          type="button"
          onClick={() => colunas.handleRemoveField(index)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-light-text hover:text-danger hover:bg-danger-bg transition-colors shrink-0"
          title="Remover coluna"
        >
          <span className="material-icons text-[20px]">delete_outline</span>
        </button>
      </div>

      {CAMPO_TIPO_DICA[campo.tipo] && (
        <p className="mt-1.5 pl-[84px] text-xs text-light-text">{CAMPO_TIPO_DICA[campo.tipo]}</p>
      )}

      {campo.tipo === 'vinculo' && (
        <LigacaoDaColuna campo={campo} moduloId={moduloId} tabelasDeDados={tabelasDeDados} onChange={onChange} />
      )}

      {campo.tipo === 'selecao' && (
        <OpcoesDaLista
          opcoes={campo.opcoes || []}
          onAdd={() => colunas.handleAddOption(index)}
          onChange={(optIdx, value) => colunas.handleOptionChange(index, optIdx, value)}
          onRemove={(optIdx) => colunas.handleRemoveOption(index, optIdx)}
        />
      )}
    </div>
  );
}
