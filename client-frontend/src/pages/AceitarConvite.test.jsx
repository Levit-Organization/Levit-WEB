import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import { AuthContext } from '../context/authContext';
import AceitarConvite from './AceitarConvite';
import { conviteService } from '../services/conviteService';

vi.mock('../services/conviteService', () => ({ conviteService: { detalhes: vi.fn() } }));

const TOKEN = 'a'.repeat(64);
const convite = {
  email: 'ana@empresa.com',
  empresa: 'Acme',
  cargo: 'Comercial',
  convidado_por: 'Marina Costa',
  mensagem: 'Oi, Ana! Bem-vinda.',
  expira_em: '2099-12-20 10:00:00',
  status: 'valido',
};

function renderizar(auth = {}) {
  const aceitarConvite = auth.aceitarConvite ?? vi.fn().mockResolvedValue({});
  const valor = { autenticado: false, usuario: null, logout: vi.fn(), aceitarConvite, ...auth };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FeedbackProvider>
        <AuthContext.Provider value={valor}>
          <MemoryRouter initialEntries={[`/convite/${TOKEN}`]}>
            <Routes>
              <Route path="/convite/:token" element={<AceitarConvite />} />
              <Route path="/dashboard" element={<p>Painel da equipe</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
  return { aceitarConvite };
}

describe('AceitarConvite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra quem convidou, a equipe, o cargo e a mensagem', async () => {
    conviteService.detalhes.mockResolvedValue(convite);
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Marina Costa convidou você para a equipe Acme' })).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.getByText('Oi, Ana! Bem-vinda.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ana@empresa.com')).toBeDisabled();
  });

  it('valida nome, senha e confirmação antes de enviar', async () => {
    conviteService.detalhes.mockResolvedValue(convite);
    const { aceitarConvite } = renderizar();
    await screen.findByRole('button', { name: 'Aceitar convite e entrar' });

    await userEvent.type(screen.getByLabelText(/Seu nome/), 'An');
    await userEvent.type(screen.getByLabelText(/Crie uma senha/), 'somenteletras');
    await userEvent.type(screen.getByLabelText(/Repita a senha/), 'outra');
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar convite e entrar' }));

    expect(screen.getByText(/pelo menos 3 letras/)).toBeInTheDocument();
    expect(screen.getByText('Misture letras e números.')).toBeInTheDocument();
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument();
    expect(aceitarConvite).not.toHaveBeenCalled();
  });

  it('aceita, entra na conta e vai para o painel', async () => {
    conviteService.detalhes.mockResolvedValue(convite);
    const { aceitarConvite } = renderizar();
    await screen.findByRole('button', { name: 'Aceitar convite e entrar' });

    await userEvent.type(screen.getByLabelText(/Seu nome/), 'Ana Souza');
    await userEvent.type(screen.getByLabelText(/Crie uma senha/), 'senha1234');
    await userEvent.type(screen.getByLabelText(/Repita a senha/), 'senha1234');
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar convite e entrar' }));

    expect(aceitarConvite).toHaveBeenCalledWith(TOKEN, 'Ana Souza', 'senha1234');
    expect(await screen.findByText('Painel da equipe')).toBeInTheDocument();
  });

  it('erro da API aparece no formulário', async () => {
    conviteService.detalhes.mockResolvedValue(convite);
    renderizar({ aceitarConvite: vi.fn().mockRejectedValue({ response: { data: { message: 'Este convite já foi utilizado.' } } }) });
    await screen.findByRole('button', { name: 'Aceitar convite e entrar' });
    await userEvent.type(screen.getByLabelText(/Seu nome/), 'Ana Souza');
    await userEvent.type(screen.getByLabelText(/Crie uma senha/), 'senha1234');
    await userEvent.type(screen.getByLabelText(/Repita a senha/), 'senha1234');
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar convite e entrar' }));
    expect(await screen.findByText('Este convite já foi utilizado.')).toBeInTheDocument();
  });

  it.each([
    ['expirado', 'Este convite expirou'],
    ['aceito', 'Convite já aceito'],
  ])('status %s mostra a situação certa', async (status, titulo) => {
    conviteService.detalhes.mockResolvedValue({ ...convite, status });
    renderizar();
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceitar convite e entrar' })).not.toBeInTheDocument();
  });

  it('link inexistente explica o que fazer', async () => {
    conviteService.detalhes.mockRejectedValue({ response: { status: 404 } });
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Este convite não existe mais' })).toBeInTheDocument();
  });

  it('logado em outra conta: pede para sair antes', async () => {
    conviteService.detalhes.mockResolvedValue(convite);
    renderizar({ autenticado: true, usuario: { email: 'outra@x.com' } });
    expect(await screen.findByText(/conectado como outra@x.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair desta conta' })).toBeInTheDocument();
  });
});
