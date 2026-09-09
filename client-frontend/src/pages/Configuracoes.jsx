import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { moduloService } from '../services/moduloService';
import { backupService, extrairErroBlob } from '../services/backupService';
import { MODULO_ICON_OPTIONS } from '../utils/iconOptions';
import { getAvatar, setAvatar, getLogo, setLogo, TAMANHO_MAXIMO_IMAGEM } from '../utils/avatarStorage';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'empresa', label: 'Empresa e Módulos' },
  { id: 'avancado', label: 'Avançado e Dados' },
];

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-light-text mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClass = 'w-full h-11 px-4 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors';

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
        className={`w-full h-full ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'} overflow-hidden bg-primary/10 flex items-center justify-center border border-divider`}
      >
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : fallback}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Alterar imagem"
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors border-2 border-white"
      >
        <span className="material-icons text-[16px]">photo_camera</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
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
      <form onSubmit={salvarPerfil} className="bg-white border border-divider rounded-2xl shadow-sm p-6 flex flex-col gap-6">
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
              <button type="button" onClick={handleRemoverFoto} className="text-xs text-red-600 hover:underline mt-2 font-medium">
                Remover foto
              </button>
            )}
          </div>
        </div>

        {erroImagem && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-xs flex items-center gap-2 border border-red-100 -mt-2">
            <span className="material-icons text-[16px] shrink-0">error_outline</span>
            {erroImagem}
          </div>
        )}

        <Field label="Nome completo">
          <input type="text" value={perfil.nome} onChange={(e) => handlePerfilChange('nome', e.target.value)} className={inputClass} />
        </Field>
        <Field label="E-mail">
          <input type="email" value={perfil.email} onChange={(e) => handlePerfilChange('email', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Telefone">
          <input type="text" value={perfil.telefone} onChange={(e) => handlePerfilChange('telefone', e.target.value)} placeholder="(00) 00000-0000" className={inputClass} />
        </Field>
        <Field label="LinkedIn">
          <input type="text" value={perfil.linkedin} onChange={(e) => handlePerfilChange('linkedin', e.target.value)} placeholder="linkedin.com/in/seu-perfil" className={inputClass} />
        </Field>
        <Field label="Bio">
          <textarea
            value={perfil.bio}
            onChange={(e) => handlePerfilChange('bio', e.target.value)}
            rows={3}
            placeholder="Uma breve descrição sobre você"
            className="w-full px-4 py-2.5 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors resize-none"
          />
        </Field>

        {avisoPerfil && (
          <div className="bg-amber-50 text-amber-700 p-3.5 rounded-lg text-xs flex items-center gap-2 border border-amber-100">
            <span className="material-icons text-[16px] shrink-0">info</span>
            {avisoPerfil}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="h-11 px-5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
            Salvar alterações
          </button>
        </div>
      </form>

      <form onSubmit={salvarSenha} className="bg-white border border-divider rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold">Segurança</h2>
          <p className="text-xs text-light-text mt-0.5">Atualize sua senha de acesso.</p>
        </div>

        <Field label="Senha atual">
          <input type="password" value={senhas.atual} onChange={(e) => handleSenhaChange('atual', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
          <input type="password" value={senhas.nova} onChange={(e) => handleSenhaChange('nova', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Confirmar nova senha">
          <input type="password" value={senhas.confirmar} onChange={(e) => handleSenhaChange('confirmar', e.target.value)} className={inputClass} />
        </Field>

        {erroSenha && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-xs flex items-center gap-2 border border-red-100">
            <span className="material-icons text-[16px] shrink-0">error_outline</span>
            {erroSenha}
          </div>
        )}
        {avisoSenha && (
          <div className="bg-amber-50 text-amber-700 p-3.5 rounded-lg text-xs flex items-center gap-2 border border-amber-100">
            <span className="material-icons text-[16px] shrink-0">info</span>
            {avisoSenha}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="h-11 px-5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
            Atualizar senha
          </button>
        </div>
      </form>
    </div>
  );
}

function EmpresaModulosTab() {
  const { empresa } = useAuth();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    moduloService.getAll()
      .then(setModulos)
      .catch(() => setError('Erro ao carregar os módulos.'))
      .finally(() => setLoading(false));
  }, []);

  const handleEscolherIcone = async (modulo, icone) => {
    setPickerAbertoId(null);
    if (icone === modulo.icone) return;

    setSalvandoId(modulo.id);
    const anterior = modulo.icone;
    setModulos((prev) => prev.map((m) => (m.id === modulo.id ? { ...m, icone } : m)));

    try {
      await moduloService.update(modulo.id, { icone });
    } catch (err) {
      setError('Erro ao atualizar o ícone do módulo.');
      setModulos((prev) => prev.map((m) => (m.id === modulo.id ? { ...m, icone: anterior } : m)));
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-white border border-divider rounded-2xl shadow-sm p-6">
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
              <button type="button" onClick={handleRemoverLogo} className="text-xs text-red-600 hover:underline mt-2 font-medium">
                Remover logo
              </button>
            )}
          </div>
        </div>

        {erroLogo && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-xs mb-4 flex items-center gap-2 border border-red-100">
            <span className="material-icons text-[16px] shrink-0">error_outline</span>
            {erroLogo}
          </div>
        )}

        <div className="w-full h-11 px-4 border border-divider rounded-lg bg-background/60 flex items-center text-sm text-gray-700">
          {empresa?.nome || 'Carregando...'}
        </div>
        <p className="text-[11px] text-light-text mt-1.5">Edição do nome da empresa ainda não está disponível.</p>
      </div>

      <div className="bg-white border border-divider rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-0.5">Aparência dos módulos</h2>
        <p className="text-xs text-light-text mb-4">O ícone escolhido aqui aparece para toda a equipe.</p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-xs mb-4 flex items-center gap-2 border border-red-100">
            <span className="material-icons text-[16px] shrink-0">error_outline</span>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-background animate-pulse" />)}
          </div>
        ) : modulos.length === 0 ? (
          <p className="text-sm text-light-text text-center py-8">Nenhum módulo criado ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {modulos.map((modulo) => (
              <div key={modulo.id} className="border border-divider rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-icons text-primary text-[18px]">{modulo.icone || 'extension'}</span>
                  </div>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">{modulo.nome}</span>
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
                  <div className="mt-3 grid grid-cols-8 gap-2 p-3 border border-divider rounded-lg bg-background/40">
                    {MODULO_ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => handleEscolherIcone(modulo, icon)}
                        title={icon}
                        className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                          modulo.icone === icon
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white border border-divider text-light-text hover:border-primary hover:text-primary'
                        }`}
                      >
                        <span className="material-icons text-[18px]">{icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AvancadoDadosTab() {
  const [modulos, setModulos] = useState([]);
  const [moduloSelecionado, setModuloSelecionado] = useState('');
  const [exportandoJson, setExportandoJson] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    moduloService.getAll().then(setModulos).catch(() => {});
  }, []);

  const handleExportarJson = async () => {
    setErro('');
    setSucesso('');
    setExportandoJson(true);
    try {
      await backupService.exportarJson();
      setSucesso('Backup JSON baixado com sucesso.');
    } catch (err) {
      setErro(await extrairErroBlob(err));
    } finally {
      setExportandoJson(false);
    }
  };

  const handleExportarCsv = async () => {
    if (!moduloSelecionado) return;
    setErro('');
    setSucesso('');
    setExportandoCsv(true);
    try {
      const modulo = modulos.find((m) => String(m.id) === String(moduloSelecionado));
      await backupService.exportarCsv(moduloSelecionado, modulo?.nome || 'modulo');
      setSucesso('CSV exportado com sucesso.');
    } catch (err) {
      setErro(await extrairErroBlob(err));
    } finally {
      setExportandoCsv(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-white border border-divider rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-0.5">Exportar dados</h2>
        <p className="text-xs text-light-text mb-4">Baixe uma cópia dos dados da sua empresa.</p>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-xs mb-4 flex items-center gap-2 border border-red-100">
            <span className="material-icons text-[16px] shrink-0">error_outline</span>
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-lg text-xs mb-4 flex items-center gap-2 border border-emerald-100">
            <span className="material-icons text-[16px] shrink-0">check_circle</span>
            {sucesso}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 p-4 border border-divider rounded-xl">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <span className="material-icons text-amber-600 text-[22px]">data_object</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Backup completo (JSON)</p>
                <p className="text-xs text-light-text mt-0.5">Todos os módulos, registros e configurações da empresa.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportarJson}
              disabled={exportandoJson}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-divider hover:bg-background transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span className="material-icons text-[17px]">download</span>
              {exportandoJson ? 'Exportando...' : 'Exportar JSON'}
            </button>
          </div>

          <div className="p-4 border border-divider rounded-xl">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="material-icons text-emerald-600 text-[22px]">table_view</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Registros de um módulo (CSV)</p>
                <p className="text-xs text-light-text mt-0.5">Compatível com Excel e Google Sheets.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <select
                  value={moduloSelecionado}
                  onChange={(e) => setModuloSelecionado(e.target.value)}
                  className="w-full h-10 appearance-none pl-3.5 pr-8 border border-divider rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Selecione um módulo</option>
                  {modulos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-light-text pointer-events-none">expand_more</span>
              </div>
              <button
                type="button"
                onClick={handleExportarCsv}
                disabled={!moduloSelecionado || exportandoCsv}
                className="h-10 px-4 rounded-lg text-sm font-medium border border-divider hover:bg-background transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons text-[17px]">download</span>
                {exportandoCsv ? 'Exportando...' : 'Exportar CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>
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

        <div className="border-b border-divider flex justify-center gap-8 mb-6 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'text-primary border-primary'
                  : 'text-light-text border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'perfil' && <PerfilTab />}
        {tab === 'empresa' && <EmpresaModulosTab />}
        {tab === 'avancado' && <AvancadoDadosTab />}
      </div>
    </Layout>
  );
}
