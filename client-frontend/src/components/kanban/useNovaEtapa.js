import { useState } from 'react';
import { recrutamentoService } from '../../services/recrutamentoService';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';

/** Estado do modal "Nova etapa": abre já na vaga aberta (se houver uma). */
export function useNovaEtapa({ vagaSelecionada, modoSomenteLeitura }) {
  const toast = useToast();
  const [showNovaEtapa, setShowNovaEtapa] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaVagaId, setNovaEtapaVagaId] = useState('');
  const [etapaErro, setEtapaErro] = useState('');
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);

  const abrirNovaEtapa = () => {
    setEtapaErro('');
    setNovaEtapaNome('');
    setNovaEtapaVagaId(modoSomenteLeitura ? '' : vagaSelecionada);
    setShowNovaEtapa(true);
  };

  const fecharNovaEtapa = () => setShowNovaEtapa(false);

  const handleNovaEtapa = async (e) => {
    e?.preventDefault();
    if (!novaEtapaNome.trim() || !novaEtapaVagaId) return;
    try {
      setSalvandoEtapa(true);
      setEtapaErro('');
      await recrutamentoService.criarEtapa(novaEtapaVagaId, novaEtapaNome.trim());
      setShowNovaEtapa(false);
      toast.success('Etapa criada com sucesso.');
    } catch (err) {
      setEtapaErro(mensagemDeErro(err, 'Erro ao criar etapa.'));
    } finally {
      setSalvandoEtapa(false);
    }
  };

  return {
    showNovaEtapa,
    novaEtapaNome,
    setNovaEtapaNome,
    novaEtapaVagaId,
    setNovaEtapaVagaId,
    etapaErro,
    salvandoEtapa,
    abrirNovaEtapa,
    fecharNovaEtapa,
    handleNovaEtapa,
  };
}
