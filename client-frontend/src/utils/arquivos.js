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
