import { Link } from 'react-router-dom';
import { Button, Card, ErrorState, Skeleton } from '../ui';
import { mensagemDeErro } from '../../lib/queryClient';
import { MODELOS_TABELA } from '../../utils/modelosTabela';
import { destinoDaTabela, plural } from '../../utils/dashboard';
import SecaoTitulo from './SecaoTitulo';

const MAXIMO_NA_TELA = 6;

function CartaoDaTabela({ modulo }) {
  return (
    <Card
      as={Link}
      to={destinoDaTabela(modulo)}
      padding="sm"
      interactive
      className="flex items-center gap-3.5 group no-underline"
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary-100 text-primary shrink-0">
        <span className="material-icons text-[24px]" aria-hidden="true">{modulo.icone || 'extension'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-ink truncate">{modulo.nome}</h3>
        <p className="text-xs text-light-text">
          {modulo.tipo === 'financeiro' ? 'Entradas e saídas' : plural(Number(modulo.total_registros || 0), 'item', 'itens')}
        </p>
      </div>
      <span className="material-icons text-[20px] text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true">
        arrow_forward
      </span>
    </Card>
  );
}

function PrimeiraTabela() {
  return (
    <Card className="col-span-full">
      <p className="text-sm font-semibold text-ink">Comece pela primeira tabela</p>
      <p className="text-sm text-light-text mt-1">
        Tudo o que hoje está em planilhas, e-mails e mensagens pode virar uma tabela. Escolha um modelo para começar:
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {MODELOS_TABELA.filter((m) => m.segmento || m.id === 'tarefas').map((m) => (
          <Button key={m.id} to="/modulos/novo" variant="secondary" size="sm" icon={m.icone}>
            {m.titulo}
          </Button>
        ))}
      </div>
    </Card>
  );
}

/** "Suas tabelas": o centro do trabalho, com atalho para criar outra. */
export default function SuasTabelas({ modulosQuery, tabelas }) {
  let conteudo;
  if (modulosQuery.isLoading) {
    conteudo = [1, 2, 3].map((s) => (
      <Card key={s} padding="sm" className="flex items-center gap-3.5">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1.5" />
          <Skeleton className="h-3 w-16" />
        </div>
      </Card>
    ));
  } else if (modulosQuery.isError) {
    conteudo = (
      <Card className="col-span-full">
        <ErrorState
          description={mensagemDeErro(modulosQuery.error, 'Erro ao carregar as tabelas.')}
          onRetry={() => modulosQuery.refetch()}
        />
      </Card>
    );
  } else if (tabelas.length === 0) {
    conteudo = <PrimeiraTabela />;
  } else {
    conteudo = tabelas.slice(0, MAXIMO_NA_TELA).map((modulo) => <CartaoDaTabela key={modulo.id} modulo={modulo} />);
  }

  return (
    <section className="mb-8 shrink-0">
      <SecaoTitulo acao={<Button to="/modulos/novo" size="sm" variant="secondary" icon="add">Nova tabela</Button>}>
        Suas tabelas
      </SecaoTitulo>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{conteudo}</div>

      {tabelas.length > MAXIMO_NA_TELA && (
        <div className="mt-4">
          <Link to="/modulos" className="text-sm text-primary font-semibold hover:underline">
            Ver todas as {tabelas.length} tabelas
          </Link>
        </div>
      )}
    </section>
  );
}
