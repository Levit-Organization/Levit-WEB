import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../ui';
import SecaoTitulo from './SecaoTitulo';

/** "Precisa da sua atenção": cada item leva à tela onde se resolve. */
export default function PainelAtencao({ itens }) {
  return (
    <Card className="lg:col-span-2 min-w-0">
      <SecaoTitulo>Precisa da sua atenção</SecaoTitulo>
      {itens.length === 0 ? (
        <EmptyState
          size="sm"
          icon="task_alt"
          title="Tudo em dia"
          description="Quando algo atrasar, uma automação falhar ou um convite vencer, aparece aqui."
          className="py-4"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {itens.map((item) => (
            <li key={item.id}>
              <Link to={item.to} className="flex items-start gap-3 py-3 group">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.cor}`} aria-hidden="true">
                  <span className="material-icons text-[18px]">{item.icone}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink group-hover:text-primary transition-colors">{item.titulo}</span>
                  {item.texto && <span className="block text-xs text-light-text mt-0.5">{item.texto}</span>}
                </span>
                <span className="material-icons text-[18px] text-faint mt-2" aria-hidden="true">chevron_right</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
