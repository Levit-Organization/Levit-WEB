import { useState } from 'react';
import { recrutamentoService } from '../../services/recrutamentoService';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { CANDIDATO_VAZIO, validarCandidato } from '../../utils/candidato';

/** Estado do painel "Novo candidato" (dados, currículo, validação e envio). */
export function useNovoCandidato({ vagaSelecionada, modoSomenteLeitura }) {
  const toast = useToast();
  const [showNovoCandidato, setShowNovoCandidato] = useState(false);
  const [salvandoCandidato, setSalvandoCandidato] = useState(false);
  const [novoCandidatoDados, setNovoCandidatoDados] = useState({ ...CANDIDATO_VAZIO, modulo_id: '' });
  const [novoCurriculo, setNovoCurriculo] = useState(null);
  const [candidatoErros, setCandidatoErros] = useState({});
  const [candidatoErro, setCandidatoErro] = useState('');

  const candidatoSujo =
    !!novoCurriculo || Object.keys(CANDIDATO_VAZIO).some((campo) => novoCandidatoDados[campo].trim() !== '');

  const abrirNovoCandidato = () => {
    setCandidatoErros({});
    setCandidatoErro('');
    setNovoCandidatoDados({ ...CANDIDATO_VAZIO, modulo_id: modoSomenteLeitura ? '' : vagaSelecionada });
    setNovoCurriculo(null);
    setShowNovoCandidato(true);
  };

  const fecharNovoCandidato = () => setShowNovoCandidato(false);

  const alterarCandidato = (campo, valor) => {
    setNovoCandidatoDados((atual) => ({ ...atual, [campo]: valor }));
    setCandidatoErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const alterarCurriculo = (arquivo) => {
    setNovoCurriculo(arquivo);
    setCandidatoErros((atual) => ({ ...atual, curriculo: undefined }));
  };

  const handleNovoCandidatoSubmit = async (e) => {
    e?.preventDefault();
    const dados = novoCandidatoDados;

    const erros = validarCandidato(dados, novoCurriculo);
    if (!dados.modulo_id) erros.modulo_id = 'Selecione a vaga.';

    setCandidatoErros(erros);
    if (Object.keys(erros).length > 0) return;

    try {
      setSalvandoCandidato(true);
      setCandidatoErro('');
      await recrutamentoService.adicionarCandidato(dados.modulo_id, dados, novoCurriculo);
      setShowNovoCandidato(false);
      toast.success('Candidato adicionado com sucesso.');
    } catch (err) {
      setCandidatoErro(mensagemDeErro(err, 'Erro ao salvar candidato.'));
    } finally {
      setSalvandoCandidato(false);
    }
  };

  return {
    showNovoCandidato,
    salvandoCandidato,
    novoCandidatoDados,
    novoCurriculo,
    candidatoErros,
    candidatoErro,
    candidatoSujo,
    abrirNovoCandidato,
    fecharNovoCandidato,
    alterarCandidato,
    alterarCurriculo,
    handleNovoCandidatoSubmit,
  };
}
