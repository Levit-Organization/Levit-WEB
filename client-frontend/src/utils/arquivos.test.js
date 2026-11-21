import { describe, expect, it } from 'vitest';
import {
  arquivosVisiveis,
  normalizar,
  ORDEM_INICIAL,
  problemaDoArquivo,
  proximaOrdemDosArquivos,
  resumoDosArquivos,
  tamanhoLegivel,
  tipoDoArquivo,
  tipoParaVisualizar,
  totalDeBytes,
  TAMANHO_MAXIMO_BYTES,
} from './arquivos';

const arquivo = (name, size = 1000) => ({ name, size });

describe('tipoDoArquivo', () => {
  it('reconhece a categoria pela extensão, sem diferenciar maiúsculas', () => {
    expect(tipoDoArquivo('Contrato.PDF').categoria).toBe('pdf');
    expect(tipoDoArquivo('foto.jpeg').categoria).toBe('imagem');
    expect(tipoDoArquivo('vendas.xlsx').categoria).toBe('planilha');
    expect(tipoDoArquivo('apresentacao.pptx').categoria).toBe('apresentacao');
  });

  it('cai em "outro" sem extensão conhecida', () => {
    expect(tipoDoArquivo('LEIAME').categoria).toBe('outro');
    expect(tipoDoArquivo(null).categoria).toBe('outro');
  });
});

describe('tamanhoLegivel', () => {
  it('usa a unidade certa', () => {
    expect(tamanhoLegivel(500)).toBe('500 B');
    expect(tamanhoLegivel(2048)).toBe('2 KB');
    expect(tamanhoLegivel(5.5 * 1024 * 1024)).toBe('5,5 MB');
  });

  it('devolve null para valor inválido', () => {
    expect(tamanhoLegivel(undefined)).toBeNull();
    expect(tamanhoLegivel('abc')).toBeNull();
  });
});

describe('problemaDoArquivo', () => {
  it('aceita tipo permitido dentro do limite', () => {
    expect(problemaDoArquivo(arquivo('nota.pdf'))).toBeNull();
  });

  it('recusa tipo não aceito', () => {
    expect(problemaDoArquivo(arquivo('script.exe'))).toMatch(/Tipo não aceito/);
    expect(problemaDoArquivo(arquivo('imagem.svg'))).toMatch(/Tipo não aceito/);
  });

  it('recusa acima de 10 MB e arquivo vazio', () => {
    expect(problemaDoArquivo(arquivo('grande.pdf', TAMANHO_MAXIMO_BYTES + 1))).toMatch(/10 MB/);
    expect(problemaDoArquivo(arquivo('vazio.txt', 0))).toMatch(/vazio/);
  });
});

describe('tipoParaVisualizar', () => {
  it('só libera tipos seguros de mostrar no app', () => {
    expect(tipoParaVisualizar('a.pdf')).toBe('application/pdf');
    expect(tipoParaVisualizar('a.PNG')).toBe('image/png');
    expect(tipoParaVisualizar('a.csv')).toBe('text/plain');
    expect(tipoParaVisualizar('a.docx')).toBeNull();
    expect(tipoParaVisualizar('a.html')).toBeNull();
  });
});

describe('normalizar', () => {
  it('ignora acentos e maiúsculas na busca', () => {
    expect(normalizar('Relatório Anual.PDF')).toContain('relatorio');
  });
});

describe('lista da tabela de arquivos', () => {
  const lista = [
    { id: 'a', arquivo_nome: 'Relatório 10.pdf', arquivo_tamanho: 300, enviado_por_nome: 'Bruno', criado_em: '2026-01-02T10:00:00' },
    { id: 'b', arquivo_nome: 'relatorio 2.pdf', arquivo_tamanho: 100, enviado_por_nome: null, criado_em: '2026-01-03T10:00:00' },
    { id: 'c', arquivo_nome: 'Ata.docx', arquivo_tamanho: null, enviado_por_nome: 'Ana', criado_em: '2026-01-01T10:00:00' },
  ];
  const ids = (busca, ordem) => arquivosVisiveis(lista, busca, ordem).map((a) => a.id);

  it('começa pelos enviados por último', () => {
    expect(ids('', ORDEM_INICIAL)).toEqual(['b', 'a', 'c']);
  });

  it('ordena por nome com números na ordem natural e por tamanho com vazio como zero', () => {
    expect(ids('', { key: 'arquivo_nome', direcao: 'asc' })).toEqual(['c', 'b', 'a']);
    expect(ids('', { key: 'arquivo_tamanho', direcao: 'desc' })).toEqual(['a', 'b', 'c']);
    expect(ids('', { key: 'enviado_por_nome', direcao: 'asc' })).toEqual(['b', 'c', 'a']);
  });

  it('busca pelo nome sem acento nem maiúsculas e não altera a lista original', () => {
    expect(ids('  RELATORIO ', ORDEM_INICIAL)).toEqual(['b', 'a']);
    expect(ids('zzz', ORDEM_INICIAL)).toEqual([]);
    expect(lista.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('clicar na mesma coluna inverte; numa nova, texto começa crescente', () => {
    expect(proximaOrdemDosArquivos(ORDEM_INICIAL, 'criado_em')).toEqual({ key: 'criado_em', direcao: 'asc' });
    expect(proximaOrdemDosArquivos(ORDEM_INICIAL, 'arquivo_nome')).toEqual({ key: 'arquivo_nome', direcao: 'asc' });
    expect(proximaOrdemDosArquivos(ORDEM_INICIAL, 'enviado_por_nome')).toEqual({ key: 'enviado_por_nome', direcao: 'asc' });
    expect(proximaOrdemDosArquivos({ key: 'arquivo_nome', direcao: 'asc' }, 'arquivo_tamanho')).toEqual({ key: 'arquivo_tamanho', direcao: 'desc' });
  });

  it('soma os tamanhos e resume no subtítulo', () => {
    expect(totalDeBytes(lista)).toBe(400);
    expect(resumoDosArquivos(lista, false)).toBe('3 arquivos · 400 B');
    expect(resumoDosArquivos([lista[0]], false)).toBe('1 arquivo · 300 B');
    expect(resumoDosArquivos([], false)).toBe('Nenhum arquivo ainda');
    expect(resumoDosArquivos(lista, true)).toBe('Carregando…');
  });
});
