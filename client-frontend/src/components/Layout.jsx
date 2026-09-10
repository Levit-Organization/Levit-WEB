import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatar } from '../utils/avatarStorage';
import Avatar from './ui/Avatar';

const NAV_GROUPS = [
  {
    items: [{ name: 'Início', path: '/dashboard', icon: 'space_dashboard' }],
  },
  {
    label: 'Pessoas',
    items: [
      { name: 'Recrutamento', path: '/recrutamento', icon: 'person_search' },
      { name: 'Equipe', path: '/team', icon: 'groups' },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { name: 'Módulos', path: '/modulos', icon: 'widgets' },
      { name: 'Automações', path: '/automacoes', icon: 'bolt' },
    ],
  },
  {
    items: [{ name: 'Configurações', path: '/configuracoes', icon: 'settings' }],
  },
];

export default function Layout({ children, noPadding = false }) {
  const { usuario, empresa, iniciais, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const avatar = getAvatar(usuario?.id);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavItem = (item) => {
    const isActive = location.pathname.startsWith(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        title={sidebarOpen ? undefined : item.name}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex items-center rounded-lg transition-colors duration-150 ${
          sidebarOpen ? 'gap-3 mx-3 px-3 py-2.5' : 'mx-2 h-11 w-11 justify-center'
        } ${
          isActive
            ? 'bg-primary text-white shadow-xs animate-nav-active'
            : 'text-light-text hover:bg-primary-100 hover:text-primary-700'
        }`}
      >
        <span className="material-icons text-[20px] leading-none shrink-0">{item.icon}</span>
        {sidebarOpen && <span className="text-sm font-medium truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className="h-screen flex bg-background font-sans text-ink-soft overflow-hidden">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[68px]'
        } bg-sidebar border-r border-divider flex flex-col justify-between shrink-0 transition-[width] duration-200 ease-out-quart`}
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
                    <p className="text-2xs text-light-text truncate">Recrutamento e equipe</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  title="Recolher menu"
                  aria-label="Recolher menu"
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors shrink-0"
                >
                  <span className="material-icons text-[18px]">menu_open</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Expandir menu"
                aria-label="Expandir menu"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-light-text hover:bg-primary-100 hover:text-primary-700 transition-colors"
              >
                <span className="material-icons text-[20px]">menu</span>
              </button>
            )}
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto py-2 flex flex-col gap-1">
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
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="w-8 h-8 flex items-center justify-center rounded-md text-light-text hover:bg-danger-bg hover:text-danger transition-colors shrink-0"
              >
                <span className="material-icons text-[18px]">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Avatar name={usuario?.nome} src={avatar} initials={iniciais} size="lg" variant="solid" />
              <button
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="w-10 h-10 flex items-center justify-center rounded-md text-light-text hover:bg-danger-bg hover:text-danger transition-colors"
              >
                <span className="material-icons text-[18px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        <div key={location.pathname} className={`flex-1 flex flex-col animate-page-in ${noPadding ? '' : 'p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
