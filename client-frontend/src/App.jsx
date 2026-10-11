import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, matchPath, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { FeedbackProvider } from './context/FeedbackProvider';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { pages } from './routes/lazyPages';

const {
  Landing,
  Sobre,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  AceitarConvite,
  Dashboard,
  Modules,
  ModuleForm,
  ModuleRecords,
  RecrutamentoKanban,
  FinancialModule,
  TeamManagementContainer,
  AutomacoesContainer,
  AutomacaoForm,
  Configuracoes,
  Relatorios,
  NotFound,
} = pages;

// Título da aba por rota (ordem importa: padrões mais específicos primeiro).
const TITULOS = [
  ['/sobre', 'Sobre nós'],
  ['/login', 'Entrar'],
  ['/register', 'Criar conta'],
  ['/forgot-password', 'Recuperar senha'],
  ['/reset-password', 'Redefinir senha'],
  ['/convite/:token', 'Convite para a equipe'],
  ['/dashboard', 'Início'],
  ['/recrutamento', 'Recrutamento'],
  ['/modulos/novo', 'Nova tabela'],
  ['/modulos/:id/editar', 'Configurar tabela'],
  ['/modulos/:id/registros', 'Itens'],
  ['/modulos/:id/financeiro', 'Financeiro'],
  ['/modulos', 'Tabelas'],
  ['/team', 'Equipe'],
  ['/automacoes/nova', 'Nova automação'],
  ['/automacoes/:moduloId/:id/editar', 'Editar automação'],
  ['/automacoes', 'Automações'],
  ['/configuracoes', 'Configurações'],
  ['/relatorios', 'Relatórios'],
];

function TitleManager() {
  const { pathname } = useLocation();
  const achado = TITULOS.find(([padrao]) => matchPath({ path: padrao, end: true }, pathname));
  useDocumentTitle(achado ? achado[1] : null);
  return null;
}

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Carregando">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function HomeRoute() {
  const { autenticado, loading } = useAuth();

  if (loading) return <PageFallback />;

  if (autenticado) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function protegida(elemento) {
  return <ProtectedRoute>{elemento}</ProtectedRoute>;
}

function AppRoutes() {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary resetKey={pathname}>
      {/* A navegação entre páginas roda em transição: o fallback só aparece na
          primeira carga; depois a tela atual fica até o próximo chunk chegar. */}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/convite/:token" element={<AceitarConvite />} />

          <Route path="/dashboard" element={protegida(<Dashboard />)} />
          <Route path="/recrutamento" element={protegida(<RecrutamentoKanban />)} />

          <Route path="/modulos" element={protegida(<Modules />)} />
          <Route path="/modulos/novo" element={protegida(<ModuleForm />)} />
          <Route path="/modulos/:id/editar" element={protegida(<ModuleForm />)} />
          <Route path="/modulos/:id/registros" element={protegida(<ModuleRecords />)} />
          <Route path="/modulos/:id/financeiro" element={protegida(<FinancialModule />)} />

          <Route path="/team" element={protegida(<TeamManagementContainer />)} />

          <Route path="/automacoes" element={protegida(<AutomacoesContainer />)} />
          <Route path="/automacoes/nova" element={protegida(<AutomacaoForm />)} />
          <Route path="/automacoes/:moduloId/:id/editar" element={protegida(<AutomacaoForm />)} />

          <Route path="/configuracoes" element={protegida(<Configuracoes />)} />
          <Route path="/relatorios" element={protegida(<Relatorios />)} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <BrowserRouter>
          <AuthProvider>
            <TitleManager />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}

export default App;
