import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { moduloService } from '../services/moduloService';
import { modulosQuery } from './queries';
import { useToast, useConfirm } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { alteracoesDaColuna, payloadDaColuna } from '../utils/modulos';
import { useColunasDoModulo } from './useColunasDoModulo';

/**
 * Criar/editar uma tabela: dados básicos, colunas, etapas (vagas), modelos e
 * o salvar. Na edição, carrega a tabela e grava cada coluna nova ou alterada.
 */
export function useFormularioModulo(id) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    nome: '',
    icone: 'extension',
    tipo: 'dados'
  });
  const colunas = useColunasDoModulo(id, isEditing);
  const { campos, setCampos, camposOriginais, setCamposOriginais } = colunas;
  const [fases, setFases] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modeloAplicado, setModeloAplicado] = useState(null);
  const proximoIdTemporario = useRef(0);

  /** Preenche nome, ícone, tipo e colunas a partir de um modelo (tudo editável depois). */
  // Foto do que o último modelo preencheu: trocar de modelo sem ter editado nada não pede confirmação.
  const fotoDoModelo = useRef(null);
  const fotoAtual = () => JSON.stringify([formData.nome, campos.map((c) => [c.nome, c.tipo, c.opcoes])]);

  const aplicarModelo = async (modelo) => {
    const temConteudo = formData.nome.trim() || campos.some((c) => c.nome.trim());
    const editou = fotoDoModelo.current === null || fotoDoModelo.current !== fotoAtual();
    if (temConteudo && editou && modeloAplicado !== modelo.id) {
      const ok = await confirm({
        title: `Usar o modelo "${modelo.titulo}"?`,
        message: 'O nome e as colunas que você já preencheu serão substituídos pelos do modelo.',
        confirmLabel: 'Usar modelo',
        cancelLabel: 'Manter o que fiz',
      });
      if (!ok) return;
    }
    setFormData({ nome: modelo.nome, icone: modelo.icone, tipo: modelo.tipo });
    setCampos(modelo.colunas.map((c, i) => ({ ...c, opcoes: c.opcoes ? [...c.opcoes] : null, _isNew: true, _tempId: `modelo-${++proximoIdTemporario.current}-${i}` })));
    setFases(modelo.fases ? [...modelo.fases] : ['']);
    setModeloAplicado(modelo.id);
    fotoDoModelo.current = JSON.stringify([modelo.nome, modelo.colunas.map((c) => [c.nome, c.tipo, c.opcoes])]);
  };

  useEffect(() => {
    if (!isEditing) return undefined;

    // Evita aplicar a resposta de um módulo anterior se a rota mudar no meio.
    let cancelado = false;

    const fetchModulo = async () => {
      try {
        setLoading(true);
        const modulo = await moduloService.getById(id);
        if (cancelado) return;
        if (modulo) {
          setFormData({
            nome: modulo.nome,
            icone: modulo.icone || 'extension',
            tipo: modulo.tipo || 'dados'
          });
          if (modulo.campos) {
            setCampos(modulo.campos);
            setCamposOriginais(modulo.campos.map(c => ({ ...c })));
          }
        } else {
          setError('Tabela não encontrada.');
        }
      } catch (err) {
        if (!cancelado) setError(mensagemDeErro(err, 'Erro ao carregar tabela.'));
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchModulo();
    return () => {
      cancelado = true;
    };
  }, [id, isEditing, setCampos, setCamposOriginais]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Traz a lista de módulos atualizada ANTES de navegar: quem chega em /modulos
  // já vê o módulo novo/renomeado, sem um frame com a lista antiga.
  const atualizarListaDeModulos = () => queryClient.fetchQuery({ ...modulosQuery, staleTime: 0 }).catch(() => undefined);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await moduloService.update(id, formData);

        for (const campo of campos) {
          if (campo._isNew) {
            await moduloService.addField(id, payloadDaColuna(campo));
          } else if (campo.id) {
            const original = camposOriginais.find(c => c.id === campo.id);
            const updateData = original && alteracoesDaColuna(campo, original);
            if (updateData) await moduloService.updateField(id, campo.id, updateData);
          }
        }

        await atualizarListaDeModulos();
        toast.success('Tabela atualizada.');
        navigate('/modulos');
      } else {
        const camposLimpos = campos.map(payloadDaColuna);
        const payload = { ...formData, campos: camposLimpos };

        if (formData.tipo === 'recrutamento') {
          payload.fases = fases.map((f) => f.trim()).filter(Boolean);
        }

        await moduloService.create(payload);
        await atualizarListaDeModulos();
        toast.success('Tabela criada.');
        navigate('/modulos');
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).join(' | '));
      } else {
        setError(mensagemDeErro(err, 'Erro ao salvar a tabela.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    isEditing,
    formData,
    setFormData,
    colunas,
    fases,
    setFases,
    loading,
    error,
    modeloAplicado,
    aplicarModelo,
    handleInputChange,
    handleSubmit,
  };
}
