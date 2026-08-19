<?php

namespace App\Services;

use App\Models\EmpresaModel;
use App\Models\UsuarioModel;
use App\Models\TokenRevogadoModel;
use App\Models\CargoModel;
use App\Models\PermissaoModel;
use App\Models\CargoPermissaoModel;

class AuthService
{
    protected EmpresaModel $empresaModel;
    protected UsuarioModel $usuarioModel;
    protected TokenRevogadoModel $tokenRevogadoModel;
    protected CargoModel $cargoModel;
    protected PermissaoModel $permissaoModel;
    protected CargoPermissaoModel $cargoPermissaoModel;

    public function __construct()
    {
        $this->empresaModel        = new EmpresaModel();
        $this->usuarioModel        = new UsuarioModel();
        $this->tokenRevogadoModel  = new TokenRevogadoModel();
        $this->cargoModel          = new CargoModel();
        $this->permissaoModel      = new PermissaoModel();
        $this->cargoPermissaoModel = new CargoPermissaoModel();
    }

    /**
     * Cria uma empresa nova e o usuário fundador (admin) dela,
     * em uma única transação.
     *
     * @throws \DomainException se e-mail ou CNPJ/CPF já estiverem em uso
     * @throws \RuntimeException se a transação falhar por outro motivo
     */
    public function registrarFundador(array $dados): array
    {
        if ($this->usuarioModel->where('email', $dados['email'])->first()) {
            throw new \DomainException('Este e-mail já está em uso.');
        }

        if ($this->empresaModel->where('cnpj_cpf', $dados['cnpj_cpf'])->first()) {
            throw new \DomainException('Este CNPJ/CPF já está cadastrado.');
        }

        $db = db_connect();
        $db->transStart();

        $empresaId = $this->empresaModel->insert([
            'nome'     => $dados['nome_empresa'],
            'cnpj_cpf' => $dados['cnpj_cpf'],
        ]);

        $cargoAdminId = $this->cargoModel->insert([
            'empresa_id' => $empresaId,
            'nome'       => 'Admin',
        ]);

        $todasPermissoes = $this->permissaoModel->findAll();

        foreach ($todasPermissoes as $permissao) {
            $this->cargoPermissaoModel->insert([
                'cargo_id'     => $cargoAdminId,
                'permissao_id' => $permissao['id'],
            ]);
        }

        $usuarioId = $this->usuarioModel->insert([
            'empresa_id' => $empresaId,
            'cargo_id'   => $cargoAdminId,
            'nome'       => $dados['nome'],
            'email'      => $dados['email'],
            'senha_hash' => password_hash($dados['senha'], PASSWORD_BCRYPT, ['cost' => 10]),
        ]);

        $this->empresaModel->update($empresaId, [
            'administrador_principal_id' => $usuarioId,
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível concluir o cadastro. Tente novamente.');
        }

        return [
            'empresa' => $this->empresaModel->find($empresaId),
            'usuario' => $this->usuarioModel->find($usuarioId),
        ];
    }

    /**
     * Autentica um usuário pelo e-mail e senha.
     *
     * @throws \DomainException se e-mail ou senha estiverem incorretos
     */
    public function autenticar(string $email, string $senha): array
    {
        $usuario = $this->usuarioModel->where('email', $email)->first();

        // Mesmo que o e-mail não exista, fazemos um password_hash() de
        // custo equivalente antes de decidir — isso evita que o tempo de
        // resposta "vaze" se aquele e-mail existe ou não (timing attack).
        $hashParaComparar = $usuario['senha_hash']
            ?? password_hash('timing-attack-dummy', PASSWORD_BCRYPT, ['cost' => 10]);

        if (! $usuario || ! password_verify($senha, $hashParaComparar)) {
            throw new \DomainException('E-mail ou senha incorretos.');
        }

        $empresa = $this->empresaModel->find($usuario['empresa_id']);

        return [
            'usuario' => $usuario,
            'empresa' => $empresa,
        ];
    }

    /**
     * Revoga um token, impedindo seu uso em requisições futuras
     * mesmo que ele ainda não tenha expirado naturalmente.
     */
    public function revogarToken(string $jti, string $usuarioId, int $expiraEmTimestamp): void
    {
        $this->tokenRevogadoModel->insert([
            'jti'        => $jti,
            'usuario_id' => $usuarioId,
            'expira_em'  => date('Y-m-d H:i:s', $expiraEmTimestamp),
        ]);
    }

    /**
     * Verifica se um token (pelo seu jti) já foi revogado.
     */
    public function tokenRevogado(string $jti): bool
    {
        return (bool) $this->tokenRevogadoModel->where('jti', $jti)->first();
    }

    /**
     * Retorna os códigos de permissão do usuário, com base no cargo dele.
     */
    public function permissoesDoUsuario(string $usuarioId): array
    {
        $usuario = $this->usuarioModel->find($usuarioId);

        if (! $usuario) {
            return [];
        }

        $permissoes = $this->cargoPermissaoModel
            ->select('permissao.codigo')
            ->join('permissao', 'permissao.id = cargo_permissao.permissao_id')
            ->where('cargo_permissao.cargo_id', $usuario['cargo_id'])
            ->findAll();

        return array_column($permissoes, 'codigo');
    }

    /**
     * Retorna a lista de permissões do usuário, ou `null` se ele não
     * existir mais (ex: foi removido da equipe). Uma única consulta,
     * reaproveitada pelo AuthFilter em toda requisição autenticada.
     */
    public function dadosDeAutorizacao(string $usuarioId): ?array
    {
        $usuario = $this->usuarioModel->find($usuarioId);

        if (! $usuario) {
            return null;
        }

        $permissoes = $this->cargoPermissaoModel
            ->select('permissao.codigo')
            ->join('permissao', 'permissao.id = cargo_permissao.permissao_id')
            ->where('cargo_permissao.cargo_id', $usuario['cargo_id'])
            ->findAll();

        return array_column($permissoes, 'codigo');
    }

    /**
     * Monta a resposta padrão de autenticação (token + usuário + empresa),
     * reaproveitada por qualquer fluxo que autentique alguém: cadastro,
     * login, ou aceite de convite.
     */
    public function montarRespostaAutenticacao(array $usuario, array $empresa): array
    {
        $token = (new JwtService())->gerar([
            'sub'        => $usuario['id'],
            'empresa_id' => $empresa['id'],
        ]);

        return [
            'token'   => $token,
            'usuario' => [
                'id'    => $usuario['id'],
                'nome'  => $usuario['nome'],
                'email' => $usuario['email'],
            ],
            'empresa' => [
                'id'   => $empresa['id'],
                'nome' => $empresa['nome'],
            ],
        ];
    }
}