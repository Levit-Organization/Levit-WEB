import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEnvioDeArquivos } from './useEnvioDeArquivos';
import { arquivoService } from '../../services/arquivoService';

vi.mock('../../services/arquivoService', () => ({ arquivoService: { upload: vi.fn() } }));

const arquivo = (name, size = 1000) => Object.defineProperty(new File(['x'], name), 'size', { value: size });

describe('useEnvioDeArquivos', () => {
  beforeEach(() => {
    vi.mocked(arquivoService.upload).mockReset();
  });

  it('envia um de cada vez e avisa cada arquivo enviado', async () => {
    const ordem = [];
    vi.mocked(arquivoService.upload).mockImplementation(async (_modulo, file) => {
      ordem.push(file.name);
      return { id: `r-${file.name}`, arquivo_nome: file.name };
    });
    const onEnviado = vi.fn();
    const { result } = renderHook(() => useEnvioDeArquivos('mod-1', { onEnviado }));

    act(() => result.current.adicionar([arquivo('a.pdf'), arquivo('b.png')]));

    await waitFor(() => expect(onEnviado).toHaveBeenCalledTimes(2));
    expect(ordem).toEqual(['a.pdf', 'b.png']);
    expect(result.current.itens.map((i) => i.status)).toEqual(['enviado', 'enviado']);
    expect(result.current.pendentes).toBe(0);
  });

  it('recusa na hora o que o servidor recusaria, sem enviar', async () => {
    const { result } = renderHook(() => useEnvioDeArquivos('mod-1'));

    act(() => result.current.adicionar([arquivo('virus.exe'), arquivo('enorme.pdf', 20 * 1024 * 1024)]));

    expect(result.current.itens.map((i) => i.status)).toEqual(['recusado', 'recusado']);
    expect(arquivoService.upload).not.toHaveBeenCalled();
  });

  it('mostra o motivo da falha e permite tentar de novo', async () => {
    vi.mocked(arquivoService.upload)
      .mockRejectedValueOnce({ response: { data: { message: 'O arquivo passa de 10 MB.' } } })
      .mockResolvedValueOnce({ id: 'r-1' });
    const { result } = renderHook(() => useEnvioDeArquivos('mod-1'));

    act(() => result.current.adicionar([arquivo('nota.pdf')]));
    await waitFor(() => expect(result.current.itens[0].status).toBe('erro'));
    expect(result.current.itens[0].erro).toBe('O arquivo passa de 10 MB.');

    act(() => result.current.tentarDeNovo(result.current.itens[0].id));
    await waitFor(() => expect(result.current.itens[0].status).toBe('enviado'));
    expect(arquivoService.upload).toHaveBeenCalledTimes(2);
  });
});
