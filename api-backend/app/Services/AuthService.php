<?php

namespace App\Services;

use App\Models\EmpresaModel;
use App\Models\UsuarioModel;
use App\Models\TokenRevogadoModel;
use App\Models\CargoModel;
use App\Models\PermissaoModel;
use App\Models\CargoPermissaoModel;
use App\Services\Email\ModeloRedefinicaoSenha;

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
        // E-mail sempre em minúsculas: Foo@x.com e foo@x.com são a mesma conta.
        $dados['email'] = mb_strtolower(trim($dados['email']));

        if ($this->usuarioModel->where('LOWER(email)', $dados['email'])->first()) {
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
            'empresa_id'   => $empresaId,
            'nome'         => 'Admin',
            'acesso_total' => true,
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
        // Usuário e empresa numa consulta só (antes eram duas idas ao banco).
        $usuario = $this->usuarioModel
            ->select('usuario.*, empresa.nome AS empresa_nome')
            ->join('empresa', 'empresa.id = usuario.empresa_id')
            ->where('LOWER(usuario.email)', mb_strtolower(trim($email)))
            ->first();

        // Mesmo que o e-mail não exista, fazemos um password_hash() de
        // custo equivalente antes de decidir — isso evita que o tempo de
        // resposta "vaze" se aquele e-mail existe ou não (timing attack).
        $hashParaComparar = $usuario['senha_hash']
            ?? password_hash('timing-attack-dummy', PASSWORD_BCRYPT, ['cost' => 10]);

        if (! $usuario || ! password_verify($senha, $hashParaComparar)) {
            throw new \DomainException('E-mail ou senha incorretos.');
        }

        return [
            'usuario' => $usuario,
            'empresa' => ['id' => $usuario['empresa_id'], 'nome' => $usuario['empresa_nome']],
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
    private const VALIDADE_REDEFINICAO_MINUTOS = 60;

    /**
     * Gera um link de redefinição e manda por e-mail. Não diz se o e-mail
     * existe (quem chama sempre responde a mesma coisa): evita descobrir
     * contas pelo formulário. O banco guarda só o hash do token.
     */
    public function solicitarRedefinicaoDeSenha(string $email): void
    {
        $usuario = $this->usuarioModel->where('LOWER(email)', mb_strtolower(trim($email)))->first();
        if (! $usuario) {
            return;
        }

        $token = bin2hex(random_bytes(32));
        $this->usuarioModel->update($usuario['id'], [
            'reset_hash'       => hash('sha256', $token),
            'reset_expires_at' => date('Y-m-d H:i:s', time() + self::VALIDADE_REDEFINICAO_MINUTOS * 60),
        ]);

        $html = ModeloRedefinicaoSenha::html([
            'nome'             => $usuario['nome'],
            'link'             => rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/reset-password?token=' . $token,
            'minutos_validade' => self::VALIDADE_REDEFINICAO_MINUTOS,
        ]);

        // O envio acontece depois da resposta: se fosse antes, a resposta para
        // um e-mail cadastrado demoraria mais que para um inexistente, e isso
        // denunciaria quem tem conta. Com PHP-FPM a conexão fecha antes do envio.
        $email = $usuario['email'];
        register_shutdown_function(static function () use ($email, $html) {
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            }

            try {
                service('email')->enviar($email, ModeloRedefinicaoSenha::ASSUNTO, $html);
            } catch (\Throwable $e) {
                // A resposta ao usuário é sempre a mesma; a falha fica registrada para quem administra.
                log_message('error', 'Falha ao enviar redefinição de senha: {erro}', ['erro' => $e->getMessage()]);
            }
        });
    }

    /**
     * Troca a senha usando o token do e-mail. O token vale uma vez só.
     *
     * @throws \DomainException se o link for inválido, já usado ou expirado
     */
    public function redefinirSenha(string $token, string $senha): void
    {
        $usuario = $this->usuarioModel
            ->where('reset_hash', hash('sha256', $token))
            ->where('reset_expires_at >', date('Y-m-d H:i:s'))
            ->first();

        if (! $usuario) {
            throw new \DomainException('Este link não vale mais. Peça um novo em "Esqueceu a senha?".');
        }

        $campos = [
            'senha_hash'       => password_hash($senha, PASSWORD_BCRYPT, ['cost' => 10]),
            'reset_hash'       => null,
            'reset_expires_at' => null,
        ];
        // Derruba as sessões abertas: tokens emitidos antes disso deixam de valer.
        if (self::temColunaSenhaAlteradaEm()) {
            $campos['senha_alterada_em'] = date('Y-m-d H:i:s');
        }
        $this->usuarioModel->update($usuario['id'], $campos);
    }

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
     * Tudo o que o filtro de autenticação precisa, numa única ida ao banco:
     * se o token foi revogado, o cargo, a flag de acesso total, as permissões
     * do cargo, o nível do cargo em cada tabela e quando a senha mudou pela
     * última vez. Com banco remoto, cada consulta a menos é uma volta de rede
     * a menos em toda requisição (os níveis evitam mais uma consulta em toda
     * rota de tabela).
     *
     * Retorna `null` se o usuário não existir mais.
     *
     * @return array{revogado: bool, cargo_id: string, acesso_total: bool, permissoes: string[], niveis: array<string, string>, senha_alterada_em: ?string}|null
     */
    public function contextoDeAutenticacao(string $usuarioId, string $jti): ?array
    {
        // Enquanto a migração da coluna não rodou, a consulta segue sem ela.
        $senhaAlterada = self::temColunaSenhaAlteradaEm() ? 'u.senha_alterada_em' : 'NULL';

        $linha = db_connect()->query(
            // O criador da empresa (administrador principal) tem sempre acesso
            // total, mesmo que o cargo dele tenha perdido a marca: senão a
            // empresa pode ficar sem ninguém capaz de administrá-la.
            "SELECT u.cargo_id, (c.acesso_total OR e.administrador_principal_id = u.id) AS acesso_total,
                    {$senhaAlterada} AS senha_alterada_em,
                    EXISTS (SELECT 1 FROM token_revogado tr WHERE tr.jti = ?) AS revogado,
                    (SELECT COALESCE(json_agg(p.codigo), '[]')
                       FROM cargo_permissao cp JOIN permissao p ON p.id = cp.permissao_id
                      WHERE cp.cargo_id = u.cargo_id) AS permissoes,
                    (SELECT COALESCE(json_object_agg(cmp.modulo_id, cmp.nivel), '{}')
                       FROM cargo_modulo_permissao cmp
                      WHERE cmp.cargo_id = u.cargo_id) AS niveis
               FROM usuario u
               JOIN cargo c ON c.id = u.cargo_id
               JOIN empresa e ON e.id = u.empresa_id
              WHERE u.id = ?",
            [$jti, $usuarioId]
        )->getRowArray();

        if (! $linha) {
            return null;
        }

        return [
            'revogado'          => $this->paraBooleano($linha['revogado']),
            'cargo_id'          => $linha['cargo_id'],
            'acesso_total'      => $this->paraBooleano($linha['acesso_total'] ?? false),
            'permissoes'        => json_decode((string) $linha['permissoes'], true) ?: [],
            'niveis'            => json_decode((string) $linha['niveis'], true) ?: [],
            'senha_alterada_em' => $linha['senha_alterada_em'],
        ];
    }

    /**
     * A coluna `usuario.senha_alterada_em` vem de uma migração nova. Até ela
     * rodar, o código não pode depender dela (senão ninguém autentica). A
     * resposta fica em cache para não custar uma consulta por requisição.
     */
    public static function temColunaSenhaAlteradaEm(): bool
    {
        $emCache = cache('schema_usuario_senha_alterada_em');
        if ($emCache !== null) {
            return $emCache === 1;
        }

        $existe = db_connect()->fieldExists('senha_alterada_em', 'usuario');
        // Se ainda não existe, confere de novo em 10 minutos (a migração pode rodar a qualquer hora).
        cache()->save('schema_usuario_senha_alterada_em', $existe ? 1 : 0, $existe ? DAY : 600);

        return $existe;
    }

    /**
     * Retorna cargo, permissões globais e a flag de acesso total do
     * usuário — ou `null` se ele não existir mais.
     */
    public function dadosDeAutorizacao(string $usuarioId): ?array
    {
        $usuario = $this->usuarioModel->find($usuarioId);

        if (! $usuario) {
            return null;
        }

        $cargo   = $this->cargoModel->find($usuario['cargo_id']);
        $empresa = $this->empresaModel->find($usuario['empresa_id']);

        $permissoes = $this->cargoPermissaoModel
            ->select('permissao.codigo')
            ->join('permissao', 'permissao.id = cargo_permissao.permissao_id')
            ->where('cargo_permissao.cargo_id', $usuario['cargo_id'])
            ->findAll();

        return [
            'cargo_id'     => $usuario['cargo_id'],
            'acesso_total' => $this->paraBooleano($cargo['acesso_total'] ?? false)
                || ($empresa['administrador_principal_id'] ?? null) === $usuarioId,
            'permissoes'   => array_column($permissoes, 'codigo'),
        ];
    }

    /**
     * Normaliza um valor BOOLEAN vindo do banco para bool do PHP.
     *
     * Existe porque o driver Postgre pode devolver colunas BOOLEAN como
     * bool nativo, inteiro (0/1) ou string curta ('t'/'f') dependendo do
     * modo de fetch — filter_var(FILTER_VALIDATE_BOOLEAN) não cobre o
     * caso 't'/'f', então tratamos manualmente para não depender de um
     * formato específico de driver/config.
     */
    private function paraBooleano($valor): bool
    {
        if (is_bool($valor)) {
            return $valor;
        }

        return in_array($valor, [1, '1', 't', 'true'], true);
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