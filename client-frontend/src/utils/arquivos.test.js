import { describe, expect, it } from 'vitest';
import { normalizar, problemaDoArquivo, tamanhoLegivel, tipoDoArquivo, tipoParaVisualizar, TAMANHO_MAXIMO_BYTES } from './arquivos';

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
