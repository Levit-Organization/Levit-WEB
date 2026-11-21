import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function NotFound() {
  const { autenticado } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-xl bg-primary-100 text-primary flex items-center justify-center mb-4">
          <span className="material-icons text-[26px]" aria-hidden="true">travel_explore</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">Página não encontrada</h1>
        <p className="text-sm text-light-text mt-2 leading-relaxed">
          O endereço que você abriu não existe ou foi movido.
        </p>
        <Link
          to={autenticado ? '/dashboard' : '/'}
          className="mt-6 h-11 px-5 inline-flex items-center rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          {autenticado ? 'Voltar ao painel' : 'Ir para o início'}
        </Link>
      </div>
    </div>
  );
}
