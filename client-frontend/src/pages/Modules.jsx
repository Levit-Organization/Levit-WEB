import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Button, Card, EmptyState, ErrorState, Skeleton, PageHeader } from '../components/ui';
import { moduloService } from '../services/moduloService';
import { useModulos, queryKeys } from '../hooks/queries';
import { useToast, useConfirm } from '../hooks/useFeedback';
import { mensagemDeErro } from '../lib/queryClient';

const SEM_DADOS = [];

function destinoDoModulo(modulo) {
  if (modulo.tipo === 'recrutamento') return '/recrutamento';
  if (modulo.tipo === 'financeiro') return `/modulos/${modulo.id}/financeiro`;
  return `/modulos/${modulo.id}/registros`;
}

export default function Modules() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const modulosQuery = useModulos();
  const modulos = modulosQuery.data ?? SEM_DADOS;
  const loading = modulosQuery.isLoading;

  const handleDelete = async (modulo) => {
    const ok = await confirm({
      title: `Excluir "${modulo.nome}"?`,
      message: 'A tabela e todos os seus itens serão removidos definitivamente. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir tabela',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await moduloService.delete(modulo.id);
      // Some da lista na hora; a revalidação em segundo plano confirma.
      queryClient.setQueryData(queryKeys.modulos, (atual) => atual?.filter((m) => m.id !== modulo.id));
      toast.success('Tabela excluída.');
    } catch (error) {
      toast.error(mensagemDeErro(error, 'Erro ao excluir a tabela.'));
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Tabelas"
        subtitle="Tudo o que a equipe organiza, cada coisa na sua tabela"
        actions={<Button to="/modulos/novo" icon="add">Nova tabela</Button>}
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
      ) : modulosQuery.isError ? (
        <Card padding="lg" className="py-12">
          <ErrorState
            size="lg"
            description={mensagemDeErro(modulosQuery.error, 'Erro ao carregar as tabelas.')}
            onRetry={() => modulosQuery.refetch()}
          />
        </Card>
      ) : modulos.length === 0 ? (
        <Card padding="lg" className="py-12">
          <EmptyState
            icon="widgets"
            size="lg"
            title="Nenhuma tabela ainda"
            description="Uma tabela guarda um tipo de informação da empresa, como clientes, pedidos ou documentos. Você escolhe as colunas e ela vira uma tela pronta."
            actionLabel="Criar primeira tabela"
            actionIcon="add"
            actionTo="/modulos/novo"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((modulo) => (
            <Card key={modulo.id} padding="md" interactive className="flex flex-col justify-between group">
              <Link
                to={destinoDoModulo(modulo)}
                className="flex items-center gap-4 mb-4 rounded-lg no-underline"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100 text-primary shrink-0">
                  <span className="material-icons text-xl" aria-hidden="true">{modulo.icone || 'extension'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-ink truncate" title={modulo.nome}>{modulo.nome}</h4>
                  <p className="text-xs text-light-text mt-0.5">
                    {modulo.total_registros || 0} registro{(modulo.total_registros || 0) != 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-icons text-lg text-faint opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>

              <div className="flex gap-2 justify-end mt-auto border-t border-divider pt-3">
                <Link
                  to={`/modulos/${modulo.id}/editar`}
                  className="text-xs font-medium text-light-text hover:text-primary transition-colors px-2 py-1"
                  aria-label={`Editar ${modulo.nome}`}
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(modulo)}
                  className="text-xs font-medium text-light-text hover:text-danger transition-colors px-2 py-1"
                  aria-label={`Excluir ${modulo.nome}`}
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
