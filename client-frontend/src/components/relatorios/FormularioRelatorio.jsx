import { Button, Input, Modal, Select, Toggle } from '../ui';
import { cn } from '../ui/cn';
import PessoaResponsavel from '../prazos/PessoaResponsavel';
import { useFormularioRelatorio } from '../../hooks/useFormularioRelatorio';
import { COBERTURA_DA_FREQUENCIA, FREQUENCIAS, opcoesDoDia } from '../../utils/relatoriosAgendados';
import EscolhaDeSecoes from './EscolhaDeSecoes';

/** Escolha da frequência (controle segmentado) e do dia, quando há dia a escolher. */
function FrequenciaEDia({ form, mudar }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <span className="block text-sm font-medium text-ink mb-1.5">Frequência</span>
        <div role="group" aria-label="Frequência" className="flex gap-1 rounded-lg bg-sidebar p-1">
          {FREQUENCIAS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={form.frequencia === valor}
              onClick={() => mudar({ frequencia: valor, dia: 1 })}
              className={cn(
                'flex-1 rounded-md h-8 text-sm font-semibold transition-colors',
                form.frequencia === valor ? 'bg-surface text-ink shadow-xs' : 'text-light-text hover:text-ink'
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {form.frequencia !== 'diario' && (
        <Select
          label={form.frequencia === 'semanal' ? 'Dia da semana' : 'Dia do mês'}
          value={form.dia}
          onChange={(e) => mudar({ dia: Number(e.target.value) })}
          options={opcoesDoDia(form.frequencia)}
        />
      )}
    </div>
  );
}

/** Modal de criar/editar um relatório agendado. */
export default function FormularioRelatorio({ aberto, inicial, pessoas, onFechar }) {
  const { form, erro, salvando, editando, sujo, mudar, alternarPessoa, salvar } = useFormularioRelatorio(inicial, onFechar);

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      dirty={sujo}
      title={editando ? 'Editar relatório' : 'Novo relatório'}
      subtitle="O PDF chega por e-mail de manhã, no dia escolhido."
      footer={
        <>
          <Button variant="secondary" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" form="form-relatorio" loading={salvando}>{editando ? 'Salvar' : 'Agendar'}</Button>
        </>
      }
    >
      <form id="form-relatorio" onSubmit={salvar} className="flex flex-col gap-4" noValidate>
        {erro && <p className="text-sm text-danger" role="alert">{erro}</p>}
        <Input label="Nome" value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Ex: Resumo semanal da equipe" maxLength={100} required />

        <FrequenciaEDia form={form} mudar={mudar} />
        <p className="text-xs text-light-text -mt-2">{COBERTURA_DA_FREQUENCIA[form.frequencia]}</p>

        <EscolhaDeSecoes valor={form.secoes} onChange={(secoes) => mudar({ secoes })} />

        <fieldset>
          <legend className="text-sm font-medium text-ink mb-1.5">Quem recebe</legend>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-divider divide-y divide-divider">
            {pessoas.map((p) => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-background">
                <input type="checkbox" checked={form.destinatarios.includes(p.id)} onChange={() => alternarPessoa(p.id)} className="w-4 h-4 accent-primary" />
                <PessoaResponsavel nome={p.nome} className="text-sm text-ink" />
              </label>
            ))}
          </div>
        </fieldset>

        <Toggle checked={form.ativo} onChange={(ativo) => mudar({ ativo })} label="Ligado" description="Pausado, o relatório não é enviado." />
      </form>
    </Modal>
  );
}
