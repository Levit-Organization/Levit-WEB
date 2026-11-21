import { useState } from 'react';

/** Modal "Acesso por tabela": qual cargo está aberto e o nível de cada tabela. */
export function useAcessoPorTabela({ moduloNiveis, onOpenRoleModules, onSetModuloNivel, onRemoveModuloNivel }) {
  const [moduleAccessRole, setModuleAccessRole] = useState(null);

  const openModuleAccessModal = (role) => {
    setModuleAccessRole(role);
    if (!role.acesso_total) {
      onOpenRoleModules?.(role.id);
    }
  };

  const closeModuleAccessModal = () => {
    setModuleAccessRole(null);
  };

  const moduloNivelPorId = moduloNiveis.reduce((acc, item) => {
    acc[item.modulo_id] = item.nivel;
    return acc;
  }, {});

  const handleModuloNivelChange = (moduloId, nivel) => {
    if (!moduleAccessRole) return;

    if (!nivel) {
      onRemoveModuloNivel?.(moduleAccessRole.id, moduloId);
    } else {
      onSetModuloNivel?.(moduleAccessRole.id, moduloId, nivel);
    }
  };

  return {
    moduleAccessRole,
    moduloNivelPorId,
    openModuleAccessModal,
    closeModuleAccessModal,
    handleModuloNivelChange,
  };
}
