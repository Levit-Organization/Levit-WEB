import { useCallback, useEffect, useState } from 'react';
import Automacoes from './Automacoes';
import { automacaoService } from '../services/automacaoService';
import { moduloService } from '../services/moduloService';

export default function AutomacoesContainer() {
  const [automacoes, setAutomacoes] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const modulosData = await moduloService.getAll();
      const listaModulos = modulosData || [];
      setModulos(listaModulos);

      const listas = await Promise.all(
        listaModulos.map((modulo) =>
          automacaoService
            .listar(modulo.id)
            .then((lista) =>
              (lista || []).map((automacao) => ({
                ...automacao,
                modulo_nome: modulo.nome,
                modulo_icone: modulo.icone,
              }))
            )
            .catch(() => [])
        )
      );

      setAutomacoes(listas.flat());
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar as automações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAtivo = async (automacao, ativo) => {
    setAutomacoes((prev) =>
      prev.map((a) => (a.id === automacao.id ? { ...a, ativo } : a))
    );
    try {
      await automacaoService.alternarAtivo(automacao.modulo_id, automacao.id, ativo);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar o status da automação.');
      setAutomacoes((prev) =>
        prev.map((a) => (a.id === automacao.id ? { ...a, ativo: !ativo } : a))
      );
    }
  };

  const handleDelete = async (automacao) => {
    if (!window.confirm(`Excluir a automação "${automacao.nome}"?`)) return;
    try {
      await automacaoService.excluir(automacao.modulo_id, automacao.id);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir a automação.');
    }
  };

  return (
    <Automacoes
      automacoes={automacoes}
      modulos={modulos}
      loading={loading}
      onToggleAtivo={handleToggleAtivo}
      onDelete={handleDelete}
    />
  );
}
