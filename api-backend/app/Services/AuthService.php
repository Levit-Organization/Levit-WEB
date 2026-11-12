<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\EmpresaModel;
use App\Models\MembroModel;
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
    protected MembroModel $membroModel;

    public function __construct()
    {
        $this->empresaModel        = new EmpresaModel();
        $this->usuarioModel        = new UsuarioModel();
        $this->tokenRevogadoModel  = new TokenRevogadoModel();
        $this->cargoModel          = new CargoModel();
        $this->permissaoModel      = new PermissaoModel();
        $this->cargoPermissaoModel = new CargoPermissaoModel();
        $this->membroModel         = new MembroModel();
    }

    /**
     * Cadastro: cria a equipe (empresa) e deixa quem cadastrou como
     * administrador dela. CPF/CNPJ é opcional.
     *
     * Se o e-mail já tem conta, a mesma pessoa está criando mais uma equipe:
     * com a senha certa, a equipe nova entra na conta que já existe (uma
     * pessoa, várias equipes). Com a senha errada, nada é criado.
     *
     * @throws \DomainException se o e-mail já tiver conta e a senha não conferir, ou se o documento já estiver em uso
     * @throws \RuntimeException se a transação falhar por outro motivo
     */
    public function registrarFundador(array $dados): array
    {
        // E-mail sempre em minúsculas: Foo@x.com e foo@x.com são a mesma conta.
        $dados['email'] = mb_strtolower(trim($dados['email']));
        $documento      = self::documentoOuNulo($dados['cnpj_cpf'] ?? null);

        $existente = $this->usuarioModel->where('LOWER(email)', $dados['email'])->first();

        if ($existente && ! password_verify($dados['senha'], $existente['senha_hash'])) {
            throw new \DomainException('Este e-mail já tem conta no Levit. Para criar outra equipe com ele, use a senha dessa conta, ou entre e crie a equipe pelo menu.');
        }

        $this->exigirDocumentoLivre($documento);

        $db = db_connect();
        $db->transStart();

        $usuarioId = $existente['id'] ?? $this->usuarioModel->insert([
            'nome'       => $dados['nome'],
            'email'      => $dados['email'],
            'senha_hash' => password_hash($dados['senha'], PASSWORD_BCRYPT, ['cost' => 10]),
        ]);

        $empresa = $this->criarEquipe($usuarioId, $dados['nome_empresa'], $documento);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível concluir o cadastro. Tente novamente.');
        }

        return [
            'usuario' => $this->usuarioModel->find($usuarioId),
            'empresa' => $empresa,
        ];
    }

    /**
     * Equipe nova com a pessoa como administradora principal: cargo "Admin"
     * com acesso total e todas as permissões.
     *
     * @throws \DomainException se o CPF/CNPJ informado já estiver em uso
     */
    public function criarEquipe(string $usuarioId, string $nome, ?string $documento = null): array
    {
        $documento = self::documentoOuNulo($documento);
        $this->exigirDocumentoLivre($documento);

        $db = db_connect();
        $db->transStart();

        $empresaId = $this->empresaModel->insert([
            'nome'     => trim($nome),
            'cnpj_cpf' => $documento,
        ]);

        $cargoAdminId = $this->cargoModel->insert([
            'empresa_id'   => $empresaId,
            'nome'         => 'Admin',
            'acesso_total' => true,
        ]);

        foreach ($this->permissaoModel->findAll() as $permissao) {
            $this->cargoPermissaoModel->insert([
                'cargo_id'     => $cargoAdminId,
                'permissao_id' => $permissao['id'],
            ]);
        }

        $this->membroModel->insert([
            'usuario_id' => $usuarioId,
            'empresa_id' => $empresaId,
            'cargo_id'   => $cargoAdminId,
        ]);

        $this->empresaModel->update($empresaId, ['administrador_principal_id' => $usuarioId]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar a equipe. Tente novamente.');
        }

        return $this->empresaModel->find($empresaId);
    }

    /** CPF/CNPJ só com dígitos, ou null quando não foi informado. */
    public static function documentoOuNulo(?string $documento): ?string
    {
        $digitos = preg_replace('/\D/', '', (string) $documento);

        return $digitos === '' ? null : $digitos;
    }

    private function exigirDocumentoLivre(?string $documento): void
    {
        if ($documento !== null && $this->empresaModel->where('cnpj_cpf', $documento)->first()) {
            throw new \DomainException('Este CNPJ/CPF já está cadastrado em outra equipe.');
        }
    }

    /**
     * Autentica pelo e-mail e senha e escolhe a equipe de entrada: a última
     * aberta, se a pessoa ainda faz parte dela, senão a mais antiga.
     *
     * @throws \DomainException se e-mail ou senha estiverem incorretos, ou se a pessoa não estiver em nenhuma equipe
     */
    public function autenticar(string $email, string $senha): array
    {
        $usuario = $this->usuarioModel
            ->where('LOWER(email)', mb_strtolower(trim($email)))
            ->first();

        // Mesmo que o e-mail não exista, fazemos um password_hash() de
        // custo equivalente antes de decidir — isso evita que o tempo de
        // resposta "vaze" se aquele e-mail existe ou não (timing attack).
        $hashParaComparar = $usuario['senha_hash']
            ?? password_hash('timing-attack-dummy', PASSWORD_BCRYPT, ['cost' => 10]);

        if (! $usuario || ! password_verify($senha, $hashParaComparar)) {
            throw new \DomainException('E-mail ou senha incorretos.');
        }

        $empresa = db_connect()->query(
            'SELECT e.id, e.nome FROM membro m JOIN empresa e ON e.id = m.empresa_id
              WHERE m.usuario_id = ?
              ORDER BY (m.empresa_id = ?) IS TRUE DESC, m.criado_em ASC
              LIMIT 1',
            [$usuario['id'], $usuario['ultima_empresa_id']]
        )->getRowArray();

        if (! $empresa) {
            throw new \DomainException('Você ainda não faz parte de nenhuma equipe. Peça um convite a quem administra a equipe, ou crie uma nova em "Criar conta" com este mesmo e-mail e senha.');
        }

        return ['usuario' => $usuario, 'empresa' => $empresa];
    }

    /**
     * Equipes de que a pessoa faz parte, com o cargo em cada uma.
     *
     * @return list<array{id: string, nome: string, cargo_nome: string, administrador_principal: bool}>
     */
    public function equipesDoUsuario(string $usuarioId): array
    {
        $equipes = db_connect()->query(
            'SELECT e.id, e.nome, c.nome AS cargo_nome,
                    (e.administrador_principal_id = m.usuario_id) IS TRUE AS administrador_principal
               FROM membro m
               JOIN empresa e ON e.id = m.empresa_id
               JOIN cargo c ON c.id = m.cargo_id
              WHERE m.usuario_id = ?
              ORDER BY e.nome',
            [$usuarioId]
        )->getResultArray();

        foreach ($equipes as &$equipe) {
            $equipe['administrador_principal'] = $this->paraBooleano($equipe['administrador_principal']);
        }

        return $equipes;
    }

    /**
     * Equipe para onde a pessoa quer ir, desde que faça parte dela.
     *
     * @throws NaoEncontradoException se a pessoa não faz parte da equipe
     */
    public function equipeDoUsuario(string $usuarioId, string $empresaId): array
    {
        $empresa = $this->empresaModel
            ->select('empresa.id, empresa.nome')
            ->join('membro', 'membro.empresa_id = empresa.id')
            ->where('membro.usuario_id', $usuarioId)
            ->where('empresa.id', $empresaId)
            ->first();

        if (! $empresa) {
            throw new NaoEncontradoException('Você não faz parte dessa equipe.');
        }

        return $empresa;
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

    /**
     * Tudo o que o filtro de autenticação precisa, numa única ida ao banco:
     * se o token foi revogado, o cargo, a flag de acesso total, as permissões
     * do cargo, o nível do cargo em cada tabela e quando a senha mudou pela
     * última vez. Com banco remoto, cada consulta a menos é uma volta de rede
     * a menos em toda requisição (os níveis evitam mais uma consulta em toda
     * rota de tabela).
     *
     * Retorna `null` se o usuário não existir mais ou não fizer mais parte
     * da equipe do token (foi removido dela).
     *
     * @return array{revogado: bool, cargo_id: string, acesso_total: bool, permissoes: string[], niveis: array<string, string>, senha_alterada_em: ?string}|null
     */
    public function contextoDeAutenticacao(string $usuarioId, string $empresaId, string $jti): ?array
    {
        // Token sem equipe válida não chega ao banco (o cast para UUID quebraria a consulta).
        $uuid = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
        if (! preg_match($uuid, $usuarioId) || ! preg_match($uuid, $empresaId)) {
            return null;
        }

        // Enquanto a migração da coluna não rodou, a consulta segue sem ela.
        $senhaAlterada = self::temColunaSenhaAlteradaEm() ? 'u.senha_alterada_em' : 'NULL';

        $linha = db_connect()->query(
            // O criador da empresa (administrador principal) tem sempre acesso
            // total, mesmo que o cargo dele tenha perdido a marca: senão a
            // empresa pode ficar sem ninguém capaz de administrá-la.
            // O cargo é o da pessoa na equipe do token: em outra equipe ela pode ter outro.
            "SELECT m.cargo_id, (c.acesso_total OR e.administrador_principal_id = u.id) AS acesso_total,
                    {$senhaAlterada} AS senha_alterada_em,
                    EXISTS (SELECT 1 FROM token_revogado tr WHERE tr.jti = ?) AS revogado,
                    (SELECT COALESCE(json_agg(p.codigo), '[]')
                       FROM cargo_permissao cp JOIN permissao p ON p.id = cp.permissao_id
                      WHERE cp.cargo_id = m.cargo_id) AS permissoes,
                    (SELECT COALESCE(json_object_agg(cmp.modulo_id, cmp.nivel), '{}')
                       FROM cargo_modulo_permissao cmp
                      WHERE cmp.cargo_id = m.cargo_id) AS niveis
               FROM usuario u
               JOIN membro m ON m.usuario_id = u.id AND m.empresa_id = ?
               JOIN cargo c ON c.id = m.cargo_id
               JOIN empresa e ON e.id = m.empresa_id
              WHERE u.id = ?",
            [$jti, $empresaId, $usuarioId]
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
     * login, aceite de convite, troca e criação de equipe. `equipes` lista
     * todas as equipes da pessoa, para o seletor do menu.
     */
    public function montarRespostaAutenticacao(array $usuario, array $empresa): array
    {
        // O próximo login volta para esta equipe.
        if (($usuario['ultima_empresa_id'] ?? null) !== $empresa['id']) {
            $this->usuarioModel->update($usuario['id'], ['ultima_empresa_id' => $empresa['id']]);
        }

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
            'equipes' => $this->equipesDoUsuario($usuario['id']),
        ];
    }
}