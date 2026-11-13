import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../../context/FeedbackProvider';
import TabelaDeArquivos from './TabelaDeArquivos';
import { registroService } from '../../services/registroService';
import { arquivoService } from '../../services/arquivoService';

vi.mock('../Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../../services/registroService', () => ({ registroService: { getAll: vi.fn() } }));
vi.mock('../../services/arquivoService', () => ({
  arquivoService: { upload: vi.fn(), obter: vi.fn(), downloadFile: vi.fn(), delete: vi.fn() },
}));

const modulo = { id: 'a1', nome: 'Documentos', icone: 'folder_open', tipo: 'arquivo' };

const agora = new Date().toISOString();
const arquivos = [
  { id: 'f1', arquivo_nome: 'Contrato.pdf', arquivo_tamanho: 2048, enviado_por_nome: 'Ana Lima', criado_em: '2026-01-10T10:00:00' },
  { id: 'f2', arquivo_nome: 'planilha.xlsx', arquivo_tamanho: 2621440, enviado_por_nome: 'Bruno Reis', criado_em: '2026-02-10T10:00:00' },
  { id: 'f3', arquivo_nome: 'foto.png', arquivo_tamanho: 500, enviado_por_nome: null, criado_em: agora },
];

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <MemoryRouter>
          <TabelaDeArquivos modulo={modulo} />
        </MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

const linhas = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const nomes = () => linhas().map((l) => within(l).getAllByRole('cell')[0].querySelector('.block').textContent);
const cabecalho = (nome) => screen.getByRole('columnheader', { name: new RegExp(`^${nome}`) });
const seletor = () => document.querySelector('input[type="file"]');

async function esperarTabela() {
  await screen.findByText('Contrato.pdf');
}

describe('TabelaDeArquivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registroService.getAll.mockResolvedValue(arquivos);
    arquivoService.obter.mockReturnValue(new Promise(() => {}));
  });

  it('mostra o nome, o total, as colunas e os arquivos do mais recente ao mais antigo', async () => {
    renderizar();
    await esperarTabela();

    expect(screen.getByRole('heading', { level: 1, name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByText('3 arquivos · 2,5 MB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configurar/ })).toHaveAttribute('href', '/modulos/a1/editar');
    expect(screen.getByRole('button', { name: /Enviar arquivos/ })).toBeInTheDocument();
    expect(registroService.getAll).toHaveBeenCalledWith('a1', undefined, expect.anything(), undefined);

    const titulos = screen.getAllByRole('columnheader').map((th) => th.textContent.replace(/(unfold_more|arrow_upward|arrow_downward)$/, ''));
    expect(titulos).toEqual(['Nome', 'Tamanho', 'Enviado por', 'Enviado', 'Ações']);
    expect(cabecalho('Enviado$')).toHaveAttribute('aria-sort', 'descending');
    expect(nomes()).toEqual(['foto.png', 'planilha.xlsx', 'Contrato.pdf']);

    const contrato = within(linhas()[2]);
    expect(contrato.getByText('PDF')).toBeInTheDocument();
    expect(contrato.getByText('2 KB')).toBeInTheDocument();
    expect(contrato.getByText('Ana Lima')).toBeInTheDocument();
    expect(contrato.getByRole('button', { name: 'Visualizar Contrato.pdf' })).toBeInTheDocument();

    const planilha = within(linhas()[1]);
    expect(planilha.getByText('Planilha')).toBeInTheDocument();
    expect(planilha.getByText('2,5 MB')).toBeInTheDocument();
    // Planilha não abre no app: só baixar e excluir.
    expect(planilha.queryByRole('button', { name: 'Visualizar planilha.xlsx' })).not.toBeInTheDocument();
    expect(planilha.getByRole('button', { name: 'Baixar planilha.xlsx' })).toBeInTheDocument();
    expect(planilha.getByRole('button', { name: 'Excluir planilha.xlsx' })).toBeInTheDocument();

    const foto = within(linhas()[0]);
    expect(foto.getByText('500 B')).toBeInTheDocument();
    expect(foto.getByText(/^hoje, \d{2}:\d{2}$/)).toBeInTheDocument();
    // Sem quem enviou: "--".
    expect(foto.getAllByText('--')).toHaveLength(1);
  });

  it('um arquivo só fica no singular; data inválida vira "--"', async () => {
    registroService.getAll.mockResolvedValue([{ id: 'u1', arquivo_nome: 'nota.txt', arquivo_tamanho: 1024, criado_em: 'xx' }]);
    renderizar();
    await screen.findByText('nota.txt');

    expect(screen.getByText('1 arquivo · 1 KB')).toBeInTheDocument();
    expect(within(linhas()[0]).getAllByText('--')).toHaveLength(2);
  });

  it('enquanto carrega, avisa no subtítulo', () => {
    registroService.getAll.mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro e tenta de novo', async () => {
    registroService.getAll.mockRejectedValueOnce({ response: { data: { message: 'Sem acesso.' } } });
    renderizar();

    expect(await screen.findByText('Sem acesso.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await esperarTabela();
  });

  it('erro sem mensagem da API usa o texto padrão', async () => {
    registroService.getAll.mockRejectedValue(new Error('rede'));
    renderizar();
    expect(await screen.findByText('Não foi possível carregar os arquivos.')).toBeInTheDocument();
  });

  it('tabela vazia convida a arrastar ou escolher arquivos', async () => {
    registroService.getAll.mockResolvedValue([]);
    renderizar();

    const area = await screen.findByRole('button', { name: /Arraste arquivos para cá ou clique para escolher/ });
    expect(screen.getByText('Nenhum arquivo ainda')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    const clique = vi.spyOn(seletor(), 'click');
    await userEvent.click(area);
    expect(clique).toHaveBeenCalled();
  });

  it('ordena pelas colunas', async () => {
    renderizar();
    await esperarTabela();

    // Nome começa crescente.
    await userEvent.click(within(cabecalho('Nome')).getByRole('button'));
    expect(cabecalho('Nome')).toHaveAttribute('aria-sort', 'ascending');
    expect(cabecalho('Enviado$')).toHaveAttribute('aria-sort', 'none');
    expect(nomes()).toEqual(['Contrato.pdf', 'foto.png', 'planilha.xlsx']);

    await userEvent.click(within(cabecalho('Nome')).getByRole('button'));
    expect(cabecalho('Nome')).toHaveAttribute('aria-sort', 'descending');
    expect(nomes()).toEqual(['planilha.xlsx', 'foto.png', 'Contrato.pdf']);

    // Tamanho começa decrescente.
    await userEvent.click(within(cabecalho('Tamanho')).getByRole('button'));
    expect(cabecalho('Tamanho')).toHaveAttribute('aria-sort', 'descending');
    expect(nomes()).toEqual(['planilha.xlsx', 'Contrato.pdf', 'foto.png']);

    // Enviado por começa crescente; sem nome fica no início.
    await userEvent.click(within(cabecalho('Enviado por')).getByRole('button'));
    expect(cabecalho('Enviado por')).toHaveAttribute('aria-sort', 'ascending');
    expect(nomes()).toEqual(['foto.png', 'Contrato.pdf', 'planilha.xlsx']);

    await userEvent.click(within(cabecalho('Enviado$')).getByRole('button'));
    expect(nomes()).toEqual(['foto.png', 'planilha.xlsx', 'Contrato.pdf']);
  });

  it('busca pelo nome sem diferenciar acento e explica quando nada bate', async () => {
    registroService.getAll.mockResolvedValue([...arquivos, { id: 'f4', arquivo_nome: 'Relatório.docx', arquivo_tamanho: 10, criado_em: agora }]);
    renderizar();
    await esperarTabela();

    const busca = screen.getByRole('searchbox', { name: 'Buscar arquivos' });
    await userEvent.type(busca, 'relatorio');
    expect(nomes()).toEqual(['Relatório.docx']);

    await userEvent.clear(busca);
    await userEvent.type(busca, ' zzz ');
    expect(screen.getByText('Nenhum arquivo com esse nome')).toBeInTheDocument();
    expect(screen.getByText('Nada bate com "zzz". Confira a grafia ou busque por parte do nome.')).toBeInTheDocument();
    // O subtítulo continua contando todos.
    expect(screen.getByText(/^4 arquivos · /)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(busca).toHaveValue('');
    expect(nomes()).toHaveLength(4);
  });

  it('pagina de 25 em 25 e volta à primeira página ao buscar', async () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i + 1}`,
      arquivo_nome: `Arquivo ${String(i + 1).padStart(2, '0')}.pdf`,
      arquivo_tamanho: 100,
      criado_em: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00`,
    }));
    registroService.getAll.mockResolvedValue(muitos);
    renderizar();
    await screen.findByText('Arquivo 30.pdf');

    expect(linhas()).toHaveLength(25);
    expect(screen.getByText('Mostrando 1–25 de 30 arquivos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(nomes()).toEqual(['Arquivo 05.pdf', 'Arquivo 04.pdf', 'Arquivo 03.pdf', 'Arquivo 02.pdf', 'Arquivo 01.pdf']);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar arquivos' }), 'Arquivo');
    expect(screen.getByText('Mostrando 1–25 de 30 arquivos')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await userEvent.click(within(cabecalho('Nome')).getByRole('button'));
    expect(screen.getByText('Mostrando 1–25 de 30 arquivos')).toBeInTheDocument();
    expect(nomes()[0]).toBe('Arquivo 01.pdf');
  });

  it('baixa o arquivo e avisa quando falha', async () => {
    arquivoService.downloadFile.mockResolvedValueOnce().mockRejectedValueOnce({ response: { data: { message: 'Arquivo sumiu.' } } });
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha.xlsx' }));
    expect(arquivoService.downloadFile).toHaveBeenCalledWith('a1', 'f2', 'planilha.xlsx');

    await userEvent.click(screen.getByRole('button', { name: 'Baixar Contrato.pdf' }));
    expect(await screen.findByText('Arquivo sumiu.')).toBeInTheDocument();
  });

  it('clicar no nome abre o que dá para ver e baixa o resto', async () => {
    arquivoService.downloadFile.mockResolvedValue();
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByTitle('Baixar planilha.xlsx'));
    expect(arquivoService.downloadFile).toHaveBeenCalledWith('a1', 'f2', 'planilha.xlsx');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Visualizar Contrato.pdf'));
    const dialogo = screen.getByRole('dialog', { name: 'Contrato.pdf' });
    // Só os visualizáveis da lista, na ordem da tabela: foto.png e Contrato.pdf.
    expect(within(dialogo).getByText('2 KB · 2 de 2')).toBeInTheDocument();
    expect(arquivoService.obter).toHaveBeenCalledWith('a1', 'f1', expect.anything());

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Próximo arquivo' }));
    expect(screen.getByRole('dialog', { name: 'foto.png' })).toBeInTheDocument();

    await userEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Fechar' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('botão de visualizar abre o arquivo', async () => {
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Visualizar foto.png' }));
    expect(screen.getByRole('dialog', { name: 'foto.png' })).toBeInTheDocument();
  });

  it('exclui depois de confirmar e tira da lista', async () => {
    arquivoService.delete.mockResolvedValue({});
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Contrato.pdf' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir arquivo?' });
    expect(
      within(dialogo).getByText('"Contrato.pdf" será apagado para todos da equipe. Essa ação não pode ser desfeita.')
    ).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(arquivoService.delete).toHaveBeenCalledWith('a1', 'f1');
    expect(await screen.findByText('Arquivo excluído.')).toBeInTheDocument();
    expect(nomes()).toEqual(['foto.png', 'planilha.xlsx']);
  });

  it('falha ao excluir devolve o arquivo à lista', async () => {
    let rejeitar;
    arquivoService.delete.mockReturnValue(new Promise((_, r) => (rejeitar = r)));
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Contrato.pdf' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    // Sai da lista na hora.
    await waitFor(() => expect(nomes()).toEqual(['foto.png', 'planilha.xlsx']));

    await act(async () => rejeitar({ response: { data: { message: 'Sem permissão.' } } }));
    expect(await screen.findByText('Sem permissão.')).toBeInTheDocument();
    expect(nomes()).toEqual(['foto.png', 'planilha.xlsx', 'Contrato.pdf']);
  });

  it('cancelar a confirmação não exclui', async () => {
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Contrato.pdf' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(arquivoService.delete).not.toHaveBeenCalled();
    expect(nomes()).toHaveLength(3);
  });

  it('enviar pelo seletor põe o arquivo na lista', async () => {
    arquivoService.upload.mockResolvedValue({ id: 'f9', arquivo_nome: 'novo.txt', arquivo_tamanho: 4, criado_em: agora });
    renderizar();
    await esperarTabela();

    const clique = vi.spyOn(seletor(), 'click');
    await userEvent.click(screen.getByRole('button', { name: /Enviar arquivos/ }));
    expect(clique).toHaveBeenCalled();

    const arquivo = new File(['oi!!'], 'novo.txt', { type: 'text/plain' });
    await userEvent.upload(seletor(), arquivo);

    expect(arquivoService.upload).toHaveBeenCalledWith('a1', arquivo, expect.anything());
    await waitFor(() => expect(nomes()).toContain('novo.txt'));
    expect(seletor()).toHaveValue('');
  });

  it('arrastar arquivos mostra o aviso e soltar envia', async () => {
    arquivoService.upload.mockResolvedValue({ id: 'f9', arquivo_nome: 'solto.pdf', arquivo_tamanho: 4, criado_em: agora });
    renderizar();
    await esperarTabela();

    const arquivo = new File(['pdf!'], 'solto.pdf', { type: 'application/pdf' });
    const dataTransfer = { types: ['Files'], files: [arquivo], dropEffect: 'none' };

    fireEvent.dragEnter(window, { dataTransfer });
    expect(screen.getByText('Solte para enviar para “Documentos”')).toBeInTheDocument();
    fireEvent.dragOver(window, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('copy');

    // Sair de um elemento filho não esconde o aviso; sair de todos esconde.
    fireEvent.dragEnter(window, { dataTransfer });
    fireEvent.dragLeave(window, { dataTransfer });
    expect(screen.getByText('Solte para enviar para “Documentos”')).toBeInTheDocument();
    fireEvent.dragLeave(window, { dataTransfer });
    expect(screen.queryByText('Solte para enviar para “Documentos”')).not.toBeInTheDocument();

    fireEvent.dragEnter(window, { dataTransfer });
    fireEvent.drop(window, { dataTransfer });
    expect(screen.queryByText('Solte para enviar para “Documentos”')).not.toBeInTheDocument();
    await waitFor(() => expect(arquivoService.upload).toHaveBeenCalledWith('a1', arquivo, expect.anything()));
    await waitFor(() => expect(nomes()).toContain('solto.pdf'));
  });

  it('arrastar algo que não é arquivo não faz nada', async () => {
    renderizar();
    await esperarTabela();

    fireEvent.dragEnter(window, { dataTransfer: { types: ['text/plain'], files: [] } });
    expect(screen.queryByText(/Solte para enviar/)).not.toBeInTheDocument();
  });

  it('colar arquivos envia', async () => {
    arquivoService.upload.mockResolvedValue({ id: 'f9', arquivo_nome: 'colado.png', arquivo_tamanho: 4, criado_em: agora });
    renderizar();
    await esperarTabela();

    const arquivo = new File(['png!'], 'colado.png', { type: 'image/png' });
    fireEvent.paste(window, { clipboardData: { files: [arquivo] } });
    await waitFor(() => expect(arquivoService.upload).toHaveBeenCalledWith('a1', arquivo, expect.anything()));
  });

  it('com um diálogo aberto, soltar ou colar não envia', async () => {
    renderizar();
    await esperarTabela();

    await userEvent.click(screen.getByRole('button', { name: 'Visualizar foto.png' }));
    const arquivo = new File(['png!'], 'colado.png', { type: 'image/png' });
    const dataTransfer = { types: ['Files'], files: [arquivo], dropEffect: 'copy' };

    fireEvent.dragEnter(window, { dataTransfer });
    expect(screen.queryByText(/Solte para enviar/)).not.toBeInTheDocument();
    fireEvent.dragOver(window, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('none');
    fireEvent.drop(window, { dataTransfer });
    fireEvent.paste(window, { clipboardData: { files: [arquivo] } });
    expect(arquivoService.upload).not.toHaveBeenCalled();
  });
});
