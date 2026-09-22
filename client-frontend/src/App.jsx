import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Modules from './pages/Modules';
import ModuleForm from './pages/ModuleForm';
import ModuleRecords from './pages/ModuleRecords';
import FinancialModule from './pages/FinancialModule';
import RecrutamentoKanban from './pages/RecrutamentoKanban';
import TeamManagementContainer from './pages/TeamManagementContainer';
import AutomacoesContainer from './pages/AutomacoesContainer';
import AutomacaoForm from './pages/AutomacaoForm';
import Configuracoes from './pages/Configuracoes';

function HomeRoute() {
  const { autenticado, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (autenticado) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={
             
              <Dashboard />
             
          } />

          <Route path="/recrutamento" element={
             
              <RecrutamentoKanban />
             
          } />
          
          <Route path="/modulos" element={
             
              <Modules />
             
          } />
          <Route path="/modulos/novo" element={
             
              <ModuleForm />
             
          } />
          <Route path="/modulos/:id/editar" element={
             
              <ModuleForm />
             
          } />
          <Route path="/modulos/:id/registros" element={
             
              <ModuleRecords />
             
          } />
          <Route path="/modulos/:id/financeiro" element={
             
              <FinancialModule />
             
          } />
          <Route path="/team" element={
             
              <TeamManagementContainer />
             
          } />

          <Route path="/automacoes" element={
             
              <AutomacoesContainer />
             
          } />
          <Route path="/automacoes/nova" element={
             
              <AutomacaoForm />
             
          } />
          <Route path="/automacoes/:moduloId/:id/editar" element={
             
              <AutomacaoForm />
             
          } />

          <Route path="/configuracoes" element={
             
              <Configuracoes />
             
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
