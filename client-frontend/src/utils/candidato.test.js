import { describe, expect, it } from 'vitest';
import { CANDIDATO_VAZIO, validarCandidato } from './candidato';

const valido = { ...CANDIDATO_VAZIO, nome: 'Ana Souza', email: 'ana@exemplo.com' };
const arquivo = (name, size = 1000) => ({ name, size });

describe('validarCandidato', () => {
  it('aceita nome e e-mail, sem currículo', () => {
    expect(validarCandidato(valido, null)).toEqual({});
  });

  it('exige nome completo e e-mail válido', () => {
    const erros = validarCandidato({ ...valido, nome: 'An', email: 'ana@' }, null);
    expect(erros.nome).toBeTruthy();
    expect(erros.email).toBeTruthy();
  });

  it('aceita currículo em PDF ou Word', () => {
    expect(validarCandidato(valido, arquivo('cv.pdf'))).toEqual({});
    expect(validarCandidato(valido, arquivo('CV Final.DOCX'))).toEqual({});
  });

  it('recusa outro formato e arquivo acima de 5 MB', () => {
    expect(validarCandidato(valido, arquivo('foto.png')).curriculo).toMatch(/PDF ou Word/);
    expect(validarCandidato(valido, arquivo('cv.pdf', 6 * 1024 * 1024)).curriculo).toMatch(/5 MB/);
  });
});
