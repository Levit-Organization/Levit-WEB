import { Card, Input, Select, Toggle } from '../ui';

/** Painel de propriedades: nome, tabela de origem (travada na edição) e "Ativar ao salvar". */
export default function PropriedadesDaAutomacao({
  nome,
  onNome,
  moduloId,
  onModulo,
  modulos,
  isEditing,
  vaga,
  ativarAoSalvar,
  onAtivarAoSalvar,
}) {
  return (
    <Card className="lg:sticky lg:top-8 flex flex-col gap-5">
      <h2 className="text-base font-semibold">Propriedades</h2>

      <Input
        label="Nome da automação"
        value={nome}
        onChange={(e) => onNome(e.target.value)}
        required
        placeholder="Ex: Notificar novo lead"
      />

      <Select
        label="Tabela de origem"
        value={moduloId}
        onChange={(e) => onModulo(e.target.value)}
        required
        disabled={isEditing}
        hint={vaga ? 'Vaga de recrutamento: a automação trabalha com candidatos.' : undefined}
        placeholder="Selecione uma tabela"
        options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
      />

      <div className="pt-4 border-t border-divider">
        <Toggle checked={ativarAoSalvar} onChange={onAtivarAoSalvar} label="Ativar ao salvar" />
      </div>
    </Card>
  );
}
