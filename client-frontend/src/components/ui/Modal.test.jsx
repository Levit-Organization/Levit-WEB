import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';
import { renderComFeedback } from '../../test/renderComFeedback';

function abrir(props = {}) {
  const onClose = vi.fn();
  renderComFeedback(
    <Modal open onClose={onClose} title="Novo registro" {...props}>
      <input aria-label="Nome" />
    </Modal>
  );
  return onClose;
}

describe('Modal', () => {
  it('é um diálogo acessível rotulado pelo título', () => {
    abrir();
    expect(screen.getByRole('dialog', { name: 'Novo registro' })).toHaveAttribute('aria-modal', 'true');
  });

  it('foca o primeiro campo e trava o scroll da página', () => {
    abrir();
    expect(screen.getByLabelText('Nome')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('fecha com Esc quando não há alterações', async () => {
    const onClose = abrir();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('com alterações, pede confirmação antes de fechar', async () => {
    const onClose = abrir({ dirty: true });
    await userEvent.keyboard('{Escape}');
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Descartar alterações?' });
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(confirmacao).not.toBeInTheDocument());
  });

  it('com alterações, fecha depois de confirmar o descarte', async () => {
    const onClose = abrir({ dirty: true });
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('mantém o foco dentro do diálogo com Tab', async () => {
    abrir({ footer: <button type="button">Salvar</button> });
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('não renderiza nada quando fechado', () => {
    renderComFeedback(<Modal open={false} onClose={() => {}} title="X">c</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
