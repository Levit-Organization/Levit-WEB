const AVATAR_PREFIX = 'levit_avatar_';
const LOGO_PREFIX = 'levit_logo_';

export const TAMANHO_MAXIMO_IMAGEM = 2 * 1024 * 1024;

export function getAvatar(usuarioId) {
  if (!usuarioId) return null;
  try { return localStorage.getItem(AVATAR_PREFIX + usuarioId); } catch { return null; }
}

export function setAvatar(usuarioId, dataUrl) {
  if (!usuarioId) return;
  try {
    if (dataUrl) localStorage.setItem(AVATAR_PREFIX + usuarioId, dataUrl);
    else localStorage.removeItem(AVATAR_PREFIX + usuarioId);
  } catch { /* localStorage indisponível ou cheio */ }
}

export function getLogo(empresaId) {
  if (!empresaId) return null;
  try { return localStorage.getItem(LOGO_PREFIX + empresaId); } catch { return null; }
}

export function setLogo(empresaId, dataUrl) {
  if (!empresaId) return;
  try {
    if (dataUrl) localStorage.setItem(LOGO_PREFIX + empresaId, dataUrl);
    else localStorage.removeItem(LOGO_PREFIX + empresaId);
  } catch { /* localStorage indisponível ou cheio */ }
}
