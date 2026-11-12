import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { registroService } from '../services/registroService';
import { useToast } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

/**
 * Painel lateral de criar/editar um item: estado do formulário, salvar e o
 * link direto para um item (?item=id), que abre o item quando a lista chega.
 */
export function useFormularioRegistro(id, registrosQuery) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState(null);
  const [formDados, setFormDados] = useState({});
  const [dadosIniciais, setDadosIniciais] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formSujo = JSON.stringify(formDados) !== JSON.stringify(dadosIniciais);

  const abrirFormulario = (registro) => {
    const dados = registro?.dados || {};
    setEditingRegistro(registro);
    setFormDados(dados);
    setDadosIniciais(dados);
    setError('');
    setShowForm(true);
  };

  // Link direto para um item (?item=id), vindo de outra tabela ligada: abre o item
  // quando a lista desta tabela chega. Ajuste durante a renderização, sem efeito.
  const [searchParams, setSearchParams] = useSearchParams();
  const itemDoLink = searchParams.get('item');
  const [linkTratado, setLinkTratado] = useState(null);
  if (itemDoLink && itemDoLink !== linkTratado && registrosQuery.data && !registrosQuery.isPlaceholderData) {
    setLinkTratado(itemDoLink);
    const alvo = registrosQuery.data.find((r) => r.id === itemDoLink);
    if (alvo) abrirFormulario(alvo);
  }

  const closeForm = () => {
    setShowForm(false);
    if (itemDoLink) {
      setSearchParams((atual) => {
        const novos = new URLSearchParams(atual);
        novos.delete('item');
        return novos;
      }, { replace: true });
      setLinkTratado(null);
    }
  };

  const handleFieldChange = (campoId, value) => {
    setFormDados((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setError('');
      if (editingRegistro) {
        await registroService.update(id, editingRegistro.id, { dados: formDados });
        toast.success('Item atualizado.');
      } else {
        await registroService.create(id, { dados: formDados });
        toast.success('Item criado.');
      }
      closeForm();
    } catch (err) {
      setError(mensagemDeErro(err, 'Erro ao salvar item.'));
    } finally {
      setSaving(false);
    }
  };

  return {
    showForm,
    setShowForm,
    editingRegistro,
    formDados,
    formSujo,
    saving,
    error,
    abrirFormulario,
    closeForm,
    handleFieldChange,
    handleSave,
  };
}
