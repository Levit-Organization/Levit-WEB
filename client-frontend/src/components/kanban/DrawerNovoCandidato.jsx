import { Alert, Button, Drawer, FileInput, Input, Select, Textarea } from '../ui';
import { mascararTelefone } from '../../utils/masks';
import { CURRICULO_ACCEPT, CURRICULO_DICA } from '../../utils/candidato';

/** Painel "Novo candidato", registrado pela equipe (estado em `useNovoCandidato`). */
export default function DrawerNovoCandidato({ candidato, opcoesVaga }) {
  const {
    showNovoCandidato,
    salvandoCandidato,
    novoCandidatoDados,
    novoCurriculo,
    candidatoErros,
    candidatoErro,
    candidatoSujo,
    fecharNovoCandidato,
    alterarCandidato,
    alterarCurriculo,
    handleNovoCandidatoSubmit,
  } = candidato;

  return (
    <Drawer
      open={showNovoCandidato}
      onClose={fecharNovoCandidato}
      title="Novo candidato"
      subtitle="Entra na primeira etapa do quadro da vaga"
      dirty={candidatoSujo}
      footer={
        <>
          <Button variant="secondary" onClick={fecharNovoCandidato}>Cancelar</Button>
          <Button type="submit" form="novo-candidato-form" loading={salvandoCandidato}>
            {salvandoCandidato ? 'Salvando...' : 'Adicionar candidato'}
          </Button>
        </>
      }
    >
      {candidatoErro && (
        <div className="mb-4">
          <Alert variant="error">{candidatoErro}</Alert>
        </div>
      )}

      <form id="novo-candidato-form" onSubmit={handleNovoCandidatoSubmit} noValidate className="flex flex-col gap-4">
        <Select
          label="Vaga"
          name="vaga"
          value={novoCandidatoDados.modulo_id}
          onChange={(e) => alterarCandidato('modulo_id', e.target.value)}
          placeholder="Selecione uma vaga..."
          options={opcoesVaga}
          error={candidatoErros.modulo_id}
          required
        />
        <Input
          label="Nome"
          name="nome"
          autoComplete="off"
          value={novoCandidatoDados.nome}
          onChange={(e) => alterarCandidato('nome', e.target.value)}
          placeholder="Nome completo"
          error={candidatoErros.nome}
          required
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={novoCandidatoDados.email}
          onChange={(e) => alterarCandidato('email', e.target.value)}
          placeholder="candidato@email.com"
          error={candidatoErros.email}
          required
        />
        <Input
          label="Telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={novoCandidatoDados.telefone}
          onChange={(e) => alterarCandidato('telefone', mascararTelefone(e.target.value))}
          placeholder="(11) 90000-0000"
          error={candidatoErros.telefone}
        />
        <FileInput
          label="Currículo"
          name="curriculo"
          accept={CURRICULO_ACCEPT}
          hint={CURRICULO_DICA}
          value={novoCurriculo}
          onChange={alterarCurriculo}
          error={candidatoErros.curriculo}
        />
        <Textarea
          label="Mensagem"
          name="mensagem"
          hint="Opcional"
          value={novoCandidatoDados.mensagem}
          onChange={(e) => alterarCandidato('mensagem', e.target.value)}
        />
      </form>
    </Drawer>
  );
}
