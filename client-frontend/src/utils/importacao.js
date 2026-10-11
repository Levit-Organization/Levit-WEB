/**
 * Importação de planilhas para uma tabela. Tudo aqui é puro (sem rede), para
 * testar: ler o CSV, casar as colunas da planilha com as da tabela e converter
 * cada célula para o formato que a API valida.
 */
import { normalizar } from './prazos';
import { REPETICOES } from './recorrencia';

/** Texto do arquivo: UTF-8 quando válido; senão Windows-1252 (CSV salvo pelo Excel em português). */
export function decodificarTexto(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** Separador mais provável na primeira linha (o Excel brasileiro usa ponto e vírgula). */
function detectarSeparador(texto) {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const contagem = [';', ',', '\t'].map((s) => [s, primeira.split(s).length - 1]);
  contagem.sort((a, b) => b[1] - a[1]);
  return contagem[0][1] > 0 ? contagem[0][0] : ',';
}

/** CSV → matriz de células, com aspas, aspas duplicadas e quebras de linha dentro de aspas. */
export function lerCsv(texto) {
  const sep = detectarSeparador(texto);
  const linhas = [];
  let linha = [];
  let celula = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') {
        celula += '"';
        i++;
      } else if (ch === '"') {
        aspas = false;
      } else {
        celula += ch;
      }
    } else if (ch === '"') {
      aspas = true;
    } else if (ch === sep) {
      linha.push(celula);
      celula = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = '';
    } else {
      celula += ch;
    }
  }
  if (celula !== '' || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => String(c).trim() !== ''));
}

/** Para cada coluna da tabela, o índice da coluna da planilha com o mesmo nome (ou -1). */
export function mapearColunas(cabecalho, campos) {
  const nomes = cabecalho.map((c) => normalizar(c));
  return Object.fromEntries(campos.map((campo) => [campo.id, nomes.indexOf(normalizar(campo.nome))]));
}

const pad = (n) => String(n).padStart(2, '0');

function converterData(bruto) {
  if (bruto instanceof Date && !Number.isNaN(bruto.getTime())) {
    // Datas do Excel chegam como meia-noite UTC.
    return `${bruto.getUTCFullYear()}-${pad(bruto.getUTCMonth() + 1)}-${pad(bruto.getUTCDate())}`;
  }
  const t = String(bruto).trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validarData(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return validarData(ano, +m[2], +m[1]);
  }
  return null;
}

function validarData(ano, mes, dia) {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? `${ano}-${pad(mes)}-${pad(dia)}` : null;
}

function converterNumero(bruto) {
  if (typeof bruto === 'number') return Number.isFinite(bruto) ? bruto : null;
  let t = String(bruto).replace(/R\$|\s/g, '').trim();
  if (t === '') return null;
  // "1.234,56" (Brasil) ou "1,234.56" (inglês): o último separador é o decimal.
  const ultimoPonto = t.lastIndexOf('.');
  const ultimaVirgula = t.lastIndexOf(',');
  if (ultimaVirgula > ultimoPonto) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Converte uma célula para o tipo da coluna.
 * @returns {{ valor?: any, erro?: string }} valor ausente = célula vazia (não importa nada)
 */
export function converterCelula(bruto, campo, pessoas = []) {
  if (bruto === null || bruto === undefined || String(bruto).trim() === '') return {};
  const texto = bruto instanceof Date ? bruto : String(bruto).trim();

  switch (campo.tipo) {
    case 'numero': {
      const n = converterNumero(texto);
      return n === null ? { erro: `"${texto}" não é um número` } : { valor: n };
    }
    case 'data':
    case 'prazo': {
      const d = converterData(texto);
      return d ? { valor: d } : { erro: `"${texto}" não é uma data (use DD/MM/AAAA)` };
    }
    case 'selecao': {
      const opcao = (campo.opcoes || []).find((o) => normalizar(o) === normalizar(texto));
      return opcao ? { valor: opcao } : { erro: `"${texto}" não é uma opção de ${campo.nome}` };
    }
    case 'responsavel': {
      const alvo = normalizar(texto);
      const achadas = pessoas.filter((p) => normalizar(p.nome) === alvo || normalizar(p.nome.split(' ')[0]) === alvo);
      if (achadas.length === 1) return { valor: achadas[0].id };
      return { erro: achadas.length > 1 ? `"${texto}" é ambíguo na equipe` : `"${texto}" não está na equipe` };
    }
    case 'recorrencia': {
      const alvo = normalizar(texto);
      const r = REPETICOES.find((op) => op.valor === alvo || normalizar(op.rotulo) === alvo);
      return r ? { valor: r.valor } : { erro: `"${texto}" não é uma repetição válida` };
    }
    default:
      return { valor: String(texto) };
  }
}

/**
 * Converte as linhas da planilha (sem o cabeçalho) em itens prontos para a API.
 * Linhas com alguma célula inválida vão para `problemas` e não são enviadas.
 */
export function prepararItens(linhas, campos, mapa, pessoas = []) {
  const itens = [];
  const problemas = [];
  linhas.forEach((celulas, i) => {
    const linha = i + 2; // linha 1 é o cabeçalho
    const dados = {};
    const erros = [];
    campos.forEach((campo) => {
      const indice = mapa[campo.id];
      if (indice === undefined || indice < 0) return;
      const { valor, erro } = converterCelula(celulas[indice], campo, pessoas);
      if (erro) erros.push(`${campo.nome}: ${erro}`);
      else if (valor !== undefined) dados[campo.id] = valor;
    });
    if (erros.length) problemas.push({ linha, mensagem: erros.join('; ') });
    else if (Object.keys(dados).length) itens.push({ linha, dados });
  });
  return { itens, problemas };
}
