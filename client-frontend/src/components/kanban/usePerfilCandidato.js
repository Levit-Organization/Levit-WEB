import { useState, useCallback, useMemo } from 'react';
import { coresDaFase } from '../ui';
import { localizarCandidato } from '../../utils/kanban';

/**
 * Perfil aberto no quadro. Guardamos só o id: o perfil lê o funil atual, então
 * reflete a etapa nova assim que o candidato é movido (inclusive pelo seletor de etapa do modal).
 */
export function usePerfilCandidato(kanbanData, colunas) {
  const [perfilId, setPerfilId] = useState(null);
  const [perfilAberto, setPerfilAberto] = useState(false);

  const abrirPerfil = useCallback((candidatoId) => {
    setPerfilId(candidatoId);
    setPerfilAberto(true);
  }, []);

  const fecharPerfil = () => setPerfilAberto(false);

  const perfil = useMemo(() => localizarCandidato(kanbanData, perfilId), [kanbanData, perfilId]);
  const perfilCor = useMemo(() => {
    if (!perfil) return null;
    const indice = colunas.findIndex(([colId]) => colId === perfil.colId);
    return coresDaFase(Math.max(indice, 0), colunas.length);
  }, [perfil, colunas]);

  return { perfil, perfilCor, perfilAberto, abrirPerfil, fecharPerfil };
}
