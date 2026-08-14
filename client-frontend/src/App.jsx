import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Modules from './pages/Modules';
import ModuleForm from './pages/ModuleForm';
import ModuleRecords from './pages/ModuleRecords';
import RecrutamentoKanban from './pages/RecrutamentoKanban';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/recrutamento" element={
            <ProtectedRoute>
              <RecrutamentoKanban />
            </ProtectedRoute>
          } />
          
          <Route path="/modulos" element={
            <ProtectedRoute>
              <Modules />
            </ProtectedRoute>
          } />
          <Route path="/modulos/novo" element={
            <ProtectedRoute>
              <ModuleForm />
            </ProtectedRoute>
          } />
          <Route path="/modulos/:id/editar" element={
            <ProtectedRoute>
              <ModuleForm />
            </ProtectedRoute>
          } />
          <Route path="/modulos/:id/registros" element={
            <ProtectedRoute>
              <ModuleRecords />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
