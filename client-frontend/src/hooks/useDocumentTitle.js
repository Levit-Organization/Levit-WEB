import { useEffect } from 'react';
import { definirTituloDaPagina } from '../utils/tituloDocumento';

export function useDocumentTitle(title) {
  useEffect(() => {
    definirTituloDaPagina(title);
  }, [title]);
}
