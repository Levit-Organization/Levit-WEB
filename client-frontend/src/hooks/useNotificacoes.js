import { useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificacaoService } from '../services/notificacaoService';
import { useToast } from './useFeedback';
import { useAuth } from './useAuth';
import { definirNaoLidasNoTitulo } from '../utils/tituloDocumento';

export const notificacaoKeys = {
  todas: ['notificacoes'],
  contagem: ['notificacoes', 'contagem'],
  lista: (filtro) => ['notificacoes', 'lista', filtro],
};

const INTERVALO_CONTAGEM_MS = 30_000;

// Fora do componente de propósito: o Layout remonta a cada troca de página e o
// aviso de "novas notificações" não pode se repetir por isso. Guarda o usuário
// para que trocar de conta não pareça "notificação nova".
let ultimaContagemVista = null;
let usuarioDaContagem = null;

/**
 * Contador de não lidas: consulta leve a cada 30 s (só com a aba visível) e ao
 * voltar para a aba. Atualiza o título da aba e avisa quando chegam novas.
 * Deve ser usado uma única vez (no Layout).
 */
export function useNaoLidas() {
  const toast = useToast();
  const usuarioId = useAuth().usuario?.id ?? null;
  const query = useQuery({
    queryKey: notificacaoKeys.contagem,
    queryFn: ({ signal }) => notificacaoService.contagem(signal),
    refetchInterval: INTERVALO_CONTAGEM_MS,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const naoLidas = query.data ?? 0;

  useEffect(() => {
    if (query.data === undefined) return;
    definirNaoLidasNoTitulo(query.data);
    if (usuarioDaContagem !== usuarioId) {
      usuarioDaContagem = usuarioId;
      ultimaContagemVista = null;
    }
    if (ultimaContagemVista !== null && query.data > ultimaContagemVista) {
      const novas = query.data - ultimaContagemVista;
      toast.info(novas === 1 ? 'Você tem uma nova notificação.' : `Você tem ${novas} novas notificações.`);
    }
    ultimaContagemVista = query.data;
  }, [query.data, toast, usuarioId]);

  // Ao sair (logout desmonta o Layout de vez), o título volta ao normal.
  useEffect(() => () => definirNaoLidasNoTitulo(0), []);

  return naoLidas;
}

/** Lista paginada por cursor; só busca com o painel aberto. */
export function useListaNotificacoes(filtro, { aberto }) {
  return useInfiniteQuery({
    queryKey: notificacaoKeys.lista(filtro),
    queryFn: ({ pageParam, signal }) =>
      notificacaoService.listar({ antesDe: pageParam, naoLidas: filtro === 'nao_lidas', signal }),
    initialPageParam: undefined,
    getNextPageParam: (ultima) => ultima?.proximo ?? undefined,
    enabled: aberto,
    staleTime: 0,
  });
}

/**
 * Ações com atualização otimista do cache (lista + contador). Em caso de
 * erro, refaz as consultas para voltar ao estado real.
 */
export function useAcoesNotificacoes() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const editarListas = (transformar) =>
    queryClient.setQueriesData({ queryKey: ['notificacoes', 'lista'] }, (atual) =>
      atual ? { ...atual, pages: atual.pages.map((p) => ({ ...p, notificacoes: transformar(p.notificacoes || []) })) } : atual
    );

  const ajustarContagem = (delta) =>
    queryClient.setQueryData(notificacaoKeys.contagem, (atual) => {
      const novo = Math.max(0, (atual ?? 0) + delta);
      ultimaContagemVista = novo; // diminuir não é "nova notificação"
      return novo;
    });

  const desfazer = (error, mensagem) => {
    queryClient.invalidateQueries({ queryKey: notificacaoKeys.todas });
    toast.error(error?.response?.data?.message || mensagem);
  };

  const agora = () => new Date().toISOString();

  return {
    marcarLida: async (notificacao) => {
      if (notificacao.lida_em) return;
      editarListas((lista) => lista.map((n) => (n.id === notificacao.id ? { ...n, lida_em: agora() } : n)));
      ajustarContagem(-1);
      try {
        await notificacaoService.marcarLida(notificacao.id);
      } catch (error) {
        desfazer(error, 'Não foi possível marcar como lida.');
      }
    },

    marcarTodasLidas: async () => {
      const anterior = queryClient.getQueryData(notificacaoKeys.contagem) ?? 0;
      editarListas((lista) => lista.map((n) => (n.lida_em ? n : { ...n, lida_em: agora() })));
      ajustarContagem(-anterior);
      try {
        await notificacaoService.marcarTodasLidas();
      } catch (error) {
        desfazer(error, 'Não foi possível marcar todas como lidas.');
      }
    },

    excluir: async (notificacao) => {
      editarListas((lista) => lista.filter((n) => n.id !== notificacao.id));
      if (!notificacao.lida_em) ajustarContagem(-1);
      try {
        await notificacaoService.excluir(notificacao.id);
      } catch (error) {
        desfazer(error, 'Não foi possível excluir a notificação.');
      }
    },
  };
}
