import { useMemo, useState } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { filtrarMembros } from '../../utils/equipe';

/**
 * Busca, filtro por cargo e paginação da lista de colaboradores. Fica na página
 * (não no painel da aba) para o filtro sobreviver à troca de aba.
 */
export function useFiltroMembros(members, roles) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredMembers = useMemo(
    () => filtrarMembros(members, roles, normalizedSearch, roleFilter),
    [members, roles, normalizedSearch, roleFilter]
  );

  const paginacao = usePagination(filteredMembers, 25);

  const buscar = (valor) => {
    setSearchTerm(valor);
    paginacao.setPage(1);
  };

  const filtrarPorCargo = (valor) => {
    setRoleFilter(valor);
    paginacao.setPage(1);
  };

  return {
    searchTerm,
    roleFilter,
    buscar,
    filtrarPorCargo,
    filtrando: !!(normalizedSearch || roleFilter),
    filteredMembers,
    paginacao,
  };
}
