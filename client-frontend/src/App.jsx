import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { lazy, Suspense } from 'react';

// ── Carregamento dinâmico de todas as páginas ──────────────────────────────────
// Páginas públicas (carregadas sob demanda ao navegar)
const Landing    = lazy(() => import('./pages/Landing'));
const Login      = lazy(() => import('./pages/Login'));
const Register   = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));

// Páginas protegidas (isoladas no bundle de app autenticado)
const Dashboard           = lazy(() => import('./pages/Dashboard'));
const Modules             = lazy(() => import('./pages/Modules'));
const ModuleForm          = lazy(() => import('./pages/ModuleForm'));
const ModuleRecords       = lazy(() => import('./pages/ModuleRecords'));
const RecrutamentoKanban  = lazy(() => import('./pages/RecrutamentoKanban'));
const FinancialModule     = lazy(() => import('./pages/FinancialModule'));
const TeamManagementContainer = lazy(() => import('./pages/TeamManagementContainer'));
const AutomacoesContainer = lazy(() => import('./pages/AutomacoesContainer'));
const AutomacaoForm       = lazy(() => import('./pages/AutomacaoForm'));
const Configuracoes       = lazy(() => import('./pages/Configuracoes'));

// ── Fallback de carregamento global ───────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function HomeRoute() {
  const { autenticado, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (autenticado) return <Navigate to="/dashboard" replace />;

  return <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />

              <Route path="/recrutamento" element={
                <ProtectedRoute><RecrutamentoKanban /></ProtectedRoute>
              } />

              <Route path="/modulos" element={
                <ProtectedRoute><Modules /></ProtectedRoute>
              } />
              <Route path="/modulos/:id/financeiro" element={
                <ProtectedRoute><FinancialModule /></ProtectedRoute>
              } />
              <Route path="/modulos/novo" element={
                <ProtectedRoute><ModuleForm /></ProtectedRoute>
              } />
              <Route path="/modulos/:id/editar" element={
                <ProtectedRoute><ModuleForm /></ProtectedRoute>
              } />
              <Route path="/modulos/:id/registros" element={
                <ProtectedRoute><ModuleRecords /></ProtectedRoute>
              } />

              <Route path="/team" element={
                <ProtectedRoute><TeamManagementContainer /></ProtectedRoute>
              } />

              <Route path="/automacoes" element={
                <ProtectedRoute><AutomacoesContainer /></ProtectedRoute>
              } />
              <Route path="/automacoes/nova" element={
                <ProtectedRoute><AutomacaoForm /></ProtectedRoute>
              } />
              <Route path="/automacoes/:moduloId/:id/editar" element={
                <ProtectedRoute><AutomacaoForm /></ProtectedRoute>
              } />

              <Route path="/configuracoes" element={
                <ProtectedRoute><Configuracoes /></ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
