import { useState } from 'react';
import { useToast } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { relatorioService } from '../services/relatorioService';
import { alternarNaLista, problemaDoRelatorio, relatorioParaApi } from '../utils/relatoriosAgendados';

/** Formulário de criar/editar relatório agendado: estado, validação e salvar. */
export function useFormularioRelatorio(inicial, onFechar) {
  const toast = useToast();
  const [form, setForm] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const editando = !!inicial.id;
  const sujo = JSON.stringify(form) !== JSON.stringify(inicial);
  const mudar = (parcial) => setForm((f) => ({ ...f, ...parcial }));

  const alternarPessoa = (id) => mudar({ destinatarios: alternarNaLista(form.destinatarios, id) });

  const salvar = async (e) => {
    e?.preventDefault();
    const problema = problemaDoRelatorio(form);
    if (problema) return setErro(problema);
    setSalvando(true);
    setErro('');
    try {
      const corpo = relatorioParaApi(form);
      if (editando) await relatorioService.atualizar(inicial.id, corpo);
      else await relatorioService.criar(corpo);
      toast.success(editando ? 'Relatório atualizado.' : 'Relatório agendado.');
      onFechar();
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  };

  return { form, erro, salvando, editando, sujo, mudar, alternarPessoa, salvar };
}
