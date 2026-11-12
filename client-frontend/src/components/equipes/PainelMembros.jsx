import { Input, Select } from '../ui';
import ConvitesPendentes from './ConvitesPendentes';
import TabelaMembros from './TabelaMembros';
import CartoesMembros from './CartoesMembros';

/**
 * Aba "Colaboradores": convites pendentes, busca/filtro e a lista (tabela no
 * desktop, cartões no celular). O estado do filtro vem de `useFiltroMembros`.
 */
export default function PainelMembros({
  roles,
  loading,
  filtro,
  invites,
  onResendInvite,
  onCancelInvite,
  onConvidar,
  onEditar,
  onExcluir,
}) {
  const { searchTerm, roleFilter, buscar, filtrarPorCargo, filtrando, filteredMembers, paginacao } = filtro;
  const lista = { loading, filtrando, filteredMembers, paginacao, onEditar, onExcluir };

  return (
    <section id="painel-members" role="tabpanel" aria-labelledby="aba-members">
      <ConvitesPendentes convites={invites} onReenviar={onResendInvite} onCancelar={onCancelInvite} />
      <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <Input
            type="search"
            icon="search"
            value={searchTerm}
            onChange={(event) => buscar(event.target.value)}
            name="busca"
            autoComplete="off"
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar colaborador"
          />
        </div>

        <div className="w-full md:w-[240px]">
          <Select
            icon="filter_list"
            value={roleFilter}
            onChange={(event) => filtrarPorCargo(event.target.value)}
            aria-label="Filtrar por cargo"
            options={[{ value: '', label: 'Todos os cargos' }, ...roles.map((role) => ({ value: role.id, label: role.nome }))]}
          />
        </div>
      </div>

      <TabelaMembros {...lista} onConvidar={onConvidar} />
      <CartoesMembros {...lista} />
    </section>
  );
}
