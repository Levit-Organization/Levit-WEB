import { Select, Input } from '../ui';
import { useModulo } from '../../hooks/queries';
import { CampoValor } from './CondicoesEditor';

function dicaVariaveis(campos) {
  return campos.length > 0 ? `Aceita variáveis: ${campos.map((c) => `{{${c.nome}}}`).join(', ')}` : undefined;
}

/** Muda um campo do registro que disparou a automação. */
export function AcaoAtualizarCampo({ configuracao, campos, onChange }) {
  const campo = campos.find((c) => String(c.id) === String(configuracao.campo_id));

  return (
    <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Coluna"
          value={configuracao.campo_id || ''}
          onChange={(e) => onChange({ campo_id: e.target.value, valor: '' })}
          required
          placeholder="Selecione a coluna"
          options={campos.map((c) => ({ value: c.id, label: c.nome }))}
        />
        {['selecao', 'responsavel', 'prazo', 'recorrencia'].includes(campo?.tipo) ? (
          <CampoValor label="Novo valor" campo={campo} value={configuracao.valor || ''} onChange={(v) => onChange({ valor: v })} />
        ) : (
          <Input
            label="Novo valor"
            value={configuracao.valor || ''}
            onChange={(e) => onChange({ valor: e.target.value })}
            placeholder={campo?.tipo === 'data' ? 'AAAA-MM-DD' : 'Deixe vazio para limpar a coluna'}
          />
        )}
      </div>
      <p className="text-xs text-light-text -mt-1">
        {dicaVariaveis(campos) || 'Aceita {{variáveis}} com as colunas do item.'} Não funciona com o gatilho “Exclusão”.
      </p>
    </div>
  );
}

/** Cria um registro em outro módulo, preenchendo os campos a partir deste. */
export function AcaoCriarRegistro({ configuracao, camposOrigem, modulos, onChange }) {
  const destinoId = configuracao.modulo_destino_id || '';
  const destino = useModulo(destinoId || undefined).data;
  const camposDestino = destino?.campos || [];
  const mapeamento = configuracao.mapeamento || {};

  return (
    <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
      <Select
        label="Tabela onde criar"
        value={destinoId}
        onChange={(e) => onChange({ modulo_destino_id: e.target.value, mapeamento: {} })}
        required
        placeholder="Selecione uma tabela"
        options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
      />

      {destinoId && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink mb-1">Colunas do novo item</legend>
          {camposDestino.length === 0 ? (
            <p className="text-xs text-light-text">Carregando colunas…</p>
          ) : (
            camposDestino.map((campo) => (
              <Input
                key={campo.id}
                label={campo.nome}
                value={mapeamento[campo.id] || ''}
                onChange={(e) => onChange({ mapeamento: { ...mapeamento, [campo.id]: e.target.value } })}
                placeholder={campo.tipo === 'selecao' ? `Uma das opções: ${(campo.opcoes || []).join(', ')}` : 'Texto fixo ou {{variável}}'}
              />
            ))
          )}
          <p className="text-xs text-light-text">
            {dicaVariaveis(camposOrigem)} Campos vazios ficam em branco no novo registro.
          </p>
        </fieldset>
      )}
    </div>
  );
}
