import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAvatar } from '../utils/avatarStorage';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { preloadRoute } from '../routes/lazyPages';
import { prefetchDadosDaRota } from '../hooks/queries';
import Avatar from './ui/Avatar';
import BotaoNotificacoes from './notificacoes/BotaoNotificacoes';
import PainelNotificacoes from './notificacoes/PainelNotificacoes';
import { useNaoLidas } from '../hooks/useNotificacoes';

const NAV_GROUPS = [
  {
    items: [{ name: 'Início', path: '/dashboard', icon: 'space_dashboard' }],
  },
  {
    label: 'Organizar',
    items: [
      { name: 'Tabelas', path: '/modulos', icon: 'table_chart' },
      { name: 'Recrutamento', path: '/recrutamento', icon: 'person_search' },
      { name: 'Automações', path: '/automacoes', icon: 'bolt' },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { name: 'Equipe', path: '/team', icon: 'groups' },
      { name: 'Relatórios', path: '/relatorios', icon: 'description' },
    ],
  },
  {
    items: [{ name: 'Configurações', path: '/configuracoes', icon: 'settings' }],
  },
];

const SIDEBAR_KEY = 'levit_sidebar';

function lerSidebarRecolhida() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

function salvarSidebarRecolhida(recolhida) {
  try {
    localStorage.setItem(SIDEBAR_KEY, recolhida ? 'collapsed' : 'expanded');
  } catch {
    // Armazenamento indisponível (modo privado): a preferência só não persiste.
  }
}

export default function Layout({ children, noPadding = false }) {
  const { usuario, empresa, iniciais, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [collapsed, setCollapsed] = useState(lerSidebarRecolhida);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const naoLidas = useNaoLidas();
  const avatar = getAvatar(usuario?.id);

  const abrirNotificacoes = () => {
    setMobileOpen(false);
    setNotificacoesAbertas(true);
  };

  // No celular o menu é sempre completo (gaveta); recolher só existe no desktop.
  const sidebarOpen = !isDesktop || !collapsed;
  const drawerClosed = !isDesktop && !mobileOpen;

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const alternarSidebar = (recolher) => {
    setCollapsed(recolher);
    salvarSidebarRecolhida(recolher);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Código da página e dados dela começam a carregar antes do clique.
  const preCarregar = (path) => {
    preloadRoute(path);
    prefetchDadosDaRota(path);
  };

  const renderNavItem = (item) => {
    // "/modulos" não deve acender em "/modulosX": compara o segmento inteiro.
    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

    return (
      <Link
        key={item.path}
        to={item.path}
        title={sidebarOpen ? undefined : item.name}
        aria-label={item.name}
        aria-current={isActive ? 'page' : undefined}
        onMouseEnter={() => preCarregar(item.path)}
        onFocus={() => preCarregar(item.path)}
        onClick={() => setMobileOpen(false)}
        className={`group relative flex items-center rounded-lg transition-colors duration-150 ${
          sidebarOpen ? 'gap-3 mx-3 px-3 py-2.5' : 'mx-2 h-11 w-11 justify-center'
        } ${
          isActive
            ? 'bg-primary text-white shadow-xs animate-nav-active'
            : 'text-light-text hover:bg-primary-100 hover:text-primary-700'
        }`}
      >
        <span className="material-icons text-[20px] leading-none shrink-0" aria-hidden="true">{item.icon}</span>
        {sidebarOpen && <span className="text-sm font-medium truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className="h-screen flex bg-background font-sans text-ink-soft overflow-hidden">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {/* Fundo da gaveta (celular) */}
      {!isDesktop && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-primary-900/25 animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        inert={drawerClosed}
        aria-label="Menu principal"
        className={`${
          collapsed ? 'md:w-[68px]' : 'md:w-64'
        } w-64 bg-sidebar border-r border-divider flex flex-col justify-between shrink-0 transition-[width,transform] duration-200 ease-out-quart fixed inset-y-0 left-0 z-40 md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'
        }`}
      >
        <div className="min-h-0 flex flex-col">
          {/* Identidade da empresa */}
          <div className={`h-[68px] flex items-center shrink-0 ${sidebarOpen ? 'px-4' : 'px-3 justify-center'}`}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src="/Logo.png" alt="" className="h-8 w-8 object-contain shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate leading-tight">
                      {empresa?.nome || 'Levit'}
                    </p>
                    <p className="text-2xs text-light-text truncate">Espaço da equipe</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (isDesktop ? alternarSidebar(true) : setMobileOpen(false))}
                  title={isDesktop ? 'Recolher menu' : 'Fechar menu'}
                  aria-label={isDesktop ? 'Recolher menu' : 'Fechar menu'}
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors shrink-0"
                >
                  <span className="material-icons text-[18px]" aria-hidden="true">{isDesktop ? 'menu_open' : 'close'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => alternarSidebar(false)}
                title="Expandir menu"
                aria-label="Expandir menu"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors"
              >
                <span className="material-icons text-[20px]" aria-hidden="true">menu</span>
              </button>
            )}
          </div>

          {/* Navegação */}
          <nav aria-label="Principal" className="flex-1 overflow-y-auto py-2 flex flex-col gap-1">
            {NAV_GROUPS.map((group, index) => (
              <div key={index} className={index > 0 ? 'mt-4' : ''}>
                {group.label && sidebarOpen && (
                  <p className="px-6 pb-1.5 text-2xs font-semibold uppercase tracking-wide text-light-text">
                    {group.label}
                  </p>
                )}
                {group.label && !sidebarOpen && index > 0 && (
                  <hr className="mx-4 mb-2 border-divider" />
                )}
                <div className="flex flex-col gap-0.5">{group.items.map(renderNavItem)}</div>
              </div>
            ))}
          </nav>
        </div>

        {/* Notificações */}
        <div className={`shrink-0 ${sidebarOpen ? 'px-3 pb-2' : 'px-2 pb-2 flex justify-center'}`}>
          <BotaoNotificacoes
            naoLidas={naoLidas}
            onClick={abrirNotificacoes}
            aberto={notificacoesAbertas}
            compacto={!sidebarOpen}
            className={sidebarOpen ? '' : 'w-11 h-11'}
          />
        </div>

        {/* Usuário logado */}
        <div className={`shrink-0 border-t border-divider ${sidebarOpen ? 'p-3' : 'p-2'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-primary-100 transition-colors">
              <Avatar name={usuario?.nome} src={avatar} initials={iniciais} size="lg" variant="solid" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate leading-tight">
                  {usuario?.nome || 'Carregando...'}
                </p>
                <p className="text-2xs text-light-text truncate">{usuario?.email || ''}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-danger-bg hover:text-danger transition-colors shrink-0"
              >
                <span className="material-icons text-[18px]" aria-hidden="true">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Avatar name={usuario?.nome} src={avatar} initials={iniciais} size="lg" variant="solid" />
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="w-10 h-10 flex items-center justify-center rounded-md text-light-text hover:bg-danger-bg hover:text-danger transition-colors"
              >
                <span className="material-icons text-[18px]" aria-hidden="true">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior (celular) */}
        <header className="md:hidden h-14 shrink-0 flex items-center gap-3 px-4 bg-sidebar border-b border-divider">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors"
          >
            <span className="material-icons text-[22px]" aria-hidden="true">menu</span>
          </button>
          <img src="/Logo.png" alt="" className="h-7 w-7 object-contain" />
          <p className="text-sm font-semibold text-ink truncate">{empresa?.nome || 'Levit'}</p>
          <BotaoNotificacoes
            naoLidas={naoLidas}
            onClick={abrirNotificacoes}
            aberto={notificacoesAbertas}
            compacto
            className="ml-auto -mr-2"
          />
        </header>

        <main id="conteudo" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col outline-none">
          <div
            key={location.pathname}
            className={`flex-1 flex flex-col animate-page-in ${noPadding ? '' : 'p-4 sm:p-6 lg:p-8'}`}
          >
            {children}
          </div>
        </main>
      </div>

      <PainelNotificacoes open={notificacoesAbertas} onClose={() => setNotificacoesAbertas(false)} naoLidas={naoLidas} />
    </div>
  );
}
