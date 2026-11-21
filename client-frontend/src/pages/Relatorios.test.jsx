import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import Relatorios from './Relatorios';
import { relatorioService } from '../services/relatorioService';
import { equipeService } from '../services/equipeService';
import { hojeISO } from '../utils/prazos';
import { SECOES_PADRAO, SECOES_RELATORIO, somarDias } from '../utils/relatorios';

vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
// Painel e relatório montado têm consultas próprias: aqui só importa o período que recebem.
vi.mock('../components/relatorios/PainelIndicadores', () => ({
  default: ({ inicio, fim }) => <p>Indicadores de {inicio} a {fim}</p>,
}));
vi.mock('../components/relatorios/MontarRelatorio', () => ({
  default: ({ inicio, fim }) => <p>Montar de {inicio} a {fim}</p>,
}));
vi.mock('../services/relatorioService', () => ({
  relatorioService: {
    listar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn(),
    envios: vi.fn(),
    enviarAgora: vi.fn(),
    baixarPdf: vi.fn(),
  },
}));
vi.mock('../services/equipeService', () => ({ equipeService: { listarPessoas: vi.fn() } }));

const HOJE = hojeISO();
const INICIO_30D = somarDias(HOJE, -29);
const dataHora = (utc) => new Date(`${utc.replace(' ', 'T')}Z`).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const pessoas = [
  { id: 'u1', nome: 'Ana Lima' },
  { id: 'u2', nome: 'Bruno Reis' },
];

const semanal = {
  id: 'r1',
  nome: 'Resumo semanal',
  frequencia: 'semanal',
  dia: 1,
  destinatarios: ['u1', 'u9'],
  secoes: ['resumo', 'prazos'],
  ativo: true,
  descricao_agenda: 'Toda segunda-feira',
  proximo_envio: '2026-11-16 00:00:00',
  ultimo_envio: { status: 'enviado', enviado_em: '2026-11-09 11:00:00', total_atividades: 42 },
};

const mensal = {
  id: 'r2',
  nome: 'Fechamento do mês',
  frequencia: 'mensal',
  dia: 5,
  destinatarios: ['u2'],
  secoes: SECOES_PADRAO,
  ativo: false,
  descricao_agenda: 'Todo dia 5',
  proximo_envio: '2026-12-05 00:00:00',
  ultimo_envio: { status: 'erro', enviado_em: '2026-11-05 11:00:00', erro: 'SMTP fora do ar' },
};

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <Relatorios />
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

async function irParaHistoricos() {
  await userEvent.click(screen.getByRole('tab', { name: 'Históricos' }));
}

// O cartão inteiro: o título fica dois níveis abaixo dele.
const cartao = (nome) => within(screen.getByRole('heading', { level: 3, name: nome }).parentElement.parentElement.parentElement);

describe('Relatorios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    relatorioService.listar.mockResolvedValue([semanal, mensal]);
    relatorioService.envios.mockResolvedValue([]);
    equipeService.listarPessoas.mockResolvedValue(pessoas);
  });

  it('abre no painel com os últimos 30 dias', async () => {
    renderizar();

    expect(screen.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeInTheDocument();
    expect(screen.getByText('Números do período e PDFs por e-mail')).toBeInTheDocument();
    const abas = screen.getAllByRole('tab');
    expect(abas.map((a) => a.textContent)).toEqual(['Painel', 'Montar relatório', 'Históricos']);
    expect(screen.getByRole('tab', { name: 'Painel' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'painel-painel');

    expect(screen.getByLabelText('Período')).toHaveValue('30d');
    expect(screen.getByLabelText('De')).toHaveValue(INICIO_30D);
    expect(screen.getByLabelText('Até')).toHaveValue(HOJE);
    expect(screen.getByLabelText('Até')).toHaveAttribute('max', HOJE);
    expect(screen.getByText(`Indicadores de ${INICIO_30D} a ${HOJE}`)).toBeInTheDocument();
    // "Novo relatório" só aparece na aba de PDFs.
    expect(screen.queryByRole('button', { name: 'Novo relatório' })).not.toBeInTheDocument();
  });

  it('trocar o período vale para todas as abas', async () => {
    renderizar();

    await userEvent.selectOptions(screen.getByLabelText('Período'), '7d');
    const inicio7 = somarDias(HOJE, -6);
    expect(screen.getByText(`Indicadores de ${inicio7} a ${HOJE}`)).toBeInTheDocument();

    // Mexer numa data vira "Escolher datas".
    await userEvent.clear(screen.getByLabelText('De'));
    await userEvent.type(screen.getByLabelText('De'), '2026-01-01');
    expect(screen.getByLabelText('Período')).toHaveValue('outro');
    expect(screen.getByText(`Indicadores de 2026-01-01 a ${HOJE}`)).toBeInTheDocument();

    // "Escolher datas" mantém as datas como estão.
    await userEvent.selectOptions(screen.getByLabelText('Período'), '30d');
    await userEvent.selectOptions(screen.getByLabelText('Período'), 'outro');
    expect(screen.getByLabelText('De')).toHaveValue(INICIO_30D);

    await userEvent.click(screen.getByRole('tab', { name: 'Montar relatório' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'painel-montar');
    expect(screen.getByText(`Montar de ${INICIO_30D} a ${HOJE}`)).toBeInTheDocument();
  });

  it('período invertido mostra o aviso', async () => {
    renderizar();

    await userEvent.clear(screen.getByLabelText('De'));
    await userEvent.type(screen.getByLabelText('De'), '2099-01-01');
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um período válido (início antes do fim).');
  });

  it('sem acesso total, explica e não mostra as abas', async () => {
    relatorioService.listar.mockRejectedValue({ response: { status: 403, data: { message: 'Proibido.' } } });
    renderizar();

    expect(await screen.findByText('Relatórios são para quem tem acesso total')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Período')).not.toBeInTheDocument();
  });

  it('baixa o PDF do período com as partes marcadas', async () => {
    relatorioService.baixarPdf.mockResolvedValue();
    renderizar();
    await irParaHistoricos();

    expect(screen.getByRole('button', { name: 'Novo relatório' })).toBeInTheDocument();
    const baixarAgora = within(screen.getByRole('heading', { name: 'Baixar agora' }).closest('div').parentElement);
    const caixas = baixarAgora.getAllByRole('checkbox');
    expect(caixas.map((c) => c.closest('label').textContent)).toEqual(SECOES_RELATORIO.map((s) => s.rotulo));
    expect(caixas.map((c) => c.checked)).toEqual(SECOES_RELATORIO.map((s) => s.valor !== 'ranking'));
    expect(baixarAgora.getByText('Recrutamento').closest('label')).toHaveAttribute('title', SECOES_RELATORIO[1].descricao);

    await userEvent.click(baixarAgora.getByRole('checkbox', { name: 'Recrutamento' }));
    await userEvent.click(baixarAgora.getByRole('checkbox', { name: 'Ranking por pessoa e por tabela' }));
    await userEvent.click(baixarAgora.getByRole('button', { name: 'Baixar PDF' }));

    expect(relatorioService.baixarPdf).toHaveBeenCalledWith({
      inicio: INICIO_30D,
      fim: HOJE,
      secoes: [...SECOES_PADRAO.filter((s) => s !== 'recrutamento'), 'ranking'],
    });
  });

  it('sem nenhuma parte marcada, não dá para baixar; erro vira aviso', async () => {
    relatorioService.baixarPdf.mockRejectedValue({ response: { data: { message: 'Período grande demais.' } } });
    renderizar();
    await irParaHistoricos();

    const baixarAgora = within(screen.getByRole('heading', { name: 'Baixar agora' }).closest('div').parentElement);
    await userEvent.click(baixarAgora.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText('Período grande demais.')).toBeInTheDocument();

    for (const caixa of baixarAgora.getAllByRole('checkbox')) {
      if (caixa.checked) await userEvent.click(caixa);
    }
    expect(baixarAgora.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled();
  });

  it('lista os relatórios agendados', async () => {
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    expect(screen.getByRole('heading', { level: 2, name: 'Agendados' })).toBeInTheDocument();

    const ativo = cartao('Resumo semanal');
    expect(ativo.getByText(`Toda segunda-feira · próximo envio em 16/11/2026`)).toBeInTheDocument();
    expect(ativo.getByText('Ana Lima')).toBeInTheDocument();
    expect(ativo.getByText('Pessoa removida')).toBeInTheDocument();
    expect(ativo.getByText(`Último envio: ${dataHora('2026-11-09 11:00:00')}, com 42 atividades.`)).toBeInTheDocument();
    expect(ativo.getByRole('switch', { name: 'Pausar relatório' })).toHaveAttribute('aria-checked', 'true');

    const pausado = cartao('Fechamento do mês');
    expect(pausado.getByText('Todo dia 5 · pausado')).toBeInTheDocument();
    expect(pausado.getByText('Bruno Reis')).toBeInTheDocument();
    expect(pausado.getByText(`O último envio falhou (${dataHora('2026-11-05 11:00:00')}): SMTP fora do ar`)).toHaveClass('text-danger');
    expect(pausado.getByRole('switch', { name: 'Ligar relatório' })).toHaveAttribute('aria-checked', 'false');
  });

  it('nenhum relatório agendado convida a agendar o primeiro', async () => {
    relatorioService.listar.mockResolvedValue([]);
    renderizar();
    await irParaHistoricos();

    expect(await screen.findByText('Nenhum relatório agendado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar o primeiro' }));
    expect(screen.getByRole('dialog', { name: 'Novo relatório' })).toBeInTheDocument();
  });

  it('erro ao carregar a lista mostra a mensagem e tenta de novo', async () => {
    relatorioService.listar.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Banco fora.' } } });
    renderizar();
    await irParaHistoricos();

    expect(await screen.findByText('Banco fora.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' })).toBeInTheDocument();
  });

  it('agenda um relatório novo validando os campos', async () => {
    relatorioService.criar.mockResolvedValue({ id: 'r3' });
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(screen.getByRole('button', { name: 'Novo relatório' }));
    const modal = within(screen.getByRole('dialog', { name: 'Novo relatório' }));
    expect(modal.getByText('O PDF chega por e-mail de manhã, no dia escolhido.')).toBeInTheDocument();
    expect(modal.getByRole('button', { name: 'Semanal' })).toHaveAttribute('aria-pressed', 'true');
    expect(modal.getByLabelText('Dia da semana')).toHaveValue('1');
    expect(modal.getAllByRole('option').map((o) => o.textContent)).toHaveLength(7);
    expect(modal.getByText('Cobre os 7 dias anteriores.')).toBeInTheDocument();
    expect(modal.getByRole('switch', { name: 'Ligado' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(modal.getByRole('button', { name: 'Agendar' }));
    expect(modal.getByRole('alert')).toHaveTextContent('Dê um nome ao relatório.');

    await userEvent.type(modal.getByLabelText(/^Nome/), '  Diário da equipe ');
    await userEvent.click(modal.getByRole('button', { name: 'Agendar' }));
    expect(modal.getByRole('alert')).toHaveTextContent('Escolha quem recebe o relatório.');

    await userEvent.click(modal.getByRole('checkbox', { name: 'Bruno Reis' }));
    for (const s of SECOES_PADRAO) {
      await userEvent.click(modal.getByRole('checkbox', { name: SECOES_RELATORIO.find((x) => x.valor === s).rotulo }));
    }
    await userEvent.click(modal.getByRole('button', { name: 'Agendar' }));
    expect(modal.getByRole('alert')).toHaveTextContent('Marque ao menos uma parte para o PDF.');
    expect(relatorioService.criar).not.toHaveBeenCalled();

    await userEvent.click(modal.getByRole('checkbox', { name: 'Prazos' }));
    await userEvent.click(modal.getByRole('button', { name: 'Diário' }));
    expect(modal.queryByLabelText(/Dia da/)).not.toBeInTheDocument();
    expect(modal.getByText('Cobre o dia anterior.')).toBeInTheDocument();
    await userEvent.click(modal.getByRole('button', { name: 'Agendar' }));

    expect(relatorioService.criar).toHaveBeenCalledWith({
      nome: 'Diário da equipe',
      frequencia: 'diario',
      dia: 1,
      destinatarios: ['u2'],
      secoes: ['prazos'],
      ativo: true,
    });
    expect(await screen.findByText('Relatório agendado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo relatório' })).not.toBeInTheDocument());
  });

  it('mensal escolhe o dia do mês até 28', async () => {
    relatorioService.criar.mockResolvedValue({ id: 'r3' });
    renderizar();
    await irParaHistoricos();

    await userEvent.click(screen.getByRole('button', { name: 'Novo relatório' }));
    const modal = within(screen.getByRole('dialog', { name: 'Novo relatório' }));
    await userEvent.selectOptions(modal.getByLabelText('Dia da semana'), '3');
    await userEvent.click(modal.getByRole('button', { name: 'Mensal' }));

    const dia = modal.getByLabelText('Dia do mês');
    expect(dia).toHaveValue('1');
    expect(within(dia).getAllByRole('option')).toHaveLength(28);
    expect(within(dia).getAllByRole('option').at(-1)).toHaveTextContent('Dia 28');
    expect(modal.getByText('Cobre o mês anterior. Vai até o dia 28 para existir em todo mês.')).toBeInTheDocument();

    await userEvent.selectOptions(dia, '15');
    await userEvent.type(modal.getByLabelText(/^Nome/), 'Mensal');
    await userEvent.click(modal.getByRole('checkbox', { name: 'Ana Lima' }));
    await userEvent.click(modal.getByRole('switch', { name: 'Ligado' }));
    await userEvent.click(modal.getByRole('button', { name: 'Agendar' }));

    expect(relatorioService.criar).toHaveBeenCalledWith({
      nome: 'Mensal',
      frequencia: 'mensal',
      dia: 15,
      destinatarios: ['u1'],
      secoes: SECOES_PADRAO,
      ativo: false,
    });
  });

  it('edita um relatório existente', async () => {
    relatorioService.atualizar.mockResolvedValue({});
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Editar relatório' }));
    const modal = within(screen.getByRole('dialog', { name: 'Editar relatório' }));
    const nome = modal.getByLabelText(/^Nome/);
    expect(nome).toHaveValue('Resumo semanal');
    expect(modal.getByRole('checkbox', { name: 'Ana Lima' })).toBeChecked();
    expect(modal.getByRole('checkbox', { name: 'Prazos' })).toBeChecked();
    expect(modal.getByRole('checkbox', { name: 'Recrutamento' })).not.toBeChecked();

    await userEvent.clear(nome);
    await userEvent.type(nome, 'Resumo da semana');
    await userEvent.click(modal.getByRole('checkbox', { name: 'Ana Lima' }));
    await userEvent.click(modal.getByRole('button', { name: 'Salvar' }));

    expect(relatorioService.atualizar).toHaveBeenCalledWith('r1', {
      nome: 'Resumo da semana',
      frequencia: 'semanal',
      dia: 1,
      destinatarios: ['u9'],
      secoes: ['resumo', 'prazos'],
      ativo: true,
    });
    expect(await screen.findByText('Relatório atualizado.')).toBeInTheDocument();
  });

  it('erro ao salvar fica no formulário', async () => {
    relatorioService.atualizar.mockRejectedValue({ response: { data: { message: 'Nome repetido.' } } });
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Editar relatório' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar relatório' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Nome repetido.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar relatório' })).toBeInTheDocument();
  });

  it('pausa e liga pelo interruptor', async () => {
    relatorioService.atualizar.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('rede'));
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(screen.getByRole('switch', { name: 'Pausar relatório' }));
    expect(relatorioService.atualizar).toHaveBeenCalledWith('r1', { ...semanal, ativo: false });
    expect(await screen.findByText('Relatório pausado.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Ligar relatório' }));
    expect(relatorioService.atualizar).toHaveBeenLastCalledWith('r2', { ...mensal, ativo: true });
    expect(await screen.findByText('Relatório ligado.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Pausar relatório' }));
    expect(await screen.findByText('Não foi possível alterar.')).toBeInTheDocument();
  });

  it('envia agora e recarrega a lista', async () => {
    relatorioService.enviarAgora.mockResolvedValueOnce({}).mockRejectedValueOnce({ response: { data: { message: 'Sem SMTP.' } } });
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });
    expect(relatorioService.listar).toHaveBeenCalledTimes(1);

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Enviar agora' }));
    expect(relatorioService.enviarAgora).toHaveBeenCalledWith('r1');
    expect(await screen.findByText('Relatório enviado por e-mail.')).toBeInTheDocument();
    await waitFor(() => expect(relatorioService.listar).toHaveBeenCalledTimes(2));

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Enviar agora' }));
    expect(await screen.findByText('Sem SMTP.')).toBeInTheDocument();
    await waitFor(() => expect(relatorioService.listar).toHaveBeenCalledTimes(3));
  });

  it('exclui depois de confirmar', async () => {
    relatorioService.excluir.mockResolvedValue();
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(cartao('Fechamento do mês').getByRole('button', { name: 'Excluir relatório' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir relatório?' });
    expect(
      within(dialogo).getByText('"Fechamento do mês" deixa de ser enviado. O histórico de atividades continua guardado.')
    ).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(relatorioService.excluir).toHaveBeenCalledWith('r2');
    expect(await screen.findByText('Relatório excluído.')).toBeInTheDocument();
  });

  it('cancelar a exclusão não exclui', async () => {
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Excluir relatório' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(relatorioService.excluir).not.toHaveBeenCalled();
  });

  it('histórico lista os envios e baixa o PDF de cada um', async () => {
    relatorioService.envios.mockResolvedValue([
      { id: 'e1', enviado_em: '2026-11-09 11:00:00', status: 'enviado', total_atividades: 42, periodo_inicio: '2026-11-02 12:00:00', periodo_fim: '2026-11-09 12:00:00' },
      { id: 'e2', enviado_em: '2026-11-02 11:00:00', status: 'erro', erro: 'SMTP', periodo_inicio: '2026-10-26 12:00:00', periodo_fim: '2026-11-02 12:00:00' },
    ]);
    relatorioService.baixarPdf.mockResolvedValue();
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    const botao = cartao('Resumo semanal').getByRole('button', { name: 'Histórico' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(relatorioService.envios).not.toHaveBeenCalled();
    await userEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');

    const lista = within(await cartao('Resumo semanal').findByRole('list'));
    expect(relatorioService.envios).toHaveBeenCalledWith('r1');
    const envios = lista.getAllByRole('listitem');
    expect(envios).toHaveLength(2);
    expect(within(envios[0]).getByText(dataHora('2026-11-09 11:00:00'))).toBeInTheDocument();
    expect(within(envios[0]).getByText('42 atividades')).toBeInTheDocument();
    expect(within(envios[1]).getByText('Não enviado')).toHaveAttribute('title', 'SMTP');

    await userEvent.click(within(envios[0]).getByRole('button', { name: 'Baixar PDF' }));
    expect(relatorioService.baixarPdf).toHaveBeenCalledWith({
      inicio: hojeISO(new Date('2026-11-02T12:00:00Z')),
      fim: hojeISO(new Date('2026-11-09T11:59:00Z')),
      titulo: 'Resumo semanal',
      secoes: ['resumo', 'prazos'],
    });

    await userEvent.click(botao);
    expect(cartao('Resumo semanal').queryByRole('list')).not.toBeInTheDocument();
  });

  it('histórico vazio, com erro e falha ao baixar', async () => {
    relatorioService.envios.mockImplementation(async (id) => {
      if (id === 'r2') throw { response: { data: { message: 'Histórico indisponível.' } } };
      return [{ id: 'e1', enviado_em: '2026-11-09 11:00:00', status: 'enviado', total_atividades: 1, periodo_inicio: '2026-11-02 12:00:00', periodo_fim: '2026-11-09 12:00:00' }];
    });
    relatorioService.baixarPdf.mockRejectedValue(new Error('rede'));
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(cartao('Fechamento do mês').getByRole('button', { name: 'Histórico' }));
    expect(await screen.findByText('Histórico indisponível.')).toBeInTheDocument();

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Histórico' }));
    const lista = within(await cartao('Resumo semanal').findByRole('list'));
    await userEvent.click(lista.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText('Não foi possível gerar o PDF.')).toBeInTheDocument();
  });

  it('histórico sem envios avisa', async () => {
    renderizar();
    await irParaHistoricos();
    await screen.findByRole('heading', { level: 3, name: 'Resumo semanal' });

    await userEvent.click(cartao('Resumo semanal').getByRole('button', { name: 'Histórico' }));
    expect(await screen.findByText('Ainda não houve nenhum envio.')).toBeInTheDocument();
  });
});
