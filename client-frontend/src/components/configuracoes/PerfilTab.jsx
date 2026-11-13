import { useState } from 'react';
import { Alert, Button, Card, Input, Textarea } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { mascararTelefone } from '../../utils/masks';
import { getAvatar, setAvatar } from '../../utils/avatarStorage';
import { useImagemGuardada } from './useImagemGuardada';
import CabecalhoComImagem from './CabecalhoComImagem';
import CartaoSenha from './CartaoSenha';

/** Aba "Perfil": foto, dados da pessoa e senha. */
export default function PerfilTab() {
  const { usuario, iniciais } = useAuth();

  const [perfil, setPerfil] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    telefone: '',
    linkedin: '',
    bio: '',
  });
  const [avisoPerfil, setAvisoPerfil] = useState('');
  const foto = useImagemGuardada(getAvatar, setAvatar, usuario?.id);

  const handlePerfilChange = (campo, valor) => setPerfil((prev) => ({ ...prev, [campo]: valor }));

  const salvarPerfil = (e) => {
    e.preventDefault();
    setAvisoPerfil('Alterações mantidas nesta sessão. O backend ainda não expõe um endpoint para salvar o perfil.');
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card as="form" onSubmit={salvarPerfil} className="flex flex-col gap-6">
        <CabecalhoComImagem
          titulo="Informações do perfil"
          imagem={foto}
          rotuloRemover="Remover foto"
          fallback={<span className="text-2xl font-bold text-primary">{iniciais}</span>}
        />

        {foto.erro && <Alert variant="error" className="-mt-2">{foto.erro}</Alert>}

        <Input label="Nome completo" name="nome" autoComplete="name" type="text" value={perfil.nome} onChange={(e) => handlePerfilChange('nome', e.target.value)} />
        <Input label="E-mail" name="email" autoComplete="email" inputMode="email" type="email" value={perfil.email} onChange={(e) => handlePerfilChange('email', e.target.value)} />
        <Input label="Telefone" name="telefone" autoComplete="tel" inputMode="tel" type="tel" value={perfil.telefone} onChange={(e) => handlePerfilChange('telefone', mascararTelefone(e.target.value))} placeholder="(00) 00000-0000" />
        <Input label="LinkedIn" name="linkedin" autoComplete="off" type="text" value={perfil.linkedin} onChange={(e) => handlePerfilChange('linkedin', e.target.value)} placeholder="linkedin.com/in/seu-perfil" />
        <Textarea label="Bio" value={perfil.bio} onChange={(e) => handlePerfilChange('bio', e.target.value)} rows={3} placeholder="Uma breve descrição sobre você" />

        {avisoPerfil && <Alert variant="warning">{avisoPerfil}</Alert>}

        <div className="flex justify-end">
          <Button type="submit">Salvar alterações</Button>
        </div>
      </Card>

      <CartaoSenha />
    </div>
  );
}
