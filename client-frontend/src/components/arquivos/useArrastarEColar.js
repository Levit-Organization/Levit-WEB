import { useEffect, useRef, useState } from 'react';

/** Algum diálogo aberto (confirmação, visualização): arrastar ou colar não envia nada. */
function dialogoAberto() {
  return !!document.querySelector('[aria-modal="true"]');
}

function temArquivos(evento) {
  return Array.from(evento.dataTransfer?.types || []).includes('Files');
}

/**
 * Arrastar arquivos para qualquer ponto da página ou colar (Ctrl+V) entrega os
 * arquivos a `adicionar`. Devolve `true` enquanto há arquivos sendo arrastados por cima.
 */
export function useArrastarEColar(adicionar) {
  const [arrastando, setArrastando] = useState(false);
  const profundidade = useRef(0);

  useEffect(() => {
    // Na janela toda: soltar fora da área certa abriria o arquivo no navegador e tiraria a pessoa do app.
    const entrar = (e) => {
      if (!temArquivos(e) || dialogoAberto()) return;
      e.preventDefault();
      profundidade.current += 1;
      setArrastando(true);
    };
    const sobre = (e) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = dialogoAberto() ? 'none' : 'copy';
    };
    const sair = (e) => {
      if (!temArquivos(e)) return;
      profundidade.current = Math.max(0, profundidade.current - 1);
      if (profundidade.current === 0) setArrastando(false);
    };
    const soltar = (e) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      profundidade.current = 0;
      setArrastando(false);
      if (!dialogoAberto()) adicionar(e.dataTransfer.files);
    };
    const colar = (e) => {
      const colados = e.clipboardData?.files;
      if (!colados?.length || dialogoAberto()) return;
      e.preventDefault();
      adicionar(colados);
    };

    window.addEventListener('dragenter', entrar);
    window.addEventListener('dragover', sobre);
    window.addEventListener('dragleave', sair);
    window.addEventListener('drop', soltar);
    window.addEventListener('paste', colar);
    return () => {
      window.removeEventListener('dragenter', entrar);
      window.removeEventListener('dragover', sobre);
      window.removeEventListener('dragleave', sair);
      window.removeEventListener('drop', soltar);
      window.removeEventListener('paste', colar);
    };
  }, [adicionar]);

  return arrastando;
}
