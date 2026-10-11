import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Button, Input, Textarea, Select, Alert, Card, Skeleton, EmptyState, ErrorState } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { moduloService } from '../services/moduloService';
import { useModulos, queryKeys } from '../hooks/queries';
import { useToast } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';
import { mascararTelefone } from '../utils/masks';
import { backupService, extrairErroBlob } from '../services/backupService';
import { MODULO_ICON_OPTIONS } from '../utils/iconOptions';
import { getAvatar, setAvatar, getLogo, setLogo, TAMANHO_MAXIMO_IMAGEM } from '../utils/avatarStorage';

const SEM_DADOS = [];

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'empresa', label: 'Empresa e Tabelas' },
  { id: 'avancado', label: 'Avançado e Dados' },
];

function ImageUploader({ value, onChange, shape = 'circle', size = 96, fallback, onError }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError?.('Escolha um arquivo de imagem.');
      return;
    }
    if (file.size > TAMANHO_MAXIMO_IMAGEM) {
      onError?.('A imagem precisa ter no máximo 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'} overflow-hidden bg-primary-100 flex items-center justify-center border border-divider`}
      >
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : fallback}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Alterar imagem"
        aria-label="Alterar imagem"
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-600 transition-colors border-2 border-surface"
      >
        <span className="material-icons text-[16px]" aria-hidden="true">photo_camera</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} tabIndex={-1} aria-hidden="true" />
    </div>
  );
}

function PerfilTab() {
  const { usuario, iniciais } = useAuth();

  const [perfil, setPerfil] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    telefone: '',
    linkedin: '',
    bio: '',
  });
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmar: '' });
  const [avisoPerfil, setAvisoPerfil] = useState('');
  const [avisoSenha, setAvisoSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [erroImagem, setErroImagem] = useState('');
  const [foto, setFoto] = useState(() => getAvatar(usuario?.id));

  const handlePerfilChange = (campo, valor) => setPerfil((prev) => ({ ...prev, [campo]: valor }));
  const handleSenhaChange = (campo, valor) => setSenhas((prev) => ({ ...prev, [campo]: valor }));

  const handleFotoChange = (dataUrl) => {
    setErroImagem('');
    setFoto(dataUrl);
    setAvatar(usuario?.id, dataUrl);
  };

  const handleRemoverFoto = () => {
    setFoto(null);
    setAvatar(usuario?.id, null);
  };

  const salvarPerfil = (e) => {
    e.preventDefault();
    setAvisoPerfil('Alterações mantidas nesta sessão. O backend ainda não expõe um endpoint para salvar o perfil.');
  };

  const salvarSenha = (e) => {
    e.preventDefault();
    setErroSenha('');
    setAvisoSenha('');

    if (senhas.nova.length < 8) {
      setErroSenha('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (senhas.nova !== senhas.confirmar) {
      setErroSenha('A confirmação não corresponde à nova senha.');
      return;
    }

    setAvisoSenha('O backend ainda não expõe um endpoint para troca de senha — nada foi enviado ao servidor.');
    setSenhas({ atual: '', nova: '', confirmar: '' });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card as="form" onSubmit={salvarPerfil} className="flex flex-col gap-6">
        <div className="flex items-center gap-5">
          <ImageUploader
            value={foto}
            onChange={handleFotoChange}
            onError={setErroImagem}
            fallback={<span className="text-2xl font-bold text-primary">{iniciais}</span>}
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Informações do perfil</h2>
            <p className="text-xs text-light-text mt-0.5">Como seu nome, foto e contato aparecem para a equipe.</p>
            {foto && (
              <button type="button" onClick={handleRemoverFoto} className="text-xs text-danger hover:underline mt-2 font-medium">
                Remover foto
              </button>
            )}
          </div>
        </div>

        {erroImagem && <Alert variant="error" className="-mt-2">{erroImagem}</Alert>}

        <Input label="Nome completo" name="nome" autoComplete="name" type="text" value={perfil.nome} onChange={(e) => handlePerfilChange('nome', e.target.value)} />
        <Input label="E-mail" name="email" autoComplete="email" inputMode="email" type="email" value={perfil.email} onChange={(e) => handlePerfilChange('email', e.target.value)} />
        <Input label="Telefone" name="telefone" autoComplete="tel" inputMode="tel" type="tel" value={perfil.telefone} onChange={(e) => handlePerfilChange('telefone', mascararTelefone(e.target.value))} placeholder="(00) 00000-0000" />
        <Input label="LinkedIn" name="linkedin" autoComplete="off" type="text" value={perfil.linkedin} onChange={(e) => handlePerfilChange('linkedin', e.target.value)} placeholder="linkedin.com/in/seu-perfil" />
        <Textarea label="Bio" value={perfil.bio} onChange={(e) => handlePerfilChange('bio', e.target.value)} rows={3} placeholder="Uma breve descrição sobre você" />

        {avisoPerfil && <Alert variant="warning">{avisoPerfil}</Alert>}

        <div className="flex justify-end">
          <Button type="submit">Salvar alterações</Button>
        </div>
      </Card>

      <Card as="form" onSubmit={salvarSenha} className="flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold">Segurança</h2>
          <p className="text-xs text-light-text mt-0.5">Atualize sua senha de acesso.</p>
        </div>

        <Input label="Senha atual" name="senha_atual" autoComplete="current-password" type="password" value={senhas.atual} onChange={(e) => handleSenhaChange('atual', e.target.value)} />
        <Input label="Nova senha" name="nova_senha" autoComplete="new-password" type="password" hint="Mínimo de 8 caracteres." value={senhas.nova} onChange={(e) => handleSenhaChange('nova', e.target.value)} />
        <Input label="Confirmar nova senha" name="confirmar_senha" autoComplete="new-password" type="password" value={senhas.confirmar} onChange={(e) => handleSenhaChange('confirmar', e.target.value)} />

        {erroSenha && <Alert variant="error">{erroSenha}</Alert>}
        {avisoSenha && <Alert variant="warning">{avisoSenha}</Alert>}

        <div className="flex justify-end">
          <Button type="submit">Atualizar senha</Button>
        </div>
      </Card>
    </div>
  );
}

function EmpresaModulosTab() {
  const { empresa } = useAuth();
  const queryClient = useQueryClient();
  const modulosQuery = useModulos();
  const modulos = modulosQuery.data ?? SEM_DADOS;
  const loading = modulosQuery.isLoading;
  const [pickerAbertoId, setPickerAbertoId] = useState(null);
  const [salvandoId, setSalvandoId] = useState(null);
  const [error, setError] = useState('');
  const [erroLogo, setErroLogo] = useState('');
  const [logo, setLogoState] = useState(() => getLogo(empresa?.id));

  const handleLogoChange = (dataUrl) => {
    setErroLogo('');
    setLogoState(dataUrl);
    setLogo(empresa?.id, dataUrl);
  };

  const handleRemoverLogo = () => {
    setLogoState(null);
    setLogo(empresa?.id, null);
  };

  const trocarIconeNoCache = (moduloId, icone) =>
    queryClient.setQueryData(queryKeys.modulos, (atual) =>
      atual?.map((m) => (m.id === moduloId ? { ...m, icone } : m))
    );

  const handleEscolherIcone = async (modulo, icone) => {
    setPickerAbertoId(null);
    if (icone === modulo.icone) return;

    setSalvandoId(modulo.id);
    setError('');
    const anterior = modulo.icone;
    trocarIconeNoCache(modulo.id, icone);

    try {
      await moduloService.update(modulo.id, { icone });
    } catch (err) {
      setError(mensagemDeErro(err, 'Erro ao atualizar o ícone da tabela.'));
      trocarIconeNoCache(modulo.id, anterior);
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <div className="flex items-center gap-5 mb-5">
          <ImageUploader
            value={logo}
            onChange={handleLogoChange}
            onError={setErroLogo}
            shape="square"
            fallback={<span className="material-icons text-3xl text-primary">business</span>}
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Empresa</h2>
            <p className="text-xs text-light-text mt-0.5">Identidade visual usada por toda a equipe.</p>
            {logo && (
              <button type="button" onClick={handleRemoverLogo} className="text-xs text-danger hover:underline mt-2 font-medium">
                Remover logo
              </button>
            )}
          </div>
        </div>

        {erroLogo && <Alert variant="error" className="mb-4">{erroLogo}</Alert>}

        <div className="w-full h-11 px-4 border border-divider rounded-lg bg-background flex items-center text-sm text-ink-soft">
          {empresa?.nome || 'Carregando...'}
        </div>
        <p className="text-2xs text-light-text mt-1.5">Edição do nome da empresa ainda não está disponível.</p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold mb-0.5">Aparência das tabelas</h2>
        <p className="text-xs text-light-text mb-4">O ícone escolhido aqui aparece para toda a equipe.</p>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {modulosQuery.isError && !modulosQuery.data ? (
          <ErrorState
            size="sm"
            description={mensagemDeErro(modulosQuery.error, 'Erro ao carregar as tabelas.')}
            onRetry={() => modulosQuery.refetch()}
            className="py-6"
          />
        ) : loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : modulos.length === 0 ? (
          <EmptyState
            size="sm"
            icon="widgets"
            title="Nenhuma tabela criada ainda"
            description="Quando você criar uma tabela, o ícone dela pode ser personalizado por aqui."
            className="py-6"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {modulos.map((modulo) => (
              <div key={modulo.id} className="border border-divider rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="material-icons text-primary text-[18px]" aria-hidden="true">{modulo.icone || 'extension'}</span>
                  </div>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-ink">{modulo.nome}</span>
                  <button
                    type="button"
                    onClick={() => setPickerAbertoId(pickerAbertoId === modulo.id ? null : modulo.id)}
                    disabled={salvandoId === modulo.id}
                    className="text-xs text-primary font-medium hover:underline shrink-0 disabled:opacity-50"
                  >
                    {salvandoId === modulo.id ? 'Salvando...' : (pickerAbertoId === modulo.id ? 'Fechar' : 'Alterar ícone')}
                  </button>
                </div>

                {pickerAbertoId === modulo.id && (
                  <div className="mt-3 grid grid-cols-8 gap-2 p-3 border border-divider rounded-lg bg-background">
                    {MODULO_ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => handleEscolherIcone(modulo, icon)}
                        title={icon}
                        aria-label={`Usar o ícone ${icon}`}
                        aria-pressed={modulo.icone === icon}
                        className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                          modulo.icone === icon
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface border border-divider text-light-text hover:border-primary hover:text-primary'
                        }`}
                      >
                        <span className="material-icons text-[18px]" aria-hidden="true">{icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AvancadoDadosTab() {
  const toast = useToast();
  const modulos = useModulos().data ?? SEM_DADOS;
  const [moduloSelecionado, setModuloSelecionado] = useState('');
  const [exportandoJson, setExportandoJson] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [erro, setErro] = useState('');

  const handleExportarJson = async () => {
    setErro('');
    setExportandoJson(true);
    try {
      await backupService.exportarJson();
      toast.success('Backup JSON baixado com sucesso.');
    } catch (err) {
      setErro(await extrairErroBlob(err));
    } finally {
      setExportandoJson(false);
    }
  };

  const handleExportarCsv = async () => {
    if (!moduloSelecionado) return;
    setErro('');
    setExportandoCsv(true);
    try {
      const modulo = modulos.find((m) => String(m.id) === String(moduloSelecionado));
      await backupService.exportarCsv(moduloSelecionado, modulo?.nome || 'modulo');
      toast.success('CSV exportado com sucesso.');
    } catch (err) {
      setErro(await extrairErroBlob(err));
    } finally {
      setExportandoCsv(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <h2 className="text-base font-semibold mb-0.5">Exportar dados</h2>
        <p className="text-xs text-light-text mb-4">Baixe uma cópia dos dados da sua empresa.</p>

        {erro && <Alert variant="error" className="mb-4">{erro}</Alert>}

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 p-4 border border-divider rounded-xl">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-warning-bg flex items-center justify-center shrink-0">
                <span className="material-icons text-warning text-[22px]" aria-hidden="true">data_object</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Backup completo (JSON)</p>
                <p className="text-xs text-light-text mt-0.5">Todas as tabelas, itens e configurações da empresa.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon="download" onClick={handleExportarJson} loading={exportandoJson}>
              {exportandoJson ? 'Exportando...' : 'Exportar JSON'}
            </Button>
          </div>

          <div className="p-4 border border-divider rounded-xl">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-xl bg-success-bg flex items-center justify-center shrink-0">
                <span className="material-icons text-success text-[22px]" aria-hidden="true">table_view</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Itens de uma tabela (CSV)</p>
                <p className="text-xs text-light-text mt-0.5">Compatível com Excel e Google Sheets.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select
                  value={moduloSelecionado}
                  onChange={(e) => setModuloSelecionado(e.target.value)}
                  aria-label="Tabela para exportar"
                  placeholder="Selecione uma tabela"
                  options={modulos.map((m) => ({ value: m.id, label: m.nome }))}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="download"
                onClick={handleExportarCsv}
                disabled={!moduloSelecionado || exportandoCsv}
                loading={exportandoCsv}
              >
                {exportandoCsv ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Configuracoes() {
  const [tab, setTab] = useState('perfil');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        <header className="mb-6 shrink-0 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-light-text mt-0.5">Gerencie seu perfil, a empresa e os dados da conta</p>
        </header>

        <div role="tablist" aria-label="Seções de configuração" className="border-b border-divider flex justify-center gap-4 sm:gap-8 mb-6 shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`aba-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`painel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'text-primary border-primary'
                  : 'text-light-text border-transparent hover:text-ink-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id={`painel-${tab}`} role="tabpanel" aria-labelledby={`aba-${tab}`}>
          {tab === 'perfil' && <PerfilTab />}
          {tab === 'empresa' && <EmpresaModulosTab />}
          {tab === 'avancado' && <AvancadoDadosTab />}
        </div>
      </div>
    </Layout>
  );
}
