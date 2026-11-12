import { Input, Textarea } from '../ui';

/**
 * Ação "Enviar e-mail": destinatário (endereço, {{variável}} ou a pessoa de uma
 * coluna Responsável), assunto e mensagem.
 * `onCampo(campo, valor)` muda um campo da configuração; `onMesclar(parcial)`, vários.
 */
export default function ConfigEmail({ configuracao, camposResponsavel, camposModulo, vaga, dicaVariaveis, onCampo, onMesclar }) {
  return (
    <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
      {camposResponsavel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-light-text">Enviar para:</span>
          {camposResponsavel.map((c) => {
            const ativo = configuracao.destinatario_campo_id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => onMesclar({ destinatario: '', destinatario_campo_id: ativo ? '' : c.id })}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 h-7 text-xs font-semibold transition-colors ${
                  ativo ? 'border-primary bg-primary-50 text-primary-700' : 'border-divider-strong text-ink-soft hover:border-primary-300'
                }`}
              >
                <span className="material-icons text-[16px]" aria-hidden="true">person</span>
                {c.nome} do item
              </button>
            );
          })}
        </div>
      )}

      {camposResponsavel.some((c) => c.id === configuracao.destinatario_campo_id) ? (
        <p className="text-xs text-light-text -mt-1">
          Vai para o e-mail da conta da pessoa.
        </p>
      ) : (
        <Input
          label="Destinatário (e-mail)"
          value={configuracao.destinatario || configuracao.destinatario_campo_id || ''}
          onChange={(e) => {
            onCampo('destinatario', e.target.value);
            if (configuracao.destinatario_campo_id) {
              onCampo('destinatario_campo_id', '');
            }
          }}
          required
          placeholder="Ex: admin@empresa.com ou {{Email}}"
          hint={
            vaga
              ? 'Para escrever ao candidato, use {{E-mail}}.'
              : camposModulo.length > 0
                ? `Para enviar a um e-mail do item, use: ${camposModulo.map((c) => `{{${c.nome}}}`).join(', ')}`
                : undefined
          }
        />
      )}

      <Input
        label="Assunto"
        value={configuracao.assunto || ''}
        onChange={(e) => onCampo('assunto', e.target.value)}
        required
        placeholder="Ex: Olá {{nome}}, recebemos seu contato"
        hint={dicaVariaveis}
      />

      <Textarea
        label="Modelo de mensagem"
        value={configuracao.corpo || ''}
        onChange={(e) => onCampo('corpo', e.target.value)}
        required
        rows={4}
        placeholder="Escreva o corpo do e-mail. Use {{nome_do_campo}} para inserir dados do item."
      />
    </div>
  );
}
