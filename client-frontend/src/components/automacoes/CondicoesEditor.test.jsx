import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CondicoesEditor from './CondicoesEditor';
import { novaRegra } from '../../utils/automacaoConstants';

const campos = [
  { id: 'c1', nome: 'Status', tipo: 'selecao', opcoes: ['Novo', 'Fechado'] },
  { id: 'c2', nome: 'Valor', tipo: 'numero' },
];

function Harness({ onMudanca = () => {}, inicial = [novaRegra()] }) {
  const [logica, setLogica] = useState('e');
  const [regras, setRegras] = useState(inicial);
  return (
    <>
      <CondicoesEditor
        logica={logica}
        regras={regras}
        campos={campos}
        onChangeLogica={setLogica}
        onChangeRegras={setRegras}
        onMudanca={onMudanca}
      />
      <output data-testid="estado">{JSON.stringify({ logica, regras })}</output>
    </>
  );
}

const estado = () => JSON.parse(screen.getByTestId('estado').textContent);

describe('CondicoesEditor', () => {
  it('adiciona e remove condições; E/OU só aparece com mais de uma', async () => {
    render(<Harness />);
    expect(screen.queryByRole('group', { name: 'Como combinar as condições' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover condição/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar condição' }));
    expect(estado().regras).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'qualquer uma' }));
    expect(estado().logica).toBe('ou');

    await userEvent.click(screen.getByRole('button', { name: 'Remover condição 2' }));
    expect(estado().regras).toHaveLength(1);
  });

  it('coluna de seleção vira lista de opções e trocar a coluna limpa o valor', async () => {
    render(<Harness inicial={[{ campo: 'c2', operador: 'igual', valor: '10', valor_de: '' }]} />);
    await userEvent.selectOptions(screen.getByLabelText(/^Coluna/), 'c1');
    expect(estado().regras[0]).toMatchObject({ campo: 'c1', valor: '' });

    await userEvent.selectOptions(screen.getByLabelText(/^Valor/), 'Fechado');
    expect(estado().regras[0].valor).toBe('Fechado');
  });

  it('operadores sem valor escondem o campo de valor; "mudou de… para…" mostra De e Para', async () => {
    render(<Harness inicial={[{ campo: 'c1', operador: 'igual', valor: '', valor_de: '' }]} />);
    await userEvent.selectOptions(screen.getByLabelText(/^Operador/), 'preenchido');
    expect(screen.queryByLabelText(/^Valor/)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/^Operador/), 'mudou_de_para');
    expect(screen.getByLabelText(/^De/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Para/)).toBeInTheDocument();
  });

  it('avisa quando uma regra passa a usar operador de mudança', async () => {
    const onMudanca = vi.fn();
    render(<Harness onMudanca={onMudanca} inicial={[{ campo: 'c1', operador: 'igual', valor: '', valor_de: '' }]} />);
    await userEvent.selectOptions(screen.getByLabelText(/^Operador/), 'contem');
    expect(onMudanca).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText(/^Operador/), 'mudou');
    expect(onMudanca).toHaveBeenCalledTimes(1);
  });
});
