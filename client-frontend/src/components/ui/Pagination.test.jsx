import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

const base = { page: 2, totalPages: 3, from: 26, to: 50, total: 60, onPageChange: () => {} };

describe('Pagination', () => {
  it('não renderiza quando cabe em uma página', () => {
    const { container } = render(<Pagination {...base} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o intervalo e a página atual', () => {
    render(<Pagination {...base} />);
    expect(screen.getByText('Mostrando 26–50 de 60 registros')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('navega para a página anterior e a próxima', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...base} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('desabilita os botões nos limites', () => {
    const { rerender } = render(<Pagination {...base} page={1} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    rerender(<Pagination {...base} page={3} />);
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });
});
