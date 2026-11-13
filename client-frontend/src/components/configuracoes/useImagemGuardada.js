import { useState } from 'react';

/**
 * Foto ou logo guardada no navegador (avatarStorage): `ler`/`gravar` recebem o
 * id do dono. Trocar limpa o erro da última tentativa; remover não.
 */
export function useImagemGuardada(ler, gravar, donoId) {
  const [imagem, setImagem] = useState(() => ler(donoId));
  const [erro, setErro] = useState('');

  const trocar = (dataUrl) => {
    setErro('');
    setImagem(dataUrl);
    gravar(donoId, dataUrl);
  };

  const remover = () => {
    setImagem(null);
    gravar(donoId, null);
  };

  return { imagem, erro, setErro, trocar, remover };
}
