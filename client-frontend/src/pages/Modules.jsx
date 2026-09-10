import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Card, EmptyState, Skeleton, PageHeader } from '../components/ui';
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
      <PageHeader
        title="Módulos"
        subtitle="Gerencie os módulos da plataforma"
        actions={<Button to="/modulos/novo" icon="add">Novo Módulo</Button>}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((skeleton) => (
            <Card key={skeleton} padding="md">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8" />
            </Card>
          ))}
        </div>
      ) : modulos.length === 0 ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon="widgets"
            size="lg"
            title="Nenhum módulo ainda"
            description="Um módulo guarda um tipo de informação do seu RH — documentos, avaliações, vagas. Você define os campos e ele vira uma tela pronta."
            actionLabel="Criar primeiro módulo"
            actionIcon="add"
            actionTo="/modulos/novo"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((modulo) => (
            <Card
              key={modulo.id}
              padding="md"
              interactive
              onClick={() => {
                if (modulo.tipo === 'recrutamento') {
                  navigate('/recrutamento');
                } else {
                  navigate(`/modulos/${modulo.id}/registros`);
                }
              }}
              className="flex flex-col justify-between group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100 text-primary shrink-0">
                  <span className="material-icons text-xl">{modulo.icone || 'extension'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-ink truncate" title={modulo.nome}>{modulo.nome}</h4>
                  <p className="text-xs text-light-text mt-0.5">
                    {modulo.total_registros || 0} registro{(modulo.total_registros || 0) != 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-icons text-lg text-faint opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </div>

              <div className="flex gap-2 justify-end mt-auto border-t border-divider pt-3">
                <Link
                  to={`/modulos/${modulo.id}/editar`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-light-text hover:text-primary transition-colors px-2 py-1"
                >
                  Editar
                </Link>
                <button
                  onClick={(e) => handleDelete(e, modulo.id)}
                  className="text-xs font-medium text-light-text hover:text-danger transition-colors px-2 py-1"
                >
                  Excluir
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
