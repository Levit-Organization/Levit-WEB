import { useCallback, useEffect, useRef, useState } from 'react';
import { arquivoService } from '../../services/arquivoService';
import { mensagemDeErro } from '../../lib/queryClient';
import { problemaDoArquivo } from '../../utils/arquivos';

const TEMPO_PARA_SUMIR = 3500; // ms que um envio concluído fica visível

let sequencia = 0;

/**
 * Fila de envio: um arquivo por vez (um envio de 10 MB não disputa banda com
 * outros), com progresso, cancelamento e "tentar de novo". Arquivos recusados
 * pela validação local nem entram na fila: aparecem já com o motivo.
 *
 * Estados de um item: aguardando → enviando → enviado | erro; ou recusado.
 */
export function useEnvioDeArquivos(moduloId, { onEnviado } = {}) {
  const [itens, setItens] = useState([]);
  const filaRef = useRef([]);
  const arquivosRef = useRef(new Map());
  const ativoRef = useRef(null);
  const rodandoRef = useRef(false);
  const onEnviadoRef = useRef(onEnviado);

  useEffect(() => {
    onEnviadoRef.current = onEnviado;
  });

  const atualizar = useCallback((id, patch) => {
    setItens((lista) => lista.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const remover = useCallback((id) => {
    arquivosRef.current.delete(id);
    filaRef.current = filaRef.current.filter((x) => x !== id);
    setItens((lista) => lista.filter((item) => item.id !== id));
  }, []);

  /** Esvazia a fila, um arquivo de cada vez. Chamar com a fila já andando não faz nada. */
  const processar = useCallback(async () => {
    if (rodandoRef.current) return;
    rodandoRef.current = true;

    let id;
    while ((id = filaRef.current.shift())) {
      const controle = new AbortController();
      ativoRef.current = { id, controle };
      atualizar(id, { status: 'enviando', progresso: 0, erro: null });

      try {
        const atual = id;
        const enviado = await arquivoService.upload(moduloId, arquivosRef.current.get(atual), {
          signal: controle.signal,
          onProgress: (progresso) => atualizar(atual, { progresso }),
        });
        arquivosRef.current.delete(atual);
        atualizar(atual, { status: 'enviado', progresso: 100 });
        onEnviadoRef.current?.(enviado);
        setTimeout(() => setItens((lista) => lista.filter((item) => item.id !== atual || item.status !== 'enviado')), TEMPO_PARA_SUMIR);
      } catch (erro) {
        if (controle.signal.aborted) remover(id);
        else atualizar(id, { status: 'erro', erro: mensagemDeErro(erro, 'Não foi possível enviar. Verifique a conexão.') });
      }
      ativoRef.current = null;
    }

    rodandoRef.current = false;
  }, [moduloId, atualizar, remover]);

  const adicionar = useCallback(
    (arquivos) => {
      const novos = Array.from(arquivos || []).map((arquivo) => {
        const id = `envio-${++sequencia}`;
        const problema = problemaDoArquivo(arquivo);
        if (!problema) {
          arquivosRef.current.set(id, arquivo);
          filaRef.current.push(id);
        }
        return {
          id,
          nome: arquivo.name,
          tamanho: arquivo.size,
          status: problema ? 'recusado' : 'aguardando',
          progresso: 0,
          erro: problema,
        };
      });
      if (novos.length === 0) return;
      setItens((lista) => [...lista, ...novos]);
      processar();
    },
    [processar]
  );

  const tentarDeNovo = useCallback(
    (id) => {
      if (!arquivosRef.current.has(id)) return;
      filaRef.current.push(id);
      atualizar(id, { status: 'aguardando', progresso: 0, erro: null });
      processar();
    },
    [atualizar, processar]
  );

  /** Cancela o envio em andamento ou tira da fila; em item concluído/recusado, só dispensa. */
  const cancelar = useCallback(
    (id) => {
      if (ativoRef.current?.id === id) ativoRef.current.controle.abort();
      else remover(id);
    },
    [remover]
  );

  // Saiu da tela no meio de um envio: cancela em vez de deixar a requisição solta.
  useEffect(
    () => () => {
      filaRef.current = [];
      ativoRef.current?.controle.abort();
    },
    []
  );

  const pendentes = itens.filter((item) => item.status === 'aguardando' || item.status === 'enviando').length;

  // Fechar a aba com envio pendente perde o arquivo: o navegador pergunta antes.
  useEffect(() => {
    if (!pendentes) return undefined;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendentes]);

  const limparConcluidos = useCallback(() => {
    setItens((lista) => {
      lista.filter((item) => item.status === 'recusado' || item.status === 'erro').forEach((item) => arquivosRef.current.delete(item.id));
      return lista.filter((item) => item.status === 'aguardando' || item.status === 'enviando');
    });
  }, []);

  return { itens, pendentes, adicionar, tentarDeNovo, cancelar, limparConcluidos };
}
