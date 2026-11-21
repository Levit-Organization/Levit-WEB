/**
 * Regras e aparência dos arquivos da tabela de arquivos. A lista de tipos e o
 * limite espelham o backend (ArquivoService): validar aqui só evita mandar
 * pela rede algo que vai voltar recusado.
 */

export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

const CATEGORIAS = {
  pdf: { rotulo: 'PDF', icone: 'picture_as_pdf', cor: 'bg-danger-bg text-danger' },
  imagem: { rotulo: 'Imagem', icone: 'image', cor: 'bg-stage-2-bg text-stage-2' },
  planilha: { rotulo: 'Planilha', icone: 'table_chart', cor: 'bg-success-bg text-success' },
  documento: { rotulo: 'Documento', icone: 'description', cor: 'bg-info-bg text-info' },
  apresentacao: { rotulo: 'Apresentação', icone: 'slideshow', cor: 'bg-warning-bg text-warning' },
  texto: { rotulo: 'Texto', icone: 'article', cor: 'bg-primary-100 text-primary-700' },
  outro: { rotulo: 'Arquivo', icone: 'insert_drive_file', cor: 'bg-primary-100 text-primary-700' },
};

const CATEGORIA_POR_EXTENSAO = {
  pdf: 'pdf',
  png: 'imagem', jpg: 'imagem', jpeg: 'imagem', gif: 'imagem', webp: 'imagem',
  xls: 'planilha', xlsx: 'planilha', ods: 'planilha', csv: 'planilha',
  doc: 'documento', docx: 'documento', odt: 'documento',
  ppt: 'apresentacao', pptx: 'apresentacao', odp: 'apresentacao',
  txt: 'texto',
};

export const EXTENSOES_PERMITIDAS = Object.keys(CATEGORIA_POR_EXTENSAO);

/** Para o `accept` do input: o seletor do sistema já filtra pelos tipos aceitos. */
export const ACEITA = EXTENSOES_PERMITIDAS.map((ext) => `.${ext}`).join(',');

export function extensaoDe(nome) {
  const partes = String(nome || '').split('.');
  return partes.length > 1 ? partes.pop().toLowerCase() : '';
}

export function tipoDoArquivo(nome) {
  const extensao = extensaoDe(nome);
  const categoria = CATEGORIA_POR_EXTENSAO[extensao] || 'outro';
  return { ...CATEGORIAS[categoria], categoria, extensao };
}

export function tamanhoLegivel(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Motivo para recusar o arquivo antes do envio, ou null se está tudo certo. */
export function problemaDoArquivo(arquivo) {
  if (!EXTENSOES_PERMITIDAS.includes(extensaoDe(arquivo.name))) {
    return 'Tipo não aceito. Envie PDF, imagem, texto, planilha, documento ou apresentação.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) return 'Passa de 10 MB. Envie um arquivo menor.';
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  return null;
}

/**
 * Tipos que o navegador mostra com segurança dentro do app. O tipo do blob vem
 * daqui, pela extensão, e não do servidor: nada de HTML ou SVG sendo executado.
 */
const VISUALIZAVEIS = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  csv: 'text/plain',
};

export function tipoParaVisualizar(nome) {
  return VISUALIZAVEIS[extensaoDe(nome)] || null;
}

/** Busca sem diferenciar maiúsculas e acentos: "relatorio" acha "Relatório.pdf". */
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// --- Lista da tabela de arquivos: busca, ordem e totais -----------------------

const COLATOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** Como cada coluna da lista ordena (sempre crescente; a direção inverte o sinal). */
const COMPARADORES = {
  arquivo_nome: (a, b) => COLATOR.compare(a.arquivo_nome || '', b.arquivo_nome || ''),
  arquivo_tamanho: (a, b) => (a.arquivo_tamanho || 0) - (b.arquivo_tamanho || 0),
  enviado_por_nome: (a, b) => COLATOR.compare(a.enviado_por_nome || '', b.enviado_por_nome || ''),
  criado_em: (a, b) => new Date(a.criado_em) - new Date(b.criado_em),
};

/** Ordem inicial da lista: os enviados por último primeiro. */
export const ORDEM_INICIAL = { key: 'criado_em', direcao: 'desc' };

/** Arquivos cujo nome bate com a busca (sem acento nem maiúsculas), na ordem escolhida. */
export function arquivosVisiveis(arquivos, busca, ordem) {
  const termo = normalizar(busca.trim());
  const filtrados = termo ? arquivos.filter((a) => normalizar(a.arquivo_nome).includes(termo)) : arquivos;
  const sinal = ordem.direcao === 'asc' ? 1 : -1;
  return [...filtrados].sort((a, b) => sinal * COMPARADORES[ordem.key](a, b));
}

/** Clicar na coluna ativa inverte; numa nova, texto começa crescente e o resto decrescente. */
export function proximaOrdemDosArquivos(atual, key) {
  if (atual.key === key) return { key, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' };
  return { key, direcao: key === 'arquivo_nome' || key === 'enviado_por_nome' ? 'asc' : 'desc' };
}

export function totalDeBytes(arquivos) {
  return arquivos.reduce((soma, a) => soma + (Number(a.arquivo_tamanho) || 0), 0);
}

/** Subtítulo da tela: "3 arquivos · 2,5 MB". */
export function resumoDosArquivos(arquivos, carregando) {
  if (carregando) return 'Carregando…';
  if (arquivos.length === 0) return 'Nenhum arquivo ainda';
  return `${arquivos.length} ${arquivos.length === 1 ? 'arquivo' : 'arquivos'} · ${tamanhoLegivel(totalDeBytes(arquivos))}`;
}
