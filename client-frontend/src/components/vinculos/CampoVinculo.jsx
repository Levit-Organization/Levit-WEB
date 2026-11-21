import { Select } from '../ui';
import { useTitulos } from '../../hooks/queries';
import { aceitaVarios, idsLigados, tituloDoItem } from '../../utils/vinculos';

/**
 * Escolha do(s) item(ns) de outra tabela numa coluna de ligação. Um item: lista
 * simples (com "Nenhum" para desfazer). Vários: os escolhidos viram etiquetas
 * removíveis e a lista adiciona mais.
 */
export default function CampoVinculo({ id, campo, value, onChange }) {
  const tabela = campo.modulo_vinculado;
  const semAcesso = tabela?.acesso === false;
  const titulosQuery = useTitulos(semAcesso ? null : campo.modulo_vinculado_id);

  if (semAcesso) {
    return <p className="text-sm text-light-text">Você não tem acesso à tabela “{tabela.nome}”.</p>;
  }

  const itens = titulosQuery.data ?? [];
  const nomes = Object.fromEntries(itens.map((i) => [i.id, tituloDoItem(i.titulo)]));
  const opcoes = itens.map((i) => ({ value: i.id, label: tituloDoItem(i.titulo) }));
  const vazio = titulosQuery.isLoading
    ? 'Carregando...'
    : itens.length === 0
      ? `A tabela “${tabela?.nome ?? 'ligada'}” ainda não tem itens`
      : null;

  if (!aceitaVarios(campo)) {
    return (
      <Select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: '', label: vazio ?? 'Nenhum' }, ...opcoes]}
      />
    );
  }

  const escolhidos = idsLigados(value);
  const restantes = opcoes.filter((o) => !escolhidos.includes(o.value));

  return (
    <div className="flex flex-col gap-2">
      {escolhidos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${campo.nome} escolhidos`}>
          {escolhidos.map((itemId) => {
            const nome = nomes[itemId] ?? 'Item excluído';
            return (
              <li key={itemId} className="inline-flex items-center gap-1 h-7 pl-3 pr-1 rounded-full bg-primary-50 text-primary-800 text-xs font-medium max-w-full">
                <span className="truncate">{nome}</span>
                <button
                  type="button"
                  onClick={() => onChange(escolhidos.filter((x) => x !== itemId))}
                  aria-label={`Tirar ${nome}`}
                  className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center hover:bg-primary-100 transition-colors"
                >
                  <span className="material-icons text-[14px]" aria-hidden="true">close</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Select
        id={id}
        value=""
        onChange={(e) => e.target.value && onChange([...escolhidos, e.target.value])}
        placeholder={vazio ?? (restantes.length ? 'Adicionar item...' : 'Todos os itens já foram escolhidos')}
        options={restantes}
      />
    </div>
  );
}
