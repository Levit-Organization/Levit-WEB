import { Input, Select, Textarea } from '../ui';
import { DESTINO_NOTIFICACAO } from '../../utils/automacaoConstants';

/**
 * Ação "Notificação": quem recebe (todos, um cargo, uma pessoa ou o responsável
 * do item), título e mensagem. `onCampo(campo, valor)` muda um campo da configuração.
 */
export default function ConfigNotificacao({ configuracao, camposResponsavel, cargos, equipe, dicaVariaveis, onCampo }) {
  return (
    <div className="flex flex-col gap-3.5 pt-4 border-t border-divider">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Quem recebe"
          value={configuracao.destinatarios || 'todos'}
          onChange={(e) => {
            onCampo('destinatarios', e.target.value);
            onCampo('destino_id', '');
          }}
          required
          options={Object.entries(DESTINO_NOTIFICACAO)
            .filter(([value]) => value !== 'responsavel' || camposResponsavel.length > 0 || configuracao.destinatarios === 'responsavel')
            .map(([value, label]) => ({ value, label }))}
        />
        {configuracao.destinatarios === 'cargo' && (
          <Select
            label="Cargo"
            value={configuracao.destino_id || ''}
            onChange={(e) => onCampo('destino_id', e.target.value)}
            required
            placeholder="Selecione um cargo"
            options={cargos.map((c) => ({ value: c.id, label: c.nome }))}
          />
        )}
        {configuracao.destinatarios === 'usuario' && (
          <Select
            label="Pessoa"
            value={configuracao.destino_id || ''}
            onChange={(e) => onCampo('destino_id', e.target.value)}
            required
            placeholder="Selecione uma pessoa"
            options={equipe.map((m) => ({ value: m.id, label: m.nome || m.email }))}
          />
        )}
      </div>
      <p className="text-xs text-light-text -mt-1">
        Só recebe quem tem acesso a esta tabela, mesmo escolhendo um cargo ou uma pessoa.
      </p>

      <Input
        label="Título"
        value={configuracao.titulo || ''}
        onChange={(e) => onCampo('titulo', e.target.value)}
        required
        maxLength={200}
        placeholder="Ex: Negócio {{Empresa}} fechado"
        hint={dicaVariaveis}
      />

      <Textarea
        label="Mensagem (opcional)"
        value={configuracao.mensagem || ''}
        onChange={(e) => onCampo('mensagem', e.target.value)}
        rows={3}
        placeholder="Detalhes que aparecem abaixo do título. Aceita {{variáveis}}."
      />
    </div>
  );
}
