import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '../context/FeedbackProvider';
import { AuthContext } from '../context/authContext';
import Configuracoes from './Configuracoes';
import { moduloService } from '../services/moduloService';
import { backupService } from '../services/backupService';

// O Layout (menu, notificações, seletor de equipe) não faz parte do que se testa aqui.
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../services/moduloService', () => ({ moduloService: { getAll: vi.fn(), update: vi.fn() } }));
vi.mock('../services/backupService', async (importOriginal) => ({
  ...(await importOriginal()),
  backupService: { exportarJson: vi.fn(), exportarCsv: vi.fn() },
}));

const MODULOS = [
  { id: 'm1', nome: 'Clientes', icone: 'group' },
  { id: 'm2', nome: 'Estoque' },
];

const USUARIO = { id: 'u1', nome: 'Ana Souza', email: 'ana@acme.com' };
const EMPRESA = { id: 'e1', nome: 'Acme Contábil' };

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const resultado = render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <AuthContext.Provider value={{ usuario: USUARIO, iniciais: 'AS', empresa: EMPRESA }}>
          <Configuracoes />
        </AuthContext.Provider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
  return { ...resultado, client };
}

const painel = () => screen.getByRole('tabpanel');
const entradaDeArquivo = () => painel().querySelector('input[type="file"]');
const imagem = (tipo = 'image/png', tamanho = 10) => new File(['x'.repeat(tamanho)], 'foto.png', { type: tipo });

async function abrirAba(nome) {
  await userEvent.click(screen.getByRole('tab', { name: nome }));
}

describe('Configuracoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    moduloService.getAll.mockResolvedValue(MODULOS);
    moduloService.update.mockResolvedValue({});
    backupService.exportarJson.mockResolvedValue();
    backupService.exportarCsv.mockResolvedValue();
  });

  it('abre no perfil e alterna entre as abas', async () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Perfil' })).toHaveAttribute('aria-selected', 'true');
    expect(painel()).toHaveAttribute('id', 'painel-perfil');
    expect(within(painel()).getByRole('heading', { name: 'Informações do perfil' })).toBeInTheDocument();

    await abrirAba('Empresa e tabelas');
    expect(screen.getByRole('tab', { name: 'Empresa e tabelas' })).toHaveAttribute('aria-selected', 'true');
    expect(painel()).toHaveAttribute('aria-labelledby', 'aba-empresa');
    expect(within(painel()).getByRole('heading', { name: 'Empresa' })).toBeInTheDocument();

    await abrirAba('Avançado e dados');
    expect(within(painel()).getByRole('heading', { name: 'Exportar dados' })).toBeInTheDocument();
  });

  describe('Perfil', () => {
    it('preenche com os dados da pessoa, aplica a máscara de telefone e avisa ao salvar', async () => {
      renderizar();
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza');
      expect(screen.getByLabelText('E-mail')).toHaveValue('ana@acme.com');
      expect(screen.getByText('AS')).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText('Telefone'), '11987654321');
      expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98765-4321');

      await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
      expect(
        screen.getByText('Alterações mantidas nesta sessão. O backend ainda não expõe um endpoint para salvar o perfil.')
      ).toBeInTheDocument();
    });

    it('valida a nova senha e limpa os campos quando está ok', async () => {
      renderizar();
      const atualizar = screen.getByRole('button', { name: 'Atualizar senha' });

      await userEvent.type(screen.getByLabelText('Nova senha'), 'curta');
      await userEvent.click(atualizar);
      expect(screen.getByText('A nova senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText('Nova senha'));
      await userEvent.type(screen.getByLabelText('Nova senha'), 'senhaforte1');
      await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'senhaforte2');
      await userEvent.click(atualizar);
      expect(screen.getByText('A confirmação não corresponde à nova senha.')).toBeInTheDocument();
      expect(screen.queryByText('A nova senha precisa ter pelo menos 8 caracteres.')).not.toBeInTheDocument();

      await userEvent.type(screen.getByLabelText('Senha atual'), 'antiga123');
      await userEvent.clear(screen.getByLabelText('Confirmar nova senha'));
      await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'senhaforte1');
      await userEvent.click(atualizar);
      expect(
        screen.getByText('O backend ainda não expõe um endpoint para troca de senha — nada foi enviado ao servidor.')
      ).toBeInTheDocument();
      expect(screen.queryByText('A confirmação não corresponde à nova senha.')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Senha atual')).toHaveValue('');
      expect(screen.getByLabelText('Nova senha')).toHaveValue('');
      expect(screen.getByLabelText('Confirmar nova senha')).toHaveValue('');
    });

    it('recusa arquivo que não é imagem ou maior que 2 MB', () => {
      renderizar();
      fireEvent.change(entradaDeArquivo(), { target: { files: [imagem('application/pdf')] } });
      expect(screen.getByText('Escolha um arquivo de imagem.')).toBeInTheDocument();

      fireEvent.change(entradaDeArquivo(), { target: { files: [imagem('image/png', 2 * 1024 * 1024 + 1)] } });
      expect(screen.getByText('A imagem precisa ter no máximo 2 MB.')).toBeInTheDocument();
      expect(localStorage.getItem('levit_avatar_u1')).toBeNull();
    });

    it('troca a foto, guarda no navegador e permite remover', async () => {
      renderizar();
      fireEvent.change(entradaDeArquivo(), { target: { files: [imagem('application/pdf')] } });
      fireEvent.change(entradaDeArquivo(), { target: { files: [imagem()] } });

      await waitFor(() => expect(painel().querySelector('img')).toBeInTheDocument());
      expect(painel().querySelector('img').getAttribute('src')).toMatch(/^data:image\/png;base64,/);
      expect(localStorage.getItem('levit_avatar_u1')).toMatch(/^data:image\/png/);
      expect(screen.queryByText('Escolha um arquivo de imagem.')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
      expect(painel().querySelector('img')).not.toBeInTheDocument();
      expect(localStorage.getItem('levit_avatar_u1')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument();
    });

    it('carrega a foto já guardada', () => {
      localStorage.setItem('levit_avatar_u1', 'data:image/png;base64,AAA');
      renderizar();
      expect(painel().querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,AAA');
    });
  });

  describe('Empresa e tabelas', () => {
    it('mostra o nome da empresa e troca o logo', async () => {
      renderizar();
      await abrirAba('Empresa e tabelas');
      expect(screen.getByText('Acme Contábil')).toBeInTheDocument();
      expect(screen.getByText('Edição do nome da empresa ainda não está disponível.')).toBeInTheDocument();

      fireEvent.change(entradaDeArquivo(), { target: { files: [imagem('text/plain')] } });
      expect(screen.getByText('Escolha um arquivo de imagem.')).toBeInTheDocument();

      fireEvent.change(entradaDeArquivo(), { target: { files: [imagem()] } });
      await waitFor(() => expect(localStorage.getItem('levit_logo_e1')).toMatch(/^data:image\/png/));
      expect(screen.queryByText('Escolha um arquivo de imagem.')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Remover logo' }));
      expect(localStorage.getItem('levit_logo_e1')).toBeNull();
    });

    it('lista as tabelas e troca o ícone de uma delas', async () => {
      let resolver;
      moduloService.update.mockReturnValue(new Promise((r) => (resolver = r)));
      renderizar();
      await abrirAba('Empresa e tabelas');

      const linha = (await screen.findByText('Clientes')).closest('li');
      expect(within(linha).getByText('group')).toBeInTheDocument();
      const linhaEstoque = screen.getByText('Estoque').closest('li');
      expect(within(linhaEstoque).getByText('extension')).toBeInTheDocument();

      await userEvent.click(within(linha).getByRole('button', { name: 'Alterar ícone' }));
      expect(within(linha).getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
      expect(within(linha).getByRole('button', { name: 'Usar o ícone group' })).toHaveAttribute('aria-pressed', 'true');

      // Escolher o mesmo ícone só fecha.
      await userEvent.click(within(linha).getByRole('button', { name: 'Usar o ícone group' }));
      expect(moduloService.update).not.toHaveBeenCalled();
      expect(within(linha).queryByRole('button', { name: /Usar o ícone/ })).not.toBeInTheDocument();

      await userEvent.click(within(linha).getByRole('button', { name: 'Alterar ícone' }));
      await userEvent.click(within(linha).getByRole('button', { name: 'Usar o ícone star' }));
      expect(moduloService.update).toHaveBeenCalledWith('m1', { icone: 'star' });
      expect(within(linha).getByRole('button', { name: 'Salvando...' })).toBeDisabled();
      expect(within(linha).getByText('star')).toBeInTheDocument();

      resolver({});
      expect(await within(linha).findByRole('button', { name: 'Alterar ícone' })).toBeEnabled();
      expect(within(linha).getByText('star')).toBeInTheDocument();
    });

    it('desfaz o ícone e mostra o erro quando o servidor recusa', async () => {
      moduloService.update.mockRejectedValue({ response: { status: 403, data: { message: 'Sem permissão.' } } });
      renderizar();
      await abrirAba('Empresa e tabelas');

      const linha = (await screen.findByText('Clientes')).closest('li');
      await userEvent.click(within(linha).getByRole('button', { name: 'Alterar ícone' }));
      await userEvent.click(within(linha).getByRole('button', { name: 'Usar o ícone star' }));

      expect(await screen.findByText('Sem permissão.')).toBeInTheDocument();
      expect(within(linha).getByText('group')).toBeInTheDocument();
      expect(within(linha).queryByText('star')).not.toBeInTheDocument();
    });

    it('mostra o estado vazio sem tabelas', async () => {
      moduloService.getAll.mockResolvedValue([]);
      renderizar();
      await abrirAba('Empresa e tabelas');
      expect(await screen.findByText('Nenhuma tabela criada ainda')).toBeInTheDocument();
    });

    it('mostra erro ao carregar as tabelas e tenta de novo', async () => {
      moduloService.getAll.mockRejectedValue({ response: { status: 500 } });
      renderizar();
      await abrirAba('Empresa e tabelas');

      expect(await screen.findByText('Erro ao carregar as tabelas.')).toBeInTheDocument();
      moduloService.getAll.mockResolvedValue(MODULOS);
      await userEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
      expect(await screen.findByText('Clientes')).toBeInTheDocument();
    });
  });

  describe('Avançado e dados', () => {
    it('exporta o backup completo em JSON', async () => {
      renderizar();
      await abrirAba('Avançado e dados');
      await userEvent.click(screen.getByRole('button', { name: /Exportar JSON/ }));

      expect(backupService.exportarJson).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('Backup JSON baixado com sucesso.')).toBeInTheDocument();
    });

    it('mostra o erro devolvido pelo servidor ao exportar', async () => {
      backupService.exportarJson.mockRejectedValue({
        response: { data: new Blob([JSON.stringify({ message: 'Sem permissão para exportar.' })]) },
      });
      renderizar();
      await abrirAba('Avançado e dados');
      await userEvent.click(screen.getByRole('button', { name: /Exportar JSON/ }));

      expect(await within(painel()).findByText('Sem permissão para exportar.')).toBeInTheDocument();
    });

    it('exporta os itens de uma tabela em CSV depois de escolher a tabela', async () => {
      renderizar();
      await abrirAba('Avançado e dados');
      const exportarCsv = screen.getByRole('button', { name: /Exportar CSV/ });
      expect(exportarCsv).toBeDisabled();

      const seletor = screen.getByLabelText('Tabela para exportar');
      await screen.findByRole('option', { name: 'Estoque' });
      await userEvent.selectOptions(seletor, 'm2');
      expect(exportarCsv).toBeEnabled();
      await userEvent.click(exportarCsv);

      expect(backupService.exportarCsv).toHaveBeenCalledWith('m2', 'Estoque');
      expect(await screen.findByText('CSV exportado com sucesso.')).toBeInTheDocument();
    });

    it('mostra o erro ao exportar CSV', async () => {
      backupService.exportarCsv.mockRejectedValue({ response: { data: { message: 'Tabela sem itens.' } } });
      renderizar();
      await abrirAba('Avançado e dados');
      await screen.findByRole('option', { name: 'Clientes' });
      await userEvent.selectOptions(screen.getByLabelText('Tabela para exportar'), 'm1');
      await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

      expect(await within(painel()).findByText('Tabela sem itens.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeEnabled();
    });
  });
});
