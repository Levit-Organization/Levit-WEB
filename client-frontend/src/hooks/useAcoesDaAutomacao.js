import { useState } from 'react';
import { configuracaoInicial, novaAcao } from '../utils/automacaoConstants';

/** Ações ("Então") do formulário de automação: trocar o tipo, configurar, adicionar e remover. */
export function useAcoesDaAutomacao() {
  const [acoes, setAcoes] = useState([novaAcao()]);

  const handleAcaoTipoChange = (index, tipo) => {
    setAcoes((prev) =>
      prev.map((a, i) => (i === index ? { tipo, configuracao: configuracaoInicial(tipo) } : a))
    );
  };

  const handleAcaoConfigChange = (index, campo, valor) => {
    setAcoes((prev) =>
      prev.map((a, i) => (i === index ? { ...a, configuracao: { ...a.configuracao, [campo]: valor } } : a))
    );
  };

  const mesclarConfiguracao = (index, parcial) => {
    setAcoes((prev) => prev.map((a, i) => (i === index ? { ...a, configuracao: { ...a.configuracao, ...parcial } } : a)));
  };

  const handleAddAcao = () => setAcoes((prev) => [...prev, novaAcao()]);
  const handleRemoveAcao = (index) => setAcoes((prev) => prev.filter((_, i) => i !== index));

  return {
    acoes,
    setAcoes,
    handleAcaoTipoChange,
    handleAcaoConfigChange,
    mesclarConfiguracao,
    handleAddAcao,
    handleRemoveAcao,
  };
}
