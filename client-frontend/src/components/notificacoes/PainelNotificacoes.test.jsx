import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../../context/FeedbackProvider';
import PainelNotificacoes from './PainelNotificacoes';
import { notificacaoService } from '../../services/notificacaoService';
import { notificacaoKeys } from '../../hooks/useNotificacoes';

vi.mock('../../services/notificacaoService', () => ({
  notificacaoService: { listar: vi.fn(), marcarLida: vi.fn(), marcarTodasLidas: vi.fn(), excluir: vi.fn(), contagem: vi.fn() },
}));

const hoje = new Date();
const pad = (n) => String(n).padStart(2, '0');
const agoraTexto = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())} ${pad(hoje.getHours())}:${pad(hoje.getMinutes())}:00`;

const candidatura = {
  id: 'n1',
  tipo: 'candidatura',
  titulo: '3 novas candidaturas em Dev Front',
  mensagem: 'Ana se candidatou.',
  link: '/recrutamento',
  lida_em: null,
  criado_em: agoraTexto,
};
const lida = { id: 'n2', tipo: 'convite_aceito', titulo: 'Beto entrou na equipe', link: '/team', lida_em: agoraTexto, criado_em: agoraTexto };

function renderizar(client) {
  return render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<PainelNotificacoes open onClose={vi.fn()} naoLidas={1} />} />
            <Route path="/recrutamento" element={<p>Página de recrutamento</p>} />
          </Routes>
        </MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

describe('PainelNotificacoes', () => {
  let client;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(notificacaoKeys.contagem, 1);
    notificacaoService.listar.mockResolvedValue({ notificacoes: [candidatura, lida], proximo: null, nao_lidas: 1 });
    notificacaoService.marcarLida.mockResolvedValue();
    notificacaoService.marcarTodasLidas.mockResolvedValue();
    notificacaoService.excluir.mockResolvedValue();
  });

  it('agrupa por dia e destaca as não lidas', async () => {
    renderizar(client);
    expect(await screen.findByText('3 novas candidaturas em Dev Front')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getAllByText('(não lida)')).toHaveLength(1);
  });

  it('clicar marca como lida (otimista), reduz o contador e navega para o link', async () => {
    renderizar(client);
    await userEvent.click(await screen.findByText('3 novas candidaturas em Dev Front'));

    expect(notificacaoService.marcarLida).toHaveBeenCalledWith('n1');
    expect(client.getQueryData(notificacaoKeys.contagem)).toBe(0);
    expect(await screen.findByText('Página de recrutamento')).toBeInTheDocument();
  });

  it('marcar todas como lidas zera o contador', async () => {
    renderizar(client);
    await screen.findByText('Beto entrou na equipe');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));

    expect(notificacaoService.marcarTodasLidas).toHaveBeenCalled();
    expect(client.getQueryData(notificacaoKeys.contagem)).toBe(0);
    expect(screen.queryByText('(não lida)')).not.toBeInTheDocument();
  });

  it('excluir remove da lista', async () => {
    renderizar(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir notificação: Beto entrou na equipe' }));

    expect(notificacaoService.excluir).toHaveBeenCalledWith('n2');
    await waitFor(() => expect(screen.queryByText('Beto entrou na equipe')).not.toBeInTheDocument());
  });

  it('filtro "Não lidas" pede só as não lidas', async () => {
    renderizar(client);
    await screen.findByText('Beto entrou na equipe');
    await userEvent.click(screen.getByRole('button', { name: 'Não lidas' }));

    await waitFor(() =>
      expect(notificacaoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ naoLidas: true }))
    );
  });

  it('falha ao marcar como lida refaz as consultas e avisa', async () => {
    notificacaoService.marcarLida.mockRejectedValue({ response: { data: { message: 'Sem conexão.' } } });
    renderizar(client);
    await userEvent.click(await screen.findByText('3 novas candidaturas em Dev Front'));
    expect(await screen.findByText('Sem conexão.')).toBeInTheDocument();
  });
});
