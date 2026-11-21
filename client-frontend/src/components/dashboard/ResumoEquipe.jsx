import { Link } from 'react-router-dom';
import { Avatar, Button, Card, Skeleton } from '../ui';
import { plural } from '../../utils/dashboard';
import SecaoTitulo from './SecaoTitulo';

/** Resumo da equipe: rostos e contagem, ou o convite para trazer alguém. */
export default function ResumoEquipe({ equipeQuery, equipe, equipeIndisponivel }) {
  return (
    <Card className="min-w-0">
      <SecaoTitulo
        acao={
          <Link to="/team" className="text-sm text-primary font-semibold hover:underline shrink-0">
            Ver equipe
          </Link>
        }
      >
        Equipe
      </SecaoTitulo>
      {equipeIndisponivel ? (
        <p className="text-sm text-light-text">Seu cargo não tem acesso à lista da equipe.</p>
      ) : equipeQuery.isLoading ? (
        <Skeleton className="h-9 w-40 rounded-full" />
      ) : equipe.length <= 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-light-text">Só você por aqui. Convide quem trabalha com você.</p>
          <Button to="/team" size="sm" variant="secondary" icon="person_add">Convidar</Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {equipe.slice(0, 6).map((membro) => (
              <Avatar key={membro.id} name={membro.nome} size="md" ring />
            ))}
          </div>
          <p className="text-sm text-light-text">{plural(equipe.length, 'pessoa', 'pessoas')}</p>
        </div>
      )}
    </Card>
  );
}
