import { useState } from 'react';
import { Alert, Button, Card, Input } from '../ui';
import { erroDaNovaSenha } from '../../utils/configuracoes';

const SENHAS_VAZIAS = { atual: '', nova: '', confirmar: '' };

/** Troca de senha: só valida no navegador (o backend ainda não tem o endpoint). */
export default function CartaoSenha() {
  const [senhas, setSenhas] = useState(SENHAS_VAZIAS);
  const [avisoSenha, setAvisoSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  const handleSenhaChange = (campo, valor) => setSenhas((prev) => ({ ...prev, [campo]: valor }));

  const salvarSenha = (e) => {
    e.preventDefault();
    setErroSenha('');
    setAvisoSenha('');

    const erro = erroDaNovaSenha(senhas);
    if (erro) {
      setErroSenha(erro);
      return;
    }

    setAvisoSenha('O backend ainda não expõe um endpoint para troca de senha — nada foi enviado ao servidor.');
    setSenhas(SENHAS_VAZIAS);
  };

  return (
    <Card as="form" onSubmit={salvarSenha} className="flex flex-col gap-5">
      <h2 className="text-base font-semibold">Senha</h2>

      <Input label="Senha atual" name="senha_atual" autoComplete="current-password" type="password" value={senhas.atual} onChange={(e) => handleSenhaChange('atual', e.target.value)} />
      <Input label="Nova senha" name="nova_senha" autoComplete="new-password" type="password" hint="Mínimo de 8 caracteres." value={senhas.nova} onChange={(e) => handleSenhaChange('nova', e.target.value)} />
      <Input label="Confirmar nova senha" name="confirmar_senha" autoComplete="new-password" type="password" value={senhas.confirmar} onChange={(e) => handleSenhaChange('confirmar', e.target.value)} />

      {erroSenha && <Alert variant="error">{erroSenha}</Alert>}
      {avisoSenha && <Alert variant="warning">{avisoSenha}</Alert>}

      <div className="flex justify-end">
        <Button type="submit" variant="secondary">Atualizar senha</Button>
      </div>
    </Card>
  );
}
