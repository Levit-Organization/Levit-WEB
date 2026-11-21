import { Alert, Card, EmptyState, ErrorState, Skeleton } from '../ui';
import { useModulos } from '../../hooks/queries';
import { mensagemDeErro } from '../../lib/queryClient';
import { MODULO_ICON_OPTIONS } from '../../utils/iconOptions';
import { useIconeDasTabelas } from './useIconeDasTabelas';

const SEM_DADOS = [];

function SeletorDeIcone({ modulo, onEscolher }) {
  return (
    <div className="mt-3 grid grid-cols-8 gap-1.5">
      {MODULO_ICON_OPTIONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onEscolher(modulo, icon)}
          title={icon}
          aria-label={`Usar o ícone ${icon}`}
          aria-pressed={modulo.icone === icon}
          className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
            modulo.icone === icon
              ? 'bg-primary text-white shadow-sm'
              : 'text-light-text hover:bg-primary-100 hover:text-primary-700'
          }`}
        >
          <span className="material-icons text-[18px]" aria-hidden="true">{icon}</span>
        </button>
      ))}
    </div>
  );
}

function LinhaDaTabela({ modulo, icones }) {
  const aberto = icones.pickerAbertoId === modulo.id;
  const salvando = icones.salvandoId === modulo.id;
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
          <span className="material-icons text-primary text-[18px]" aria-hidden="true">{modulo.icone || 'extension'}</span>
        </div>
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-ink">{modulo.nome}</span>
        <button
          type="button"
          onClick={() => icones.alternarPicker(modulo.id)}
          disabled={salvando}
          className="text-xs text-primary font-medium hover:underline shrink-0 disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : (aberto ? 'Fechar' : 'Alterar ícone')}
        </button>
      </div>

      {aberto && <SeletorDeIcone modulo={modulo} onEscolher={icones.escolherIcone} />}
    </li>
  );
}

/** "Aparência das tabelas": o ícone de cada tabela, visto pela equipe toda. */
export default function IconesDasTabelas() {
  const modulosQuery = useModulos();
  const modulos = modulosQuery.data ?? SEM_DADOS;
  const icones = useIconeDasTabelas();

  return (
    <Card>
      <h2 className="text-base font-semibold mb-0.5">Aparência das tabelas</h2>
      <p className="text-xs text-light-text mb-4">O ícone escolhido aqui aparece para toda a equipe.</p>

      {icones.error && <Alert variant="error" className="mb-4">{icones.error}</Alert>}

      {modulosQuery.isError && !modulosQuery.data ? (
        <ErrorState
          size="sm"
          description={mensagemDeErro(modulosQuery.error, 'Erro ao carregar as tabelas.')}
          onRetry={() => modulosQuery.refetch()}
          className="py-6"
        />
      ) : modulosQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : modulos.length === 0 ? (
        <EmptyState
          size="sm"
          icon="widgets"
          title="Nenhuma tabela criada ainda"
          description="Quando você criar uma tabela, o ícone dela pode ser personalizado por aqui."
          className="py-6"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-divider -mb-3">
          {modulos.map((modulo) => (
            <LinhaDaTabela key={modulo.id} modulo={modulo} icones={icones} />
          ))}
        </ul>
      )}
    </Card>
  );
}
