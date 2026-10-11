import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Modal, Select } from '../ui';
import { cn } from '../ui/cn';
import { registroService } from '../../services/registroService';
import { mensagemDeErro } from '../../lib/queryClient';
import { decodificarTexto, lerCsv, mapearColunas, prepararItens } from '../../utils/importacao';

const MAX_POR_ENVIO = 1000;
const PREVIA = 5;

/** Lê .csv ou .xlsx e devolve a planilha como matriz (a primeira linha é o cabeçalho). */
async function lerArquivo(arquivo) {
  if (/\.xlsx$/i.test(arquivo.name)) {
    // Só baixa a biblioteca de Excel quando alguém importa um .xlsx.
    const { default: lerXlsx } = await import('read-excel-file');
    const resultado = await lerXlsx(arquivo);
    // Normalmente vem a matriz de linhas; se vier a lista de planilhas, usa a primeira.
    const linhas = Array.isArray(resultado?.[0]?.data) ? resultado[0].data : resultado;
    return linhas.filter((l) => l.some((c) => c !== null && String(c).trim() !== ''));
  }
  if (/\.(csv|txt)$/i.test(arquivo.name)) {
    return lerCsv(decodificarTexto(await arquivo.arrayBuffer()));
  }
  throw new Error('Use um arquivo .csv ou .xlsx.');
}

/**
 * Importar uma planilha para a tabela: escolher o arquivo, conferir como cada
 * coluna da planilha entra na tabela (com prévia das primeiras linhas) e importar.
 * Não dispara automações.
 */
export default function ImportarPlanilha({ aberto, onFechar, modulo, campos, pessoas, onImportado }) {
  const [etapa, setEtapa] = useState('arquivo'); // arquivo | conferir | resultado
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [planilha, setPlanilha] = useState(null); // { cabecalho, linhas }
  const [mapa, setMapa] = useState({});
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const preparo = useMemo(
    () => (planilha ? prepararItens(planilha.linhas, campos, mapa, pessoas) : { itens: [], problemas: [] }),
    [planilha, campos, mapa, pessoas]
  );
  const colunasUsadas = Object.values(mapa).filter((i) => i >= 0).length;

  const escolher = async (arquivo) => {
    if (!arquivo) return;
    setErro('');
    setLendo(true);
    try {
      const [cabecalho, ...linhas] = await lerArquivo(arquivo);
      if (!cabecalho || linhas.length === 0) throw new Error('A planilha precisa de um cabeçalho e pelo menos uma linha.');
      const titulos = cabecalho.map((c) => String(c ?? '').trim());
      setNomeArquivo(arquivo.name);
      setPlanilha({ cabecalho: titulos, linhas });
      setMapa(mapearColunas(titulos, campos));
      setEtapa('conferir');
    } catch (e) {
      setErro(e.message || 'Não foi possível ler o arquivo.');
    } finally {
      setLendo(false);
    }
  };

  const importar = async () => {
    setImportando(true);
    setErro('');
    try {
      let criados = 0;
      const erros = [...preparo.problemas];
      for (let i = 0; i < preparo.itens.length; i += MAX_POR_ENVIO) {
        const r = await registroService.importar(modulo.id, preparo.itens.slice(i, i + MAX_POR_ENVIO));
        criados += r.criados;
        erros.push(...(r.erros || []));
      }
      erros.sort((a, b) => a.linha - b.linha);
      setResultado({ criados, erros });
      setEtapa('resultado');
      onImportado?.();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível importar.'));
    } finally {
      setImportando(false);
    }
  };

  const rodape =
    etapa === 'arquivo' ? (
      <Button variant="secondary" onClick={onFechar}>Cancelar</Button>
    ) : etapa === 'conferir' ? (
      <>
        <Button variant="secondary" onClick={() => setEtapa('arquivo')}>Trocar arquivo</Button>
        <Button icon="upload" onClick={importar} loading={importando} disabled={preparo.itens.length === 0}>
          {importando ? 'Importando...' : `Importar ${preparo.itens.length} ${preparo.itens.length === 1 ? 'item' : 'itens'}`}
        </Button>
      </>
    ) : (
      <Button onClick={onFechar}>Concluir</Button>
    );

  return (
    <Modal open={aberto} onClose={onFechar} maxWidth="xl" title={`Importar planilha em ${modulo?.nome ?? 'tabela'}`} subtitle="Arquivos .csv ou .xlsx, com os nomes das colunas na primeira linha." footer={rodape}>
      {erro && <div className="mb-4"><Alert variant="error">{erro}</Alert></div>}

      {etapa === 'arquivo' && (
        <div className="flex flex-col gap-4">
          <label
            htmlFor="arquivo-planilha"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-divider-strong bg-background px-6 py-10 text-center cursor-pointer hover:border-primary-300"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              escolher(e.dataTransfer.files?.[0]);
            }}
          >
            <span className="material-icons text-[36px] text-primary" aria-hidden="true">upload_file</span>
            <span className="text-sm font-semibold text-ink">{lendo ? 'Lendo a planilha...' : 'Escolha ou arraste a planilha aqui'}</span>
            <span className="text-xs text-light-text">CSV (inclusive o do Excel, com ponto e vírgula) ou XLSX</span>
            <input id="arquivo-planilha" type="file" accept=".csv,.txt,.xlsx" className="sr-only" onChange={(e) => escolher(e.target.files?.[0])} />
          </label>
          <div className="text-sm text-ink-soft">
            <p className="font-medium text-ink">Como deixar a planilha pronta</p>
            <ul className="mt-1 list-disc pl-5 text-light-text flex flex-col gap-0.5">
              <li>Primeira linha com os nomes das colunas. Os nomes iguais aos desta tabela são reconhecidos sozinhos.</li>
              <li>Datas como 20/10/2026 e valores como 1.234,56.</li>
              <li>Responsável pelo nome da pessoa na equipe; listas com o mesmo texto das opções.</li>
            </ul>
          </div>
        </div>
      )}

      {etapa === 'conferir' && planilha && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{nomeArquivo}</strong> · {planilha.linhas.length} {planilha.linhas.length === 1 ? 'linha' : 'linhas'}. Confira de qual coluna da planilha vem cada coluna da tabela.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campos.map((campo) => (
              <Select
                key={campo.id}
                id={`mapa-${campo.id}`}
                label={campo.nome}
                value={String(mapa[campo.id] ?? -1)}
                onChange={(e) => setMapa((m) => ({ ...m, [campo.id]: Number(e.target.value) }))}
                options={[
                  { value: '-1', label: 'Não importar' },
                  ...planilha.cabecalho.map((titulo, i) => ({ value: String(i), label: titulo || `Coluna ${i + 1}` })),
                ]}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="success" icon="check_circle">{preparo.itens.length} prontas</Badge>
            {preparo.problemas.length > 0 && <Badge variant="danger" icon="error">{preparo.problemas.length} com problema</Badge>}
            {colunasUsadas === 0 && <Badge variant="warning">Nenhuma coluna escolhida</Badge>}
          </div>

          <div className="overflow-x-auto rounded-lg border border-divider">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background text-left text-light-text">
                  <th className="px-3 py-2 font-semibold">Linha</th>
                  {campos.filter((c) => mapa[c.id] >= 0).map((c) => <th key={c.id} className="px-3 py-2 font-semibold whitespace-nowrap">{c.nome}</th>)}
                </tr>
              </thead>
              <tbody>
                {planilha.linhas.slice(0, PREVIA).map((celulas, i) => {
                  const problema = preparo.problemas.find((p) => p.linha === i + 2);
                  return (
                    <tr key={i} className={cn('border-t border-divider', problema && 'bg-danger-bg')}>
                      <td className="px-3 py-2 text-light-text tabular">{i + 2}</td>
                      {campos.filter((c) => mapa[c.id] >= 0).map((c) => (
                        <td key={c.id} className="px-3 py-2 max-w-[180px] truncate">
                          {String(celulas[mapa[c.id]] instanceof Date ? celulas[mapa[c.id]].toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : celulas[mapa[c.id]] ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {preparo.problemas.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ink">Linhas que não vão entrar</p>
              <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-danger flex flex-col gap-0.5">
                {preparo.problemas.slice(0, 50).map((p) => <li key={p.linha}>Linha {p.linha}: {p.mensagem}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-light-text">Itens importados não disparam automações, para não mandar avisos em massa.</p>
        </div>
      )}

      {etapa === 'resultado' && resultado && (
        <div className="flex flex-col gap-3">
          <Alert variant={resultado.criados > 0 ? 'success' : 'warning'}>
            {resultado.criados > 0
              ? `${resultado.criados} ${resultado.criados === 1 ? 'item importado' : 'itens importados'} em ${modulo.nome}.`
              : 'Nenhum item foi importado.'}
          </Alert>
          {resultado.erros.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ink">{resultado.erros.length} {resultado.erros.length === 1 ? 'linha ficou' : 'linhas ficaram'} de fora</p>
              <ul className="mt-1 max-h-48 overflow-y-auto text-xs text-danger flex flex-col gap-0.5">
                {resultado.erros.slice(0, 100).map((p) => <li key={p.linha}>Linha {p.linha}: {p.mensagem}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
