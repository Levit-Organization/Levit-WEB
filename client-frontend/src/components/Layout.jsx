import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children, noPadding = false }) {
  const { usuario, empresa, iniciais, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Recrutamento', path: '/recrutamento' },
    { name: 'Módulos', path: '/modulos' },
    { divider: true },
    { name: 'Equipe', path: '/team',},
    { name: 'Configurações', path: '/configuracoes' },
    { name: 'Automações', path: '/automacoes'},
  ];

  return (
    <div className="h-screen flex bg-background font-sans text-gray-900 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} bg-white border-r border-divider flex flex-col justify-between shrink-0 transition-all duration-300 overflow-y-auto`}>
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-divider">
            <div className="flex items-center gap-3">
              <img src="/Logo.png" alt="Logo" className="h-8" />
              <span className="font-bold text-xl">Levit</span>
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-light-text hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Navegação */}
          <nav className="mt-6 flex flex-col gap-1">
            {navItems.map((item, index) => {
              if (item.divider) {
                return <hr key={index} className="my-2 border-divider w-4/5 mx-auto" />;
              }
              if (item.disabled) {
                return (
                  <span
                    key={item.path}
                    className="flex items-center px-6 py-3 border-l-4 border-transparent text-sm text-light-text/50 cursor-not-allowed"
                    title="Em breve"
                  >
                    {item.name}
                    <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Em breve</span>
                  </span>
                );
              }
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-6 py-3 border-l-4 text-sm transition-colors ${
                    isActive
                      ? 'bg-background border-primary text-black font-semibold'
                      : 'border-transparent text-light-text hover:bg-background hover:text-gray-600'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Perfil do Usuário Logado (Bottom) */}
        <div className="p-6 border-t border-divider">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
              {iniciais}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{usuario?.nome || 'Carregando...'}</p>
              <p className="text-[10px] text-light-text truncate">{empresa?.nome || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-xs text-light-text hover:text-red-500 transition-colors py-1.5 border border-divider rounded-lg hover:border-red-300"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className={`flex-1 overflow-y-auto flex flex-col ${noPadding ? '' : 'p-8'}`}>
        {children}
      </main>
    </div>
  );
}
