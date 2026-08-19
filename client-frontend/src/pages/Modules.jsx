import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { moduloService } from '../services/moduloService';

export default function Modules() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchModulos();
  }, []);

  const fetchModulos = async () => {
    try {
      setLoading(true);
      const data = await moduloService.getAll();
      setModulos(data);
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este módulo e todos os seus registros?')) {
      try {
        await moduloService.delete(id);
        fetchModulos();
      } catch (error) {
        console.error('Erro ao excluir módulo:', error);
      }
    }
  };

  return (
    <Layout>
      <header className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Módulos</h1>
          <p className="text-sm text-light-text mt-1">Gerencie os módulos da plataforma</p>
        </div>
        <Link 
          to="/modulos/novo"
          className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/80 transition flex items-center gap-1.5"
        >
          <span className="material-icons text-base">add</span>
          Novo Módulo
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="bg-white border border-divider rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-16"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-50 rounded"></div>
            </div>
          ))}
        </div>
      ) : modulos.length === 0 ? (
        <div className="bg-white border border-divider rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mx-auto mb-4">
            <span className="material-icons text-3xl text-light-text">widgets</span>
          </div>
          <p className="text-light-text mb-4">Nenhum módulo encontrado.</p>
          <Link 
            to="/modulos/novo"
            className="text-primary font-medium hover:underline"
          >
            Crie seu primeiro módulo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((modulo) => (
            <div 
              key={modulo.id} 
              onClick={() => navigate(`/modulos/${modulo.id}/registros`)}
              className="bg-white border border-divider rounded-xl p-5 flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white bg-primary shrink-0">
                  <span className="material-icons text-xl">{modulo.icone || 'extension'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate" title={modulo.nome}>{modulo.nome}</h4>
                  <p className="text-xs text-light-text mt-0.5">
                    {modulo.total_registros || 0} registro{(modulo.total_registros || 0) != 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-icons text-lg text-light-text opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </div>
              
              <div className="flex gap-2 justify-end mt-auto border-t border-divider pt-3">
                <Link 
                  to={`/modulos/${modulo.id}/editar`} 
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-gray-500 hover:text-primary transition-colors px-2 py-1"
                >
                  Editar
                </Link>
                <button 
                  onClick={(e) => handleDelete(e, modulo.id)}
                  className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors px-2 py-1"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
