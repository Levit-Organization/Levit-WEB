import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuadroItens from './QuadroItens';

const campos = [
  { id: 'c1', nome: 'Cliente', tipo: 'texto' },
  { id: 'c2', nome: 'Valor', tipo: 'numero' },
  { id: 'c3', nome: 'Status', tipo: 'selecao', opcoes: ['Novo', 'Proposta', 'Fechado'] },
];
const itens = [
  { id: 'r1', dados: { c1: 'ACME', c2: 48000, c3: 'Proposta' } },
  { id: 'r2', dados: { c1: 'Padaria Sol', c3: 'Novo' } },
  { id: 'r3', dados: { c1: 'Sem etapa' } },
];

function renderizar(extra = {}) {
  const props = { itens, campos, campoGrupo: campos[2], onAbrir: vi.fn(), onMover: vi.fn(), ...extra };
  render(<QuadroItens {...props} />);
  return props;
}

describe('QuadroItens', () => {
  it('cria uma coluna por opção e uma para itens sem valor', () => {
    renderizar();
    expect(screen.getByRole('region', { name: 'Novo, 1 item' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Proposta, 1 item' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Fechado, 0 itens' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sem status, 1 item' })).toBeInTheDocument();
  });

  it('cartão mostra o título (primeira coluna de texto) e os detalhes formatados', () => {
    renderizar();
    const proposta = screen.getByRole('region', { name: 'Proposta, 1 item' });
    expect(within(proposta).getByText('ACME')).toBeInTheDocument();
    expect(within(proposta).getByText('48.000')).toBeInTheDocument();
  });

  it('sem itens sem valor, não mostra a coluna extra', () => {
    renderizar({ itens: itens.slice(0, 2) });
    expect(screen.queryByRole('region', { name: /^Sem status/ })).not.toBeInTheDocument();
  });

  it('o seletor do cartão move o item (teclado e celular)', async () => {
    const { onMover } = renderizar();
    await userEvent.selectOptions(screen.getByLabelText('Status de Padaria Sol'), 'Fechado');
    expect(onMover).toHaveBeenCalledWith(itens[1], 'Fechado');
  });

  it('clicar no cartão abre o item', async () => {
    const { onAbrir } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /ACME/ }));
    expect(onAbrir).toHaveBeenCalledWith(itens[0]);
  });
});
