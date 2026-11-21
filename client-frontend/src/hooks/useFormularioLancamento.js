import { useState } from 'react';
import { financeiroService } from '../services/financeiroService';
import { useToast } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { formularioVazio, lancamentoParaApi, validarLancamento } from '../utils/financeiro';

/** Painel de novo lançamento: estado do formulário, validação e salvar. */
export function useFormularioLancamento(moduloId) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState({});
  const [form, setForm] = useState(formularioVazio);
  const [formInicial, setFormInicial] = useState(formularioVazio);
  const sujo = JSON.stringify(form) !== JSON.stringify(formInicial);

  const alterar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const abrir = () => {
    const vazio = formularioVazio();
    setForm(vazio);
    setFormInicial(vazio);
    setErro('');
    setErros({});
    setAberto(true);
  };

  const fechar = () => setAberto(false);

  const salvar = async (e) => {
    e?.preventDefault();

    const novosErros = validarLancamento(form);
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setSalvando(true);
    setErro('');

    try {
      await financeiroService.criarLancamento(moduloId, lancamentoParaApi(form));
      setAberto(false);
      toast.success('Lançamento salvo.');
      // A lista (e o saldo acumulado vindo da API) é revalidada pela invalidação global.
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao salvar lançamento.'));
    } finally {
      setSalvando(false);
    }
  };

  return { aberto, salvando, erro, erros, form, sujo, alterar, abrir, fechar, salvar };
}
