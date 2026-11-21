import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMinhasEquipes } from '../../hooks/queries';
import { useToast } from '../../hooks/useFeedback';
import { mensagemDeErro } from '../../lib/queryClient';
import { Avatar, Button, Input, Modal, Spinner } from '../ui';
import { cn } from '../ui/cn';

/**
 * Nome da equipe atual no topo do menu. Quem faz parte de mais de uma equipe
 * troca por aqui; qualquer pessoa pode criar uma equipe nova.
 */
export default function SeletorDeEquipe({ onNavegar }) {
  const { empresa, trocarEquipe } = useAuth();
  const equipesQuery = useMinhasEquipes();
  const equipes = equipesQuery.data ?? [];
  const navigate = useNavigate();
  const toast = useToast();

  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(null);
  const [criando, setCriando] = useState(false);
  const raizRef = useRef(null);
  const botaoRef = useRef(null);

  // Clique fora ou Esc fecha. (O menu lateral usa transform, então um fundo
  // `fixed` aqui dentro não cobriria a tela: o fechamento é pelo documento.)
  useEffect(() => {
    if (!aberto) return undefined;
    raizRef.current?.querySelector('[role="menu"] button')?.focus();
    const fora = (e) => {
      if (!raizRef.current?.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  const entrar = async (equipe) => {
    if (equipe.id === empresa?.id) {
      setAberto(false);
      return;
    }
    setTrocando(equipe.id);
    try {
      await trocarEquipe(equipe.id);
      setAberto(false);
      onNavegar?.();
      navigate('/dashboard');
      toast.success(`Você está na equipe ${equipe.nome}.`);
    } catch (err) {
      toast.error(mensagemDeErro(err, 'Não foi possível trocar de equipe.'));
    } finally {
      setTrocando(null);
    }
  };

  const variasEquipes = equipes.length > 1;

  return (
    <div ref={raizRef} className="relative min-w-0 flex-1">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="w-full flex items-center gap-2.5 min-w-0 rounded-lg px-1.5 py-1.5 -mx-1.5 text-left hover:bg-primary-100 transition-colors"
      >
        <img src="/Logo.png" alt="" className="h-8 w-8 object-contain shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink truncate leading-tight">{empresa?.nome || 'Levit'}</span>
          <span className="block text-2xs text-light-text truncate">
            {variasEquipes ? `${equipes.length} equipes · trocar` : 'Espaço da equipe'}
          </span>
        </span>
        <span className="material-icons text-[18px] text-light-text shrink-0" aria-hidden="true">unfold_more</span>
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Suas equipes"
          className="absolute left-0 top-full mt-1.5 z-50 w-[232px] bg-surface border border-divider rounded-xl shadow-lg py-1.5 animate-rise"
        >
          <p className="px-3.5 pt-1 pb-1.5 text-2xs font-semibold uppercase tracking-wide text-light-text">Suas equipes</p>
          <div className="max-h-72 overflow-y-auto">
            {equipesQuery.isLoading && (
              <div className="flex justify-center py-3">
                <Spinner size="sm" />
              </div>
            )}
            {equipes.map((equipe) => {
              const atual = equipe.id === empresa?.id;
              return (
                <button
                  key={equipe.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={atual}
                  disabled={!!trocando}
                  onClick={() => entrar(equipe)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors',
                    atual ? 'bg-primary-50' : 'hover:bg-background'
                  )}
                >
                  <Avatar name={equipe.nome} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{equipe.nome}</span>
                    <span className="block text-2xs text-light-text truncate">{equipe.cargo_nome}</span>
                  </span>
                  {trocando === equipe.id ? (
                    <Spinner size="sm" />
                  ) : (
                    atual && <span className="material-icons text-[18px] text-primary" aria-hidden="true">check</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="my-1.5 border-t border-divider" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              setCriando(true);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-primary-700 hover:bg-background transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center" aria-hidden="true">
              <span className="material-icons text-[18px]">add</span>
            </span>
            Criar nova equipe
          </button>
        </div>
      )}

      {/* Fora do menu lateral (ele usa transform): o diálogo cobre a tela toda. */}
      {createPortal(
        <CriarEquipe
          aberto={criando}
          onFechar={() => setCriando(false)}
          onCriada={(nome) => {
            setCriando(false);
            onNavegar?.();
            navigate('/dashboard');
            toast.success(`Equipe ${nome} criada. Agora é só convidar as pessoas.`);
          }}
        />,
        document.body
      )}
    </div>
  );
}

function CriarEquipe({ aberto, onFechar, onCriada }) {
  const { criarEquipe } = useAuth();
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const fechar = () => {
    setNome('');
    setErro('');
    onFechar();
  };

  const criar = async (e) => {
    e.preventDefault();
    const limpo = nome.trim();
    if (limpo.length < 2) {
      setErro('Dê um nome com pelo menos 2 letras.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await criarEquipe(limpo);
      setNome('');
      onCriada(limpo);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível criar a equipe.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      dirty={!!nome.trim() && !salvando}
      title="Criar nova equipe"
      subtitle="Você será o administrador. Suas outras equipes continuam como estão."
      footer={
        <>
          <Button variant="secondary" onClick={fechar}>Cancelar</Button>
          <Button type="submit" form="form-nova-equipe" loading={salvando}>
            Criar e entrar
          </Button>
        </>
      }
    >
      <form id="form-nova-equipe" onSubmit={criar} noValidate>
        <Input
          label="Nome da equipe"
          name="nome_equipe"
          autoComplete="organization"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setErro('');
          }}
          error={erro}
          placeholder="Ex.: Loja do Centro, Agência Pixel"
          autoFocus
        />
      </form>
    </Modal>
  );
}
