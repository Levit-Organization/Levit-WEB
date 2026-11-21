import { Button, Modal } from '../ui';
import PerfilCandidato from './PerfilCandidato';

/** Modal do perfil do candidato aberto no quadro (estado em `usePerfilCandidato`). */
export default function ModalPerfilCandidato({ perfil, perfilCor, perfilAberto, onClose, vagas, colunas, podeMover, onMover }) {
  return (
    <Modal
      open={perfilAberto && !!perfil}
      onClose={onClose}
      title={perfil?.candidato.nome || 'Candidato'}
      subtitle={perfil?.candidato.vaga || vagas.find((v) => v.id === perfil?.candidato.modulo_id)?.nome || undefined}
      maxWidth="lg"
      footer={
        perfil?.candidato.email ? (
          <>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
            <Button
              icon="mail"
              onClick={() => { window.location.href = `mailto:${perfil.candidato.email}`; }}
            >
              Enviar e-mail
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        )
      }
    >
      {perfil && (
        <PerfilCandidato
          perfil={perfil}
          cor={perfilCor}
          colunas={colunas}
          podeMover={podeMover}
          onMover={(paraColuna) => onMover(perfil.candidato, perfil.colId, paraColuna)}
        />
      )}
    </Modal>
  );
}
