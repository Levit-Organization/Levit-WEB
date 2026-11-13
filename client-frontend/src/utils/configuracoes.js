import { TAMANHO_MAXIMO_IMAGEM } from './avatarStorage';

/** Motivo para recusar o arquivo escolhido como foto ou logo, ou null se servir. */
export function erroDaImagem(arquivo) {
  if (!arquivo.type.startsWith('image/')) return 'Escolha um arquivo de imagem.';
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) return 'A imagem precisa ter no máximo 2 MB.';
  return null;
}

/** Motivo para recusar a nova senha, ou null se servir. */
export function erroDaNovaSenha({ nova, confirmar }) {
  if (nova.length < 8) return 'A nova senha precisa ter pelo menos 8 caracteres.';
  if (nova !== confirmar) return 'A confirmação não corresponde à nova senha.';
  return null;
}

/** Lista de tabelas com o ícone de uma delas trocado (sem lista, continua sem). */
export function trocarIconeNaLista(modulos, moduloId, icone) {
  return modulos?.map((m) => (m.id === moduloId ? { ...m, icone } : m));
}
