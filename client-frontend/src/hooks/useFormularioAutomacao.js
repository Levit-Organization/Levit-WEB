import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { automacaoService } from '../services/automacaoService';
import {
  OPERADORES_DE_MUDANCA,
  ehVaga,
  gatilhosDoModulo,
  gatilhoDeMudanca,
  acoesDoModulo,
  montarDefinicao,
  acaoValida,
  regraValida,
  novaRegra,
  novaAcao,
  condicoesDaAutomacao,
  regraDoFormulario,
  acaoDoFormulario,
} from '../utils/automacaoConstants';
import { useModulos, useModulo, automacoesQuery } from './queries';
import { useToast } from './useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { useAcoesDaAutomacao } from './useAcoesDaAutomacao';

const SEM_DADOS = [];

/**
 * Criar/editar uma automação: tabela de origem, gatilhos ("Quando"), condições
 * ("Se"), ações ("Então"), validação e o salvar. Na edição, carrega a automação.
 */
export function useFormularioAutomacao(moduloIdParam, id) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [moduloId, setModuloId] = useState(moduloIdParam || '');
  // Lista e detalhe do módulo vêm do cache compartilhado (sem refetch a cada visita).
  const modulos = useModulos().data ?? SEM_DADOS;
  const moduloSelecionado = useModulo(moduloId || undefined).data ?? null;
  const [ativarAoSalvar, setAtivarAoSalvar] = useState(true);

  const [gatilhos, setGatilhos] = useState(['criacao']);

  // Alterna um gatilho; sempre sobra pelo menos um selecionado.
  const alternarGatilho = (valor) =>
    setGatilhos((atual) => {
      if (!atual.includes(valor)) return [...atual, valor];
      return atual.length > 1 ? atual.filter((g) => g !== valor) : atual;
    });

  const [temCondicao, setTemCondicao] = useState(false);
  const [logica, setLogica] = useState('e');
  const [regras, setRegras] = useState([novaRegra()]);
  const usaMudanca = temCondicao && regras.some((r) => OPERADORES_DE_MUDANCA.includes(r.operador));

  const acoesDaAutomacao = useAcoesDaAutomacao();
  const { acoes, setAcoes } = acoesDaAutomacao;

  // O tipo vem da lista (já carregada) para não esperar o detalhe do módulo.
  const moduloDaLista = modulos.find((m) => String(m.id) === String(moduloId)) ?? moduloSelecionado;
  const vaga = ehVaga(moduloDaLista);
  const gatilhosDisponiveis = gatilhosDoModulo(moduloDaLista);
  const acoesDisponiveis = acoesDoModulo(moduloDaLista);

  // Condições de mudança precisam do valor anterior: garante o gatilho que o fornece.
  const garantirGatilhoDeMudanca = () => {
    const necessario = gatilhoDeMudanca(moduloDaLista);
    setGatilhos((atual) => (atual.includes(necessario) ? atual : [...atual, necessario]));
  };

  /**
   * Trocar de módulo muda o que faz sentido: gatilhos (registro x candidato),
   * campos das condições e algumas ações. Reinicia o que depende do módulo.
   */
  const trocarModulo = (novoId) => {
    const novo = modulos.find((m) => String(m.id) === String(novoId));
    setModuloId(novoId);
    setGatilhos([gatilhosDoModulo(novo)[0]]);
    setTemCondicao(false);
    setRegras([novaRegra()]);
    setAcoes((atual) =>
      atual.map((a) =>
        acoesDoModulo(novo).includes(a.tipo) && a.tipo !== 'atualizar_campo' ? a : novaAcao()
      )
    );
  };

  const [loading, setLoading] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(isEditing);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing || !moduloIdParam) return;
    automacaoService
      .listar(moduloIdParam)
      .then((lista) => {
        const automacao = (lista || []).find((a) => String(a.id) === String(id));
        if (!automacao) {
          setError('Automação não encontrada.');
          return;
        }
        setNome(automacao.nome || '');
        setModuloId(moduloIdParam);
        setGatilhos(automacao.gatilhos?.length ? automacao.gatilhos : [automacao.gatilho || 'criacao']);
        setAtivarAoSalvar(!!automacao.ativo);

        const condicoes = condicoesDaAutomacao(automacao);
        if (condicoes) {
          setTemCondicao(true);
          setLogica(condicoes.logica || 'e');
          setRegras(condicoes.regras.map(regraDoFormulario));
        }

        if (automacao.acoes?.length) {
          setAcoes(automacao.acoes.map(acaoDoFormulario));
        }
      })
      .catch(() => setError('Erro ao carregar a automação.'))
      .finally(() => setCarregandoInicial(false));
  }, [isEditing, moduloIdParam, id, setAcoes]);

  // Mesmas validações do salvar, menos o nome: dá para testar antes de nomear.
  const definicaoValida =
    !!moduloId &&
    acoes.every(acaoValida) &&
    acoes.every((a) => acoesDisponiveis.includes(a.tipo)) &&
    gatilhos.every((g) => gatilhosDisponiveis.includes(g)) &&
    (!temCondicao || regras.every(regraValida));
  const podeSalvar = !loading && nome.trim().length >= 2 && definicaoValida;

  const definicao = useMemo(
    () => montarDefinicao({ nome, gatilhos, temCondicao, logica, regras, acoes }),
    [nome, gatilhos, temCondicao, logica, regras, acoes]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!podeSalvar) return;

    setLoading(true);
    setError('');

    const payload = { ...definicao, ativo: ativarAoSalvar };

    try {
      // Editar atualiza no lugar: mantém o id e o histórico de execuções.
      if (isEditing) {
        await automacaoService.atualizar(moduloIdParam, id, payload);
      } else {
        await automacaoService.criar(moduloId, payload);
      }

      // Atualiza a lista antes de navegar: quem chega em /automacoes já vê o resultado.
      await queryClient.fetchQuery({ ...automacoesQuery, staleTime: 0 }).catch(() => undefined);
      toast.success(isEditing ? 'Automação atualizada.' : 'Automação criada.');
      navigate('/automacoes');
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).join(' | '));
      } else {
        setError(mensagemDeErro(err, 'Erro ao salvar a automação.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    isEditing,
    nome,
    setNome,
    moduloId,
    modulos,
    moduloSelecionado,
    trocarModulo,
    vaga,
    ativarAoSalvar,
    setAtivarAoSalvar,
    gatilhos,
    gatilhosDisponiveis,
    alternarGatilho,
    temCondicao,
    setTemCondicao,
    logica,
    setLogica,
    regras,
    setRegras,
    usaMudanca,
    garantirGatilhoDeMudanca,
    acoesDaAutomacao,
    acoesDisponiveis,
    loading,
    carregandoInicial,
    error,
    definicao,
    definicaoValida,
    podeSalvar,
    handleSubmit,
  };
}
