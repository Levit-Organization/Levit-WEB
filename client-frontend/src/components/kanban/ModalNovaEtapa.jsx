import { Alert, Button, Input, Modal, Select } from '../ui';

/** Modal "Nova etapa" no fim do quadro da vaga (estado em `useNovaEtapa`). */
export default function ModalNovaEtapa({ etapa, opcoesVaga }) {
  const {
    showNovaEtapa,
    novaEtapaNome,
    setNovaEtapaNome,
    novaEtapaVagaId,
    setNovaEtapaVagaId,
    etapaErro,
    salvandoEtapa,
    fecharNovaEtapa,
    handleNovaEtapa,
  } = etapa;

  return (
    <Modal
      open={showNovaEtapa}
      onClose={fecharNovaEtapa}
      title="Nova etapa"
      subtitle="Ela entra no fim do quadro desta vaga"
      dirty={novaEtapaNome.trim() !== ''}
      footer={
        <>
          <Button variant="secondary" onClick={fecharNovaEtapa}>Cancelar</Button>
          <Button
            type="submit"
            form="nova-etapa-form"
            loading={salvandoEtapa}
            disabled={!novaEtapaNome.trim() || !novaEtapaVagaId}
          >
            Criar etapa
          </Button>
        </>
      }
    >
      {etapaErro && (
        <div className="mb-4">
          <Alert variant="error">{etapaErro}</Alert>
        </div>
      )}

      <form id="nova-etapa-form" onSubmit={handleNovaEtapa} className="flex flex-col gap-4">
        <Select
          label="Vaga"
          name="vaga"
          value={novaEtapaVagaId}
          onChange={(e) => setNovaEtapaVagaId(e.target.value)}
          placeholder="Selecione uma vaga..."
          options={opcoesVaga}
          required
        />

        <Input
          label="Nome da etapa"
          name="nome_etapa"
          value={novaEtapaNome}
          onChange={(e) => setNovaEtapaNome(e.target.value)}
          placeholder="Ex: Entrevista técnica"
          autoComplete="off"
          autoFocus
          required
        />
      </form>
    </Modal>
  );
}
