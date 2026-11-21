import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { moduloService } from '../../services/moduloService';
import { queryKeys } from '../../hooks/queries';
import { mensagemDeErro } from '../../lib/queryClient';
import { trocarIconeNaLista } from '../../utils/configuracoes';

/**
 * Seletor de ícone aberto (um por vez) e troca otimista: o ícone muda no cache
 * na hora e volta ao anterior se o servidor recusar.
 */
export function useIconeDasTabelas() {
  const queryClient = useQueryClient();
  const [pickerAbertoId, setPickerAbertoId] = useState(null);
  const [salvandoId, setSalvandoId] = useState(null);
  const [error, setError] = useState('');

  const trocarIconeNoCache = (moduloId, icone) =>
    queryClient.setQueryData(queryKeys.modulos, (atual) => trocarIconeNaLista(atual, moduloId, icone));

  const alternarPicker = (moduloId) => setPickerAbertoId(pickerAbertoId === moduloId ? null : moduloId);

  const escolherIcone = async (modulo, icone) => {
    setPickerAbertoId(null);
    if (icone === modulo.icone) return;

    setSalvandoId(modulo.id);
    setError('');
    const anterior = modulo.icone;
    trocarIconeNoCache(modulo.id, icone);

    try {
      await moduloService.update(modulo.id, { icone });
    } catch (err) {
      setError(mensagemDeErro(err, 'Erro ao atualizar o ícone da tabela.'));
      trocarIconeNoCache(modulo.id, anterior);
    } finally {
      setSalvandoId(null);
    }
  };

  return { pickerAbertoId, salvandoId, error, alternarPicker, escolherIcone };
}
