<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CargoModel;
use App\Models\ConviteModel;
use App\Models\EmpresaModel;
use App\Models\UsuarioModel;
use App\Services\Email\ModeloConvite;

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
     * Convida alguém para a equipe e envia o e-mail com o link de aceite.
     *
     * Se a pessoa já tiver um convite pendente nesta empresa, ele é
     * reaproveitado (novo link, nova validade, cargo e mensagem atualizados)
     * em vez de criar outro. O token só existe em texto puro dentro do
     * e-mail: o banco guarda o hash e a API não o devolve.
     *
     * @throws NaoEncontradoException se o cargo não existir/pertencer à empresa
     * @throws \DomainException se o e-mail já tiver conta em algum lugar do sistema
     * @throws \RuntimeException se o e-mail não puder ser enviado (o convite não fica criado)
     */
    public function convidar(string $empresaId, string $convidadoPorId, string $email, string $cargoId, ?string $mensagem = null): array
    {
        $email    = mb_strtolower(trim($email));
        $mensagem = $mensagem !== null && trim($mensagem) !== '' ? trim($mensagem) : null;

        $cargo = $this->cargoModel
            ->where('id', $cargoId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $cargo) {
            throw new NaoEncontradoException('Cargo não encontrado.');
        }

        (new LimiteDeAcesso())->exigirPodeAtuarNoCargo($cargoId);

        if ($this->usuarioModel->where('LOWER(email)', $email)->first()) {
            throw new \DomainException('Este e-mail já está associado a uma conta existente.');
        }

        $existente = $this->conviteModel
            ->where('empresa_id', $empresaId)
            ->where('email_destinatario', $email)
            ->where('aceito_em', null)
            ->first();

        $tokenTexto = bin2hex(random_bytes(32));
        $campos     = [
            'convidado_por' => $convidadoPorId,
            'cargo_id'      => $cargoId,
            'mensagem'      => $mensagem,
            'token_hash'    => hash('sha256', $tokenTexto),
            'expira_em'     => date('Y-m-d H:i:s', time() + self::VALIDADE_CONVITE_SEGUNDOS),
        ];

        if ($existente) {
            $conviteId = $existente['id'];
            $this->conviteModel->update($conviteId, $campos);
        } else {
            $conviteId = $this->conviteModel->insert($campos + [
                'empresa_id'         => $empresaId,
                'email_destinatario' => $email,
            ]);
        }

        try {
            $this->enviarEmailDoConvite($conviteId, $tokenTexto);
        } catch (\Throwable $e) {
            // Sem e-mail a pessoa não tem como aceitar: um convite novo é desfeito.
            if (! $existente) {
                $this->conviteModel->delete($conviteId);
            }
            log_message('error', 'Falha ao enviar convite: {erro}', ['erro' => $e->getMessage()]);

            throw new \RuntimeException('O serviço de e-mail não conseguiu enviar o convite agora. Tente de novo em instantes; se continuar, avise quem administra o Levit.', 0, $e);
        }

        AtividadeService::registrar('membro_convidado', "Convidou {$email} para a equipe (cargo {$cargo['nome']})");

        return $this->resumoDoConvite($this->conviteModel->find($conviteId));
    }

    /** Convites ainda não aceitos da empresa (inclui os expirados, marcados como tal). */
    public function listarConvitesPendentes(string $empresaId): array
    {
        $convites = $this->conviteModel
            ->select('convite.*, cargo.nome AS cargo_nome, usuario.nome AS convidado_por_nome')
            ->join('cargo', 'cargo.id = convite.cargo_id')
            ->join('usuario', 'usuario.id = convite.convidado_por', 'left')
            ->where('convite.empresa_id', $empresaId)
            ->where('convite.aceito_em', null)
            ->orderBy('convite.criado_em', 'DESC')
            ->findAll();

        return array_map(fn (array $c) => $this->resumoDoConvite($c), $convites);
    }

    /** Novo link e nova validade, e manda o e-mail de novo. */
    public function reenviarConvite(string $empresaId, string $conviteId, string $usuarioId): array
    {
        $convite = $this->convitePendente($empresaId, $conviteId);

        $tokenTexto = bin2hex(random_bytes(32));
        $this->conviteModel->update($conviteId, [
            'convidado_por' => $usuarioId,
            'token_hash'    => hash('sha256', $tokenTexto),
            'expira_em'     => date('Y-m-d H:i:s', time() + self::VALIDADE_CONVITE_SEGUNDOS),
        ]);

        try {
            $this->enviarEmailDoConvite($conviteId, $tokenTexto);
        } catch (\Throwable $e) {
            log_message('error', 'Falha ao reenviar convite: {erro}', ['erro' => $e->getMessage()]);

            throw new \RuntimeException('Não foi possível reenviar o e-mail do convite. Tente de novo em instantes.', 0, $e);
        }

        return $this->resumoDoConvite($this->conviteModel->find($convite['id']));
    }

    /** O link deixa de funcionar na hora. */
    public function cancelarConvite(string $empresaId, string $conviteId): void
    {
        $this->convitePendente($empresaId, $conviteId);
        $this->conviteModel->delete($conviteId);
        AtividadeService::registrar('convite_cancelado', 'Cancelou um convite pendente');
    }

    /**
     * O que a página pública do convite mostra antes de a pessoa aceitar.
     * Não revela nada além do necessário para ela decidir.
     *
     * @throws NaoEncontradoException se o token não existir
     */
    public function detalhesDoConvite(string $tokenTexto): array
    {
        $convite = $this->conviteModel
            ->select('convite.*, cargo.nome AS cargo_nome, usuario.nome AS convidado_por_nome, empresa.nome AS empresa_nome')
            ->join('cargo', 'cargo.id = convite.cargo_id')
            ->join('empresa', 'empresa.id = convite.empresa_id')
            ->join('usuario', 'usuario.id = convite.convidado_por', 'left')
            ->where('convite.token_hash', hash('sha256', $tokenTexto))
            ->first();

        if (! $convite) {
            throw new NaoEncontradoException('Convite não encontrado. O link pode ter sido substituído por um mais novo.');
        }

        return [
            'email'         => $convite['email_destinatario'],
            'empresa'       => $convite['empresa_nome'],
            'cargo'         => $convite['cargo_nome'],
            'convidado_por' => $convite['convidado_por_nome'],
            'mensagem'      => $convite['mensagem'] ?? null,
            'expira_em'     => $convite['expira_em'],
            'status'        => $convite['aceito_em'] !== null ? 'aceito' : (strtotime($convite['expira_em']) < time() ? 'expirado' : 'valido'),
        ];
    }

    private function enviarEmailDoConvite(string $conviteId, string $tokenTexto): void
    {
        $convite = $this->conviteModel
            ->select('convite.*, cargo.nome AS cargo_nome, usuario.nome AS convidado_por_nome, empresa.nome AS empresa_nome')
            ->join('cargo', 'cargo.id = convite.cargo_id')
            ->join('empresa', 'empresa.id = convite.empresa_id')
            ->join('usuario', 'usuario.id = convite.convidado_por', 'left')
            ->where('convite.id', $conviteId)
            ->first();

        $dados = [
            'convidado_por' => $convite['convidado_por_nome'] ?: 'Alguém da equipe',
            'empresa'       => $convite['empresa_nome'],
            'cargo'         => $convite['cargo_nome'],
            'mensagem'      => $convite['mensagem'] ?? null,
            'link'          => self::linkDoConvite($tokenTexto),
            'dias_validade' => intdiv(self::VALIDADE_CONVITE_SEGUNDOS, 86400),
        ];

        service('email')->enviar($convite['email_destinatario'], ModeloConvite::assunto($dados), ModeloConvite::html($dados));
    }

    /** Endereço da página de aceite no frontend (FRONTEND_URL no .env). */
    public static function linkDoConvite(string $tokenTexto): string
    {
        return rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/convite/' . $tokenTexto;
    }

    private function convitePendente(string $empresaId, string $conviteId): array
    {
        $convite = $this->conviteModel
            ->where('id', $conviteId)
            ->where('empresa_id', $empresaId)
            ->where('aceito_em', null)
            ->first();

        if (! $convite) {
            throw new NaoEncontradoException('Convite não encontrado ou já aceito.');
        }

        return $convite;
    }

    /** Formato devolvido pela API: nunca inclui o token nem o hash. */
    private function resumoDoConvite(array $c): array
    {
        return [
            'id'                 => $c['id'],
            'email'              => $c['email_destinatario'],
            'cargo_id'           => $c['cargo_id'],
            'cargo_nome'         => $c['cargo_nome'] ?? null,
            'convidado_por_nome' => $c['convidado_por_nome'] ?? null,
            'mensagem'           => $c['mensagem'] ?? null,
            'criado_em'          => $c['criado_em'] ?? null,
            'expira_em'          => $c['expira_em'],
            'expirado'           => strtotime($c['expira_em']) < time(),
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

        if ($this->usuarioModel->where('LOWER(email)', mb_strtolower($convite['email_destinatario']))->first()) {
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

        $notificacoes = new NotificacaoService();
        $notificacoes->notificarSemFalhar(
            $convite['convidado_por'] ? [$convite['convidado_por']] : $notificacoes->administradores($convite['empresa_id']),
            $convite['empresa_id'],
            [
                'tipo'     => 'convite_aceito',
                'titulo'   => "{$nome} entrou na equipe",
                'mensagem' => "Convite aceito por {$convite['email_destinatario']}.",
                'link'     => '/team',
            ]
        );

        // Ainda sem sessão: a própria pessoa aparece como autora.
        AtividadeService::registrar('membro_entrou', "Entrou na equipe pelo convite ({$convite['email_destinatario']})", null, null, $convite['empresa_id'], $nome);

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
     * Nome de todos da empresa, para escolher o responsável de um item. Não
     * exige permissão de ver a equipe (quem preenche uma tabela precisa
     * escolher alguém) e por isso não devolve e-mail nem cargo.
     */
    public function listarPessoas(string $empresaId): array
    {
        return $this->usuarioModel
            ->select('id, nome')
            ->where('empresa_id', $empresaId)
            ->orderBy('nome', 'ASC')
            ->findAll();
    }

    /**
     * Atualização é parcial: só os campos presentes em $dados são
     * alterados.
     *
     * "status" (ativo/inativo) não é tratado aqui — a tabela usuario
     * não tem essa coluna hoje, e o requisito não está nos RFs
     * documentados. Decisão registrada em conversa com o time de
     * front: fica para uma issue própria caso confirmem a
     * necessidade (envolve migration e decidir o efeito sobre login).
     *
     * @throws NaoEncontradoException se o membro não existir/pertencer à empresa
     * @throws \DomainException se o novo cargo_id não existir/pertencer à
     *         empresa, ou se a alteração tentar tirar o cargo do
     *         administrador principal da empresa
     */
    public function atualizarMembro(string $empresaId, string $usuarioId, array $dados): array
    {
        $usuario = $this->usuarioModel
            ->where('id', $usuarioId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $usuario) {
            throw new NaoEncontradoException('Membro não encontrado.');
        }

        $camposParaAtualizar = [];

        if (isset($dados['nome'])) {
            $camposParaAtualizar['nome'] = $dados['nome'];
        }

        if (isset($dados['cargo_id']) && $dados['cargo_id'] !== $usuario['cargo_id']) {
            $novoCargo = $this->cargoModel
                ->where('id', $dados['cargo_id'])
                ->where('empresa_id', $empresaId)
                ->first();

            if (! $novoCargo) {
                throw new \DomainException('Cargo inválido ou não pertence à empresa.');
            }

            $limite = new LimiteDeAcesso();
            $limite->exigirQueNaoSejaVoceMesmo($usuarioId, 'Você não pode mudar o seu próprio cargo. Peça a alguém com acesso total.');
            $limite->exigirPodeAtuarNoCargo($usuario['cargo_id']);
            $limite->exigirPodeAtuarNoCargo($novoCargo['id']);

            $empresa = $this->empresaModel->find($empresaId);

            if ($empresa['administrador_principal_id'] === $usuarioId) {
                throw new \DomainException('Não é possível alterar o cargo do administrador principal da empresa.');
            }

            $camposParaAtualizar['cargo_id'] = $dados['cargo_id'];
        }

        if (! empty($camposParaAtualizar)) {
            $this->usuarioModel->update($usuarioId, $camposParaAtualizar);
            AtividadeService::registrar('membro_alterado', isset($camposParaAtualizar['cargo_id'])
                ? "Mudou o cargo de {$usuario['nome']} para {$novoCargo['nome']}"
                : "Alterou os dados de {$usuario['nome']}");
        }

        return $this->usuarioModel
            ->select('usuario.id, usuario.nome, usuario.email, usuario.criado_em, usuario.cargo_id, cargo.nome as cargo_nome')
            ->join('cargo', 'cargo.id = usuario.cargo_id')
            ->where('usuario.id', $usuarioId)
            ->first();
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

        $limite = new LimiteDeAcesso();
        $limite->exigirQueNaoSejaVoceMesmo($usuarioId, 'Você não pode remover a si mesmo da equipe.');
        $limite->exigirPodeAtuarNoCargo($usuario['cargo_id']);

        $this->usuarioModel->delete($usuarioId);
        AtividadeService::registrar('membro_removido', "Removeu {$usuario['nome']} da equipe");
    }
}