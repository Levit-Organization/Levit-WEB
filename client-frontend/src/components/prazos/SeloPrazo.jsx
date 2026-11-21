import { Badge } from '../ui';
import { situacaoDoPrazo } from '../../utils/prazos';

const ESTILO = {
  atrasado: { variant: 'danger', icon: 'error' },
  hoje: { variant: 'warning', icon: 'schedule' },
  breve: { variant: 'info', icon: 'event' },
  futuro: { variant: 'default', icon: 'event' },
  concluido: { variant: 'default', icon: 'event_available' },
};

/** Prazo com cor pela urgência: atrasado, vence hoje, nos próximos dias ou só a data. */
export default function SeloPrazo({ data, concluido = false, size = 'sm', className = '' }) {
  const situacao = situacaoDoPrazo(data, { concluido });
  if (!situacao) return null;
  const { variant, icon } = ESTILO[situacao.tipo];
  return (
    <Badge variant={variant} size={size} icon={icon} className={className}>
      {situacao.rotulo}
    </Badge>
  );
}
