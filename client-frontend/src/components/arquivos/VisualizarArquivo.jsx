import { useEffect, useState } from 'react';
import { Button, ErrorState, Modal, Skeleton } from '../ui';
import { arquivoService } from '../../services/arquivoService';
import { mensagemDeErro } from '../../lib/queryClient';
import { tamanhoLegivel, tipoParaVisualizar } from '../../utils/arquivos';

const LIMITE_TEXTO = 200_000; // caracteres mostrados de um .txt/.csv

/**
 * Mostra o arquivo sem sair do app: imagem, PDF ou texto. Com mais de um
 * arquivo visualizável na lista, as setas (e ← →) passam para o vizinho.
 */
export default function VisualizarArquivo({ moduloId, arquivos, indice, onMudar, onFechar }) {
  const atual = arquivos[indice] ?? null;
  // Ao fechar, o conteúdo continua na tela durante a animação de saída.
  const [ultimo, setUltimo] = useState(atual);
  if (atual && atual !== ultimo) setUltimo(atual);
  const arquivo = atual ?? ultimo;
  const total = arquivos.length;
  const temVizinhos = total > 1;

  const ir = (passo) => onMudar((indice + passo + total) % total);

  // ← → em qualquer ponto do diálogo (o foco costuma ficar no próprio painel).
  useEffect(() => {
    if (!atual || !temVizinhos) return undefined;
    const aoTeclar = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') onMudar((indice + 1) % total);
      if (e.key === 'ArrowLeft') onMudar((indice - 1 + total) % total);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [atual, temVizinhos, indice, total, onMudar]);

  return (
    <Modal
      open={!!atual}
      onClose={onFechar}
      title={arquivo?.arquivo_nome}
      subtitle={
        arquivo &&
        [tamanhoLegivel(arquivo.arquivo_tamanho), temVizinhos && `${indice + 1} de ${total}`].filter(Boolean).join(' · ')
      }
      maxWidth="3xl"
      footer={
        arquivo && (
          <>
            {temVizinhos && (
              <div className="mr-auto flex gap-1">
                <Button variant="ghost" size="icon-sm" icon="chevron_left" onClick={() => ir(-1)} aria-label="Arquivo anterior" title="Anterior (←)" />
                <Button variant="ghost" size="icon-sm" icon="chevron_right" onClick={() => ir(1)} aria-label="Próximo arquivo" title="Próximo (→)" />
              </div>
            )}
            <Button variant="secondary" onClick={onFechar}>Fechar</Button>
            <BotaoBaixar moduloId={moduloId} arquivo={arquivo} />
          </>
        )
      }
    >
      {arquivo && (
        // key: trocar de arquivo recomeça o carregamento do zero.
        <Conteudo key={arquivo.id} moduloId={moduloId} arquivo={arquivo} />
      )}
    </Modal>
  );
}

function BotaoBaixar({ moduloId, arquivo }) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState(null);

  const baixar = async () => {
    setBaixando(true);
    setErro(null);
    try {
      await arquivoService.downloadFile(moduloId, arquivo.id, arquivo.arquivo_nome);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível baixar o arquivo.'));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <Button icon="download" loading={baixando} onClick={baixar} title={erro || undefined}>
      {erro ? 'Tentar de novo' : 'Baixar'}
    </Button>
  );
}

function Conteudo({ moduloId, arquivo }) {
  const tipo = tipoParaVisualizar(arquivo.arquivo_nome);
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState({ status: 'carregando' });

  useEffect(() => {
    const controle = new AbortController();
    let url = null;

    arquivoService
      .obter(moduloId, arquivo.id, { tipo, signal: controle.signal })
      .then(async (blob) => {
        if (tipo === 'text/plain') {
          const texto = await blob.text();
          if (!controle.signal.aborted) setEstado({ status: 'pronto', texto, blob });
          return;
        }
        url = URL.createObjectURL(blob);
        if (!controle.signal.aborted) setEstado({ status: 'pronto', url, blob });
      })
      .catch((erro) => {
        if (!controle.signal.aborted) setEstado({ status: 'erro', mensagem: mensagemDeErro(erro, 'Não foi possível abrir o arquivo.') });
      });

    return () => {
      controle.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [moduloId, arquivo.id, tipo, tentativa]);

  if (estado.status === 'carregando') {
    return <Skeleton className="h-[60vh] w-full rounded-lg" />;
  }

  if (estado.status === 'erro') {
    return (
      <div className="py-12">
        <ErrorState
          description={estado.mensagem}
          onRetry={() => {
            setEstado({ status: 'carregando' });
            setTentativa((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (tipo === 'text/plain') {
    const cortado = estado.texto.length > LIMITE_TEXTO;
    return (
      <div>
        <pre className="max-h-[65vh] overflow-auto rounded-lg bg-background p-4 text-xs leading-relaxed text-ink-soft whitespace-pre-wrap break-words tabular">
          {cortado ? estado.texto.slice(0, LIMITE_TEXTO) : estado.texto}
        </pre>
        {cortado && (
          <p className="mt-3 text-xs text-light-text">Mostrando só o começo. Baixe o arquivo para ver tudo.</p>
        )}
      </div>
    );
  }

  if (tipo === 'application/pdf') {
    return (
      <iframe
        src={estado.url}
        title={`Visualização de ${arquivo.arquivo_nome}`}
        className="w-full h-[70vh] rounded-lg border border-divider bg-background"
      />
    );
  }

  return (
    <div className="flex items-center justify-center rounded-lg bg-background min-h-[40vh]">
      <img src={estado.url} alt={arquivo.arquivo_nome} className="max-h-[70vh] max-w-full object-contain" />
    </div>
  );
}

