<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CargoModel;
use App\Models\ConviteModel;
use App\Models\EmpresaModel;
use App\Models\UsuarioModel;

class EquipeService
{
    private const VALIDADE_CONVITE_SEGUNDOS = 7 * 24 * 60 * 60; // 7 dias

    protected EmpresaModel $empresaModel;
    protected UsuarioModel $usuarioModel;
    protected CargoModel $cargoModel;
    protected ConviteModel $conviteModel;

    public function __construct()
    {
        $this->empresaModel = new EmpresaModel();
        $this->usuarioModel = new UsuarioModel();
        $this->cargoModel   = new CargoModel();
        $this->conviteModel = new ConviteModel();
    }

    /**
     * Gera um convite e devolve o token em texto puro — única vez que
     * ele existe assim; o banco só guarda o hash.
     *
     * @throws NaoEncontradoException se o cargo não existir/pertencer à empresa
     * @throws \DomainException se o e-mail já tiver conta em algum lugar do sistema
     */
    public function convidar(string $empresaId, string $convidadoPorId, string $email, string $cargoId): array
    {
        $cargo = $this->cargoModel
            ->where('id', $cargoId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $cargo) {
            throw new NaoEncontradoException('Cargo não encontrado.');
        }

        if ($this->usuarioModel->where('email', $email)->first()) {
            throw new \DomainException('Este e-mail já está associado a uma conta existente.');
        }

        $tokenTexto = bin2hex(random_bytes(32));

        $conviteId = $this->conviteModel->insert([
            'empresa_id'         => $empresaId,
            'convidado_por'      => $convidadoPorId,
            'cargo_id'           => $cargoId,
            'email_destinatario' => $email,
            'token_hash'         => hash('sha256', $tokenTexto),
            'expira_em'          => date('Y-m-d H:i:s', time() + self::VALIDADE_CONVITE_SEGUNDOS),
        ]);

        return [
            'convite_id' => $conviteId,
            'token'      => $tokenTexto,
        ];
    }

    /**
     * Aceita um convite: cria o usuário vinculado à empresa/cargo do
     * convite, e marca o convite como usado.
     *
     * @throws \DomainException se o token for inválido, expirado, já usado,
     *         ou o e-mail já tiver sido registrado por outro caminho
     */
    public function aceitarConvite(string $tokenTexto, string $nome, string $senha): array
    {
        $convite = $this->conviteModel
            ->where('token_hash', hash('sha256', $tokenTexto))
            ->first();

        if (! $convite) {
            throw new \DomainException('Convite inválido.');
        }

        if ($convite['aceito_em'] !== null) {
            throw new \DomainException('Este convite já foi utilizado.');
        }

        if (strtotime($convite['expira_em']) < time()) {
            throw new \DomainException('Este convite expirou.');
        }

        if ($this->usuarioModel->where('email', $convite['email_destinatario'])->first()) {
            throw new \DomainException('Este e-mail já está associado a uma conta existente.');
        }

        $db = db_connect();
        $db->transStart();

        $usuarioId = $this->usuarioModel->insert([
            'empresa_id' => $convite['empresa_id'],
            'cargo_id'   => $convite['cargo_id'],
            'nome'       => $nome,
            'email'      => $convite['email_destinatario'],
            'senha_hash' => password_hash($senha, PASSWORD_BCRYPT, ['cost' => 10]),
        ]);

        $this->conviteModel->update($convite['id'], [
            'aceito_em' => date('Y-m-d H:i:s'),
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível aceitar o convite. Tente novamente.');
        }

        return [
            'usuario' => $this->usuarioModel->find($usuarioId),
            'empresa' => $this->empresaModel->find($convite['empresa_id']),
        ];
    }

    public function listarMembros(string $empresaId): array
    {
        return $this->usuarioModel
            ->select('usuario.id, usuario.nome, usuario.email, usuario.criado_em, cargo.nome as cargo_nome')
            ->join('cargo', 'cargo.id = usuario.cargo_id')
            ->where('usuario.empresa_id', $empresaId)
            ->orderBy('usuario.criado_em', 'ASC')
            ->findAll();
    }

    /**
     * @throws NaoEncontradoException se o membro não existir/pertencer à empresa
     * @throws \DomainException se for o administrador principal
     */
    public function removerMembro(string $usuarioId, string $empresaId): void
    {
        $usuario = $this->usuarioModel
            ->where('id', $usuarioId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $usuario) {
            throw new NaoEncontradoException('Membro não encontrado.');
        }

        $empresa = $this->empresaModel->find($empresaId);

        if ($empresa['administrador_principal_id'] === $usuarioId) {
            throw new \DomainException('Não é possível remover o administrador principal da empresa.');
        }

        $this->usuarioModel->delete($usuarioId);
    }
}