import { useState } from 'react';
import { Badge, Button, Card } from '../ui';
import { diasAte } from '../../utils/equipe';

/** Convites enviados e ainda não aceitos, com reenviar e cancelar. */
export default function ConvitesPendentes({ convites, onReenviar, onCancelar }) {
  const [ocupado, setOcupado] = useState(null);
  if (!convites.length) return null;

  const agir = async (convite, acao) => {
    setOcupado(`${acao}-${convite.id}`);
    try {
      await (acao === 'reenviar' ? onReenviar(convite) : onCancelar(convite));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Card padding="none" className="mb-5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-divider">
        <span className="material-icons text-[18px] text-warning" aria-hidden="true">forward_to_inbox</span>
        <h2 className="text-sm font-semibold text-ink">Convites aguardando resposta</h2>
        <Badge variant="warning" size="sm">{convites.length}</Badge>
      </div>
      <ul className="divide-y divide-divider">
        {convites.map((convite) => {
          const dias = diasAte(convite.expira_em);
          return (
            <li key={convite.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-9 h-9 rounded-full bg-warning-bg text-warning flex items-center justify-center shrink-0" aria-hidden="true">
                  <span className="material-icons text-[18px]">mail</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{convite.email}</p>
                  <p className="text-2xs text-light-text truncate">
                    {convite.cargo_nome || 'Sem cargo'}
                    {convite.convidado_por_nome ? ` · convidado por ${convite.convidado_por_nome}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {convite.expirado ? (
                  <Badge variant="danger" size="sm" dot>Expirado</Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>
                    {dias !== null && dias <= 1 ? 'Vence hoje' : `Vence em ${dias} dias`}
                  </Badge>
                )}
                {onReenviar && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="send"
                    loading={ocupado === `reenviar-${convite.id}`}
                    onClick={() => agir(convite, 'reenviar')}
                    aria-label={`Reenviar convite para ${convite.email}`}
                  >
                    Reenviar
                  </Button>
                )}
                {onCancelar && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon="close"
                    loading={ocupado === `cancelar-${convite.id}`}
                    onClick={() => agir(convite, 'cancelar')}
                    title="Cancelar convite"
                    aria-label={`Cancelar convite para ${convite.email}`}
                    className="hover:bg-danger-bg hover:text-danger"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
