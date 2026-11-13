import { Alert, Card } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { getLogo, setLogo } from '../../utils/avatarStorage';
import { useImagemGuardada } from './useImagemGuardada';
import CabecalhoComImagem from './CabecalhoComImagem';
import IconesDasTabelas from './IconesDasTabelas';

/** Aba "Empresa e tabelas": logo e nome da empresa, ícones das tabelas. */
export default function EmpresaModulosTab() {
  const { empresa } = useAuth();
  const logo = useImagemGuardada(getLogo, setLogo, empresa?.id);

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <CabecalhoComImagem
          titulo="Empresa"
          imagem={logo}
          rotuloRemover="Remover logo"
          shape="square"
          fallback={<span className="material-icons text-3xl text-primary">business</span>}
          className="mb-5"
        />

        {logo.erro && <Alert variant="error" className="mb-4">{logo.erro}</Alert>}

        <div className="w-full h-11 px-4 border border-divider rounded-lg bg-background flex items-center text-sm text-ink-soft">
          {empresa?.nome || 'Carregando...'}
        </div>
        <p className="text-2xs text-light-text mt-1.5">Edição do nome da empresa ainda não está disponível.</p>
      </Card>

      <IconesDasTabelas />
    </div>
  );
}
