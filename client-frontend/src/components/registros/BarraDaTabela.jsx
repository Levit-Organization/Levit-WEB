import { Button, Input } from '../ui';
import SeletorDeVisao from './SeletorDeVisao';

/**
 * Barra acima dos itens: busca, botão da pesquisa avançada, "Só os meus" (com
 * coluna de responsável) e a escolha entre lista e quadro (com coluna de lista).
 */
export default function BarraDaTabela({
  busca,
  onBuscar,
  podeFiltrar,
  mostrarFiltros,
  totalFiltros,
  onAlternarFiltros,
  temResponsavel,
  soMeus,
  onSoMeus,
  visaoDaTabela,
}) {
  return (
    <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-full sm:max-w-md">
      <Input
        type="search"
        name="busca"
        icon="search"
        value={busca}
        onChange={(e) => onBuscar(e.target.value)}
        placeholder="Buscar itens..."
        aria-label="Buscar itens"
        autoComplete="off"
      />
      </div>

      {podeFiltrar && (
        <Button
          variant={mostrarFiltros || totalFiltros > 0 ? 'subtle' : 'secondary'}
          size="sm"
          icon="filter_list"
          aria-expanded={mostrarFiltros}
          aria-controls="painel-filtros"
          onClick={onAlternarFiltros}
        >
          {totalFiltros > 0 ? `Filtros (${totalFiltros})` : 'Filtrar'}
        </Button>
      )}

      {temResponsavel && (
        <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soMeus}
            onChange={(e) => onSoMeus(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Só os meus
        </label>
      )}

      {visaoDaTabela.podeQuadro && <SeletorDeVisao visaoDaTabela={visaoDaTabela} />}
    </div>
  );
}
