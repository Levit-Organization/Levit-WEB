import { Card, Input, Select } from '../ui';
import { opcoesDeCategoria } from '../../utils/financeiro';

/** Categoria, ano e busca da lista de lançamentos. `filtro` vem de useFiltroLancamentos. */
export default function FiltrosLancamentos({ filtro, categorias }) {
  return (
    <Card padding="md" className="mb-5">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full xl:w-auto">
          <div className="sm:min-w-[220px]">
            <Select
              label="Filtrar por categoria"
              value={filtro.categoria}
              onChange={(event) => filtro.setCategoria(event.target.value)}
              options={[{ value: 'all', label: 'Todas as categorias' }, ...opcoesDeCategoria(categorias)]}
            />
          </div>

          <div className="sm:min-w-[190px]">
            <Select
              label="Ano"
              icon="calendar_month"
              value={filtro.ano}
              onChange={(event) => filtro.setAno(event.target.value)}
              options={filtro.anos.map((ano) => ({ value: ano, label: ano }))}
            />
          </div>
        </div>

        <div className="w-full xl:max-w-sm">
          <Input
            label="Buscar lançamento"
            type="search"
            icon="search"
            value={filtro.busca}
            onChange={(event) => filtro.setBusca(event.target.value)}
            placeholder="Descrição, categoria ou tipo..."
          />
        </div>
      </div>
    </Card>
  );
}
