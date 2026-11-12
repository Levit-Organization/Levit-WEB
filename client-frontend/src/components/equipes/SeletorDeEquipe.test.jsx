import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../../context/FeedbackProvider';
import { AuthContext } from '../../context/authContext';
import { queryKeys } from '../../hooks/queries';
import SeletorDeEquipe from './SeletorDeEquipe';

const EQUIPES = [
  { id: 'e1', nome: 'Acme', cargo_nome: 'Admin', administrador_principal: true },
  { id: 'e2', nome: 'Padaria Sol', cargo_nome: 'Vendas', administrador_principal: false },
];

function renderizar(auth = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(queryKeys.minhasEquipes, EQUIPES);
  const valor = {
    empresa: { id: 'e1', nome: 'Acme' },
    trocarEquipe: vi.fn().mockResolvedValue({}),
    criarEquipe: vi.fn().mockResolvedValue({}),
    ...auth,
  };
  render(
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <AuthContext.Provider value={valor}>
          <MemoryRouter initialEntries={['/modulos']}>
            <Routes>
              <Route path="/modulos" element={<SeletorDeEquipe />} />
              <Route path="/dashboard" element={<p>Início da equipe</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
  return valor;
}

describe('SeletorDeEquipe', () => {
  it('lista as equipes com o cargo em cada uma e marca a atual', async () => {
    renderizar();
    expect(screen.getByText('2 equipes · trocar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Acme/ }));
    expect(screen.getByRole('menuitemradio', { name: /Acme/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: /Padaria Sol/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Vendas')).toBeInTheDocument();
  });

  it('trocar de equipe entra nela e vai para o Início', async () => {
    const { trocarEquipe } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Acme/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Padaria Sol/ }));

    expect(trocarEquipe).toHaveBeenCalledWith('e2');
    expect(await screen.findByText('Início da equipe')).toBeInTheDocument();
  });

  it('cria uma equipe nova pelo menu', async () => {
    const { criarEquipe } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Acme/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Criar nova equipe/ }));

    await userEvent.type(screen.getByLabelText('Nome da equipe'), 'Agência Pixel');
    await userEvent.click(screen.getByRole('button', { name: 'Criar e entrar' }));

    expect(criarEquipe).toHaveBeenCalledWith('Agência Pixel');
    expect(await screen.findByText('Início da equipe')).toBeInTheDocument();
  });
});
