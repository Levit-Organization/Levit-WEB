import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { autenticado, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-light-text">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    // Guarda para onde a pessoa ia: depois do login ela volta pra lá.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
