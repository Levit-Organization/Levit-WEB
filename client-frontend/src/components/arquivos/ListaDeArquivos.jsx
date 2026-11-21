import { Card, Pagination } from '../ui';
import { cn } from '../ui/cn';
import LinhaDeArquivo from './LinhaDeArquivo';

const COLUNAS = [
  { key: 'arquivo_nome', titulo: 'Nome' },
  { key: 'arquivo_tamanho', titulo: 'Tamanho', classe: 'hidden sm:table-cell' },
  { key: 'enviado_por_nome', titulo: 'Enviado por', classe: 'hidden md:table-cell' },
  { key: 'criado_em', titulo: 'Enviado' },
];

function CabecalhoOrdenavel({ coluna, ordem, onOrdenar }) {
  const ativa = ordem.key === coluna.key;
  return (
    <th
      scope="col"
      aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('th-label text-left px-4 py-3', coluna.classe)}
    >
      <button
        type="button"
        onClick={() => onOrdenar(coluna.key)}
        className="inline-flex items-center gap-1 hover:text-ink transition-colors rounded"
      >
        {coluna.titulo}
        <span className={cn('material-icons text-[14px]', ativa ? 'text-primary' : 'text-faint')} aria-hidden="true">
          {ativa ? (ordem.direcao === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
      </button>
    </th>
  );
}

/** Tabela paginada dos arquivos, com cabeçalhos que ordenam. `acoes` vem de useAcoesDosArquivos. */
export default function ListaDeArquivos({ paginacao, ordem, onOrdenar, acoes, onAbrir, onVisualizar }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider bg-background">
              {COLUNAS.map((coluna) => (
                <CabecalhoOrdenavel key={coluna.key} coluna={coluna} ordem={ordem} onOrdenar={onOrdenar} />
              ))}
              <th scope="col" className="th-label text-right px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginacao.pageItems.map((arquivo) => (
              <LinhaDeArquivo
                key={arquivo.id}
                arquivo={arquivo}
                baixando={acoes.baixando.has(arquivo.id)}
                onAbrir={onAbrir}
                onVisualizar={onVisualizar}
                onBaixar={acoes.baixar}
                onExcluir={acoes.excluir}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...paginacao} onPageChange={paginacao.setPage} label="arquivos" />
    </Card>
  );
}
