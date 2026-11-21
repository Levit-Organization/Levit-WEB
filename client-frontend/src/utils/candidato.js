// Mesmas regras do backend (CandidatoController e CandidatoService).
export const CURRICULO_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const CURRICULO_DICA = 'PDF ou Word, até 5 MB';
const CURRICULO_MAXIMO_BYTES = 5 * 1024 * 1024;

export const CANDIDATO_VAZIO = { nome: '', email: '', telefone: '', mensagem: '' };

/** Erros por campo, para a candidatura pública e para o registro pela equipe. */
export function validarCandidato(dados, curriculo) {
  const erros = {};
  if (dados.nome.trim().length < 3) erros.nome = 'Escreva o nome completo.';
  if (!dados.email.trim()) erros.email = 'Informe o e-mail.';
  else if (!/^\S+@\S+\.\S+$/.test(dados.email.trim())) erros.email = 'Esse e-mail não parece válido.';
  if (dados.telefone && dados.telefone.replace(/\D/g, '').length < 10) erros.telefone = 'Telefone incompleto.';
  if (curriculo) {
    if (!/\.(pdf|docx?)$/i.test(curriculo.name)) erros.curriculo = 'Envie em PDF ou Word (.doc ou .docx).';
    else if (curriculo.size > CURRICULO_MAXIMO_BYTES) erros.curriculo = 'O arquivo passa de 5 MB.';
  }
  return erros;
}

/** Link público que a pessoa candidata abre para se inscrever. */
export function linkDaVaga(moduloId) {
  return `${window.location.origin}/vagas/${moduloId}`;
}
