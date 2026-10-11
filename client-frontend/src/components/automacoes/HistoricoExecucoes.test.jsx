import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../../context/FeedbackProvider';
import HistoricoExecucoes from './HistoricoExecucoes';
import { automacaoService } from '../../services/automacaoService';

vi.mock('../../services/automacaoService', () => ({
  automacaoService: { execucoes: vi.fn(), reexecutar: vi.fn() },
}));

const automacao = { id: 'a1', modulo_id: 'm1', nome: 'Avisar RH' };

const sucesso = {
  id: 'e1',
  status: 'sucesso',
  gatilho: 'criacao',
  tentativa: 1,
  duracao_ms: 420,
  executado_em: '2026-10-10 10:00:00',
  passos: [{ indice: 0, tipo: 'enviar_email', status: 'sucesso', mensagem: 'E-mail enviado para rh@x.com.' }],
};

const erro = {
  id: 'e2',
  status: 'erro',
  gatilho: 'exclusao',
  tentativa: 3,
  duracao_ms: 5000,
  executado_em: '2026-10-10 09:00:00',
  detalhes: 'O webhook respondeu 500.',
  passos: [{ indice: 0, tipo: 'webhook', status: 'erro', mensagem: 'O webhook respondeu 500.' }],
};

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <HistoricoExecucoes automacao={automacao} onClose={() => {}} />
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

describe('HistoricoExecucoes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista execuções com status, gatilho e tentativa; erros já vêm abertos', async () => {
    automacaoService.execucoes.mockResolvedValue({ execucoes: [sucesso, erro], proximo: null });
    renderizar();

    expect(await screen.findByText('Sucesso')).toBeInTheDocument();
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByText(/3ª tentativa/)).toBeInTheDocument();
    // O passo com erro aparece sem precisar expandir; o de sucesso fica recolhido.
    expect(screen.getByText('Ação 1: Avisar outro sistema')).toBeInTheDocument();
    expect(screen.queryByText('E-mail enviado para rh@x.com.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('reexecuta uma execução com erro', async () => {
    automacaoService.execucoes.mockResolvedValue({ execucoes: [erro], proximo: null });
    automacaoService.reexecutar.mockResolvedValue(null);
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Reexecutar' }));
    expect(automacaoService.reexecutar).toHaveBeenCalledWith('m1', 'a1', 'e2');
    expect(await screen.findByText(/Reexecução colocada na fila/)).toBeInTheDocument();
  });

  it('carrega a próxima página pelo cursor', async () => {
    automacaoService.execucoes
      .mockResolvedValueOnce({ execucoes: [sucesso], proximo: '2026-10-10 10:00:00' })
      .mockResolvedValueOnce({ execucoes: [erro], proximo: null });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Falhou')).toBeInTheDocument();
    expect(automacaoService.execucoes).toHaveBeenLastCalledWith('m1', 'a1', expect.objectContaining({ antesDe: '2026-10-10 10:00:00' }));
  });

  it('estado vazio explica o que vai aparecer', async () => {
    automacaoService.execucoes.mockResolvedValue({ execucoes: [], proximo: null });
    renderizar();
    expect(await screen.findByText('Nenhuma execução ainda')).toBeInTheDocument();
  });
});
