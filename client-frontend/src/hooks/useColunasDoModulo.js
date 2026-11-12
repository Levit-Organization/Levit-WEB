import { useState } from 'react';
import { moduloService } from '../services/moduloService';
import { useToast, useConfirm } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

/**
 * Colunas no formulário de tabela: adicionar, editar, remover, reordenar e as
 * opções das listas. Na edição, excluir e reordenar colunas já salvas vão
 * direto para a API; o resto só ao salvar a tabela.
 */
export function useColunasDoModulo(id, isEditing) {
  const toast = useToast();
  const confirm = useConfirm();
  const [campos, setCampos] = useState([]);
  const [camposOriginais, setCamposOriginais] = useState([]);

  const handleAddField = () => {
    setCampos([...campos, {
      nome: '',
      tipo: 'texto',
      opcoes: null,
      _isNew: true,
      _tempId: Date.now()
    }]);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...campos];
    updated[index] = { ...updated[index], [field]: value };
    // Ligação guarda { multiplo } em opcoes; as listas, um array. Trocar de tipo não leva um para o outro.
    if (field === 'tipo' && (value === 'vinculo' || campos[index].tipo === 'vinculo')) {
      updated[index] = { ...updated[index], opcoes: value === 'vinculo' ? { multiplo: false } : null, modulo_vinculado_id: '' };
    }
    setCampos(updated);
  };

  const handleRemoveField = async (index) => {
    const campo = campos[index];

    if (isEditing && campo.id && !campo._isNew) {
      const ok = await confirm({
        title: `Excluir a coluna "${campo.nome}"?`,
        message: 'Isso só é possível se não houver itens usando esta coluna.',
        confirmLabel: 'Excluir coluna',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await moduloService.deleteField(id, campo.id);
        toast.success('Coluna excluída com sucesso.');
      } catch (err) {
        toast.error(mensagemDeErro(err, 'Erro ao excluir a coluna. Ela pode ter itens preenchidos.'));
        return;
      }
    }

    const updated = [...campos];
    updated.splice(index, 1);
    setCampos(updated);
  };

  const handleMoveField = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= campos.length) return;

    const reordered = [...campos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setCampos(reordered);

    const temCamposNovos = reordered.some((c) => c._isNew);
    if (isEditing && !temCamposNovos) {
      try {
        await moduloService.reorderFields(id, reordered.map((c) => c.id));
      } catch (err) {
        toast.error(mensagemDeErro(err, 'Erro ao reordenar as colunas.'));
      }
    }
  };

  const handleAddOption = (campoIndex) => {
    const updated = [...campos];
    const campo = updated[campoIndex];
    const opcoes = campo.opcoes || [];
    updated[campoIndex] = { ...campo, opcoes: [...opcoes, ''] };
    setCampos(updated);
  };

  const handleOptionChange = (campoIndex, optionIndex, value) => {
    const updated = [...campos];
    const opcoes = [...(updated[campoIndex].opcoes || [])];
    opcoes[optionIndex] = value;
    updated[campoIndex] = { ...updated[campoIndex], opcoes };
    setCampos(updated);
  };

  const handleRemoveOption = (campoIndex, optionIndex) => {
    const updated = [...campos];
    const opcoes = [...(updated[campoIndex].opcoes || [])];
    opcoes.splice(optionIndex, 1);
    updated[campoIndex] = { ...updated[campoIndex], opcoes };
    setCampos(updated);
  };

  return {
    campos,
    setCampos,
    camposOriginais,
    setCamposOriginais,
    handleAddField,
    handleFieldChange,
    handleRemoveField,
    handleMoveField,
    handleAddOption,
    handleOptionChange,
    handleRemoveOption,
  };
}
