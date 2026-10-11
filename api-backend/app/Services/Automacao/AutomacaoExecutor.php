<?php

namespace App\Services\Automacao;

use App\Exceptions\FalhaPermanenteException;
use App\Exceptions\NaoEncontradoException;
use App\Models\CampoModuloModel;
use App\Models\ModuloModel;
use App\Services\NotificacaoService;
use App\Services\RegistroService;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Núcleo das automações, compartilhado entre a execução real (fila) e a
 * simulação (botão "Testar"): avalia as condições, monta cada ação com as
 * variáveis já substituídas e, na execução real, envia.
 */
class AutomacaoExecutor
{
    /** @var array<string, array<string, string>> id do campo => nome, por módulo */
    private array $campos = [];

    /** @var array<string, array{id: string, empresa_id: string, tipo: string, nome: string}> */
    private array $modulos = [];

    /** @var array<string, array<string, string>> id do campo => tipo, por módulo */
    private array $tipos = [];

    /** @var array<string, ?array{id: string, nome: string, email: string}> */
    private array $pessoas = [];

    public function __construct(
        private ?Client $http = null,
        private ?NotificacaoService $notificacoes = null,
        private ?RegistroService $registros = null,
        private ?DestinoWebhook $destinos = null,
    ) {
        $this->destinos ??= new DestinoWebhook();
    }

    /**
     * `$anteriores`: dados antes da mudança (atualização de registro ou troca
     * de etapa). Os operadores de mudança só são atendidos quando eles existem.
     */
    public function condicaoAtendida(array $automacao, array $dados, ?array $anteriores = null): bool
    {
        return Condicoes::avaliar(Condicoes::daAutomacao($automacao), $dados, $anteriores);
    }

    /**
     * Resolve a ação para o que seria executado de fato.
     *
     * @throws FalhaPermanenteException quando a configuração não permite executar
     */
    public function preparar(array $acao, array $dados, string $moduloId): array
    {
        $config = $acao['configuracao'] ?? [];

        return match ($acao['tipo']) {
            'enviar_email'    => $this->prepararEmail($config, $dados, $moduloId),
            'webhook'         => $this->prepararWebhook($config, $dados),
            'notificacao'     => $this->prepararNotificacao($config, $dados, $moduloId),
            'atualizar_campo' => $this->prepararAtualizacao($config, $dados, $moduloId),
            'criar_registro'  => $this->prepararCriacao($config, $dados, $moduloId),
            default           => throw new FalhaPermanenteException("Tipo de ação desconhecido: {$acao['tipo']}."),
        };
    }

    /**
     * Executa as ações a partir de `$aPartirDe` e para na primeira falha.
     *
     * `$contexto`: `registro_id` que disparou (ações sobre dados precisam dele) e
     * `cadeia`, as automações que levaram até aqui (proteção contra loop).
     *
     * @return array{status: string, passos: list<array>, falhou_em: ?int, retentavel: bool, erro: ?string, duracao_ms: int}
     */
    public function executar(array $automacao, array $acoes, array $dados, string $gatilho, int $aPartirDe = 0, array $contexto = []): array
    {
        $inicio = hrtime(true);
        $passos = [];

        foreach ($acoes as $indice => $acao) {
            if ($indice < $aPartirDe) {
                continue;
            }

            $inicioPasso = hrtime(true);

            try {
                $preparada = $this->preparar($acao, $dados, $automacao['modulo_id']);
                $mensagem  = $this->enviar($preparada, $gatilho, $automacao['modulo_id'], $contexto);
                $passos[]  = $this->passo($indice, $acao['tipo'], 'sucesso', $mensagem ?? $this->resumo($preparada), $inicioPasso);
            } catch (\Throwable $e) {
                $retentavel = ! $e instanceof FalhaPermanenteException;
                $passos[]   = $this->passo($indice, $acao['tipo'], 'erro', $e->getMessage(), $inicioPasso);

                return [
                    'status'     => 'erro',
                    'passos'     => $passos,
                    'falhou_em'  => $indice,
                    'retentavel' => $retentavel,
                    'erro'       => $e->getMessage(),
                    'duracao_ms' => $this->msDesde($inicio),
                ];
            }
        }

        return [
            'status'     => 'sucesso',
            'passos'     => $passos,
            'falhou_em'  => null,
            'retentavel' => false,
            'erro'       => null,
            'duracao_ms' => $this->msDesde($inicio),
        ];
    }

    /**
     * Mostra o que a automação faria com esses dados, sem enviar nada.
     */
    public function simular(array $automacao, array $acoes, array $dados, ?array $anteriores = null): array
    {
        $condicao = $this->condicaoAtendida($automacao, $dados, $anteriores);
        $passos   = [];

        foreach ($acoes as $indice => $acao) {
            try {
                // Ids internos não vão para a prévia: ela só mostra o que a pessoa precisa ver.
                $previa   = array_diff_key($this->preparar($acao, $dados, $automacao['modulo_id']), array_flip(['usuario_ids', 'empresa_id', 'campo_id', 'modulo_destino_id', 'valores']));
                $passos[] = ['indice' => $indice, 'tipo' => $acao['tipo'], 'status' => 'ok', 'previa' => $previa];
            } catch (\Throwable $e) {
                $passos[] = ['indice' => $indice, 'tipo' => $acao['tipo'], 'status' => 'erro', 'mensagem' => $e->getMessage()];
            }
        }

        return ['condicao_atendida' => $condicao, 'passos' => $passos];
    }

    private function prepararEmail(array $config, array $dados, string $moduloId): array
    {
        $destinatario = $config['destinatario'] ?? '';
        if ($destinatario === '' && ! empty($config['destinatario_campo_id'])) {
            $campoId = $config['destinatario_campo_id'];
            // Coluna "Responsável": o e-mail vai para a conta da pessoa.
            $destinatario = $this->tipoDoCampo($moduloId, $campoId) === 'responsavel'
                ? (string) ($this->responsavelDoItem($moduloId, $dados, $campoId)['email'] ?? '')
                : (string) ($dados[$campoId] ?? '');
        }
        $destinatario = trim($this->substituirVariaveis($destinatario, $moduloId, $dados));

        if ($destinatario === '') {
            throw new FalhaPermanenteException('Não foi possível determinar o destinatário do e-mail.');
        }
        if (! filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            throw new FalhaPermanenteException("Destinatário inválido: '{$destinatario}'.");
        }

        return [
            'tipo'         => 'enviar_email',
            'destinatario' => $destinatario,
            'assunto'      => $this->substituirVariaveis($config['assunto'] ?? '', $moduloId, $dados),
            'corpo'        => $this->substituirVariaveis($config['corpo'] ?? '', $moduloId, $dados),
        ];
    }

    private function prepararWebhook(array $config, array $dados): array
    {
        $url = trim((string) ($config['url'] ?? ''));
        try {
            $this->destinos->validarFormato($url);
        } catch (\DomainException $e) {
            throw new FalhaPermanenteException($e->getMessage(), 0, $e);
        }

        return ['tipo' => 'webhook', 'url' => $url, 'payload' => $dados];
    }

    /**
     * Resolve os destinatários (só quem tem acesso ao módulo) e o texto. A prévia
     * mostra quantas pessoas receberiam.
     */
    private function prepararNotificacao(array $config, array $dados, string $moduloId): array
    {
        $modulo  = $this->modulo($moduloId);
        $destino = $config['destinatarios'] ?? 'todos';
        $alvoId  = ($config['destino_id'] ?? '') ?: null;

        if ($destino === 'responsavel') {
            $responsavel = $this->responsavelDoItem($moduloId, $dados);
            if ($responsavel === null) {
                throw new FalhaPermanenteException('O item não tem responsável para avisar.');
            }
            $destino = 'usuario';
            $alvoId  = $responsavel['id'];
        }

        // Mesmo indicado como responsável, só recebe quem enxerga a tabela.
        $usuarios = $this->notificacoes()->usuariosComAcessoAoModulo(
            $moduloId,
            $modulo['empresa_id'],
            $destino === 'cargo' ? $alvoId : null,
            $destino === 'usuario' ? $alvoId : null
        );

        if ($usuarios === []) {
            throw new FalhaPermanenteException('Nenhum destinatário com acesso a esta tabela.');
        }

        $titulo = trim($this->substituirVariaveis($config['titulo'] ?? '', $moduloId, $dados));
        if ($titulo === '') {
            throw new FalhaPermanenteException('O título da notificação ficou vazio.');
        }

        return [
            'tipo'          => 'notificacao',
            'destinatarios' => count($usuarios),
            'usuario_ids'   => $usuarios,
            'empresa_id'    => $modulo['empresa_id'],
            'titulo'        => mb_substr($titulo, 0, 200),
            'mensagem'      => $this->substituirVariaveis($config['mensagem'] ?? '', $moduloId, $dados) ?: null,
            'link'          => $modulo['tipo'] === 'recrutamento' ? '/recrutamento' : "/modulos/{$moduloId}/registros",
        ];
    }

    /** Muda um campo do próprio registro que disparou a automação. */
    private function prepararAtualizacao(array $config, array $dados, string $moduloId): array
    {
        $campoId = $config['campo_id'] ?? '';
        $nome    = $this->camposDoModulo($moduloId)[$campoId] ?? null;
        if ($nome === null) {
            throw new FalhaPermanenteException('A coluna a atualizar não existe mais nesta tabela.');
        }

        return [
            'tipo'     => 'atualizar_campo',
            'campo_id' => $campoId,
            'campo'    => $nome,
            'valor'    => $this->substituirVariaveis((string) ($config['valor'] ?? ''), $moduloId, $dados),
        ];
    }

    /** Cria um registro em outro módulo, com os valores montados a partir deste. */
    private function prepararCriacao(array $config, array $dados, string $moduloId): array
    {
        $destinoId = $config['modulo_destino_id'] ?? '';
        $destino   = $this->modulo($destinoId);

        if ($destino['empresa_id'] !== $this->modulo($moduloId)['empresa_id'] || $destino['tipo'] === 'recrutamento') {
            throw new FalhaPermanenteException('A tabela de destino não pode receber itens desta automação.');
        }

        $camposDestino = $this->camposDoModulo($destinoId);
        $valores       = [];
        $legiveis      = [];

        foreach ($config['mapeamento'] ?? [] as $campoId => $modelo) {
            if (! isset($camposDestino[$campoId])) {
                continue; // campo removido do destino depois de configurar
            }
            $valor = $this->substituirVariaveis((string) $modelo, $moduloId, $dados);
            if ($valor === '') {
                continue;
            }
            $valores[$campoId]                  = $valor;
            $legiveis[$camposDestino[$campoId]] = $valor;
        }

        if ($valores === []) {
            throw new FalhaPermanenteException('Nenhuma coluna do novo item ficou preenchida.');
        }

        return [
            'tipo'              => 'criar_registro',
            'modulo_destino_id' => $destinoId,
            'modulo'            => $destino['nome'],
            'valores'           => $valores,
            'dados'             => $legiveis,
        ];
    }

    /** @return ?string mensagem do passo, quando difere do resumo padrão */
    private function enviar(array $preparada, string $gatilho, string $moduloId, array $contexto): ?string
    {
        $cadeia = $contexto['cadeia'] ?? [];

        switch ($preparada['tipo']) {
            case 'enviar_email':
                service('email')->enviar(
                    $preparada['destinatario'],
                    trim(preg_replace('/\s+/', ' ', $preparada['assunto'])),
                    self::corpoDoEmail($preparada['corpo'])
                );

                return null;

            case 'notificacao':
                $this->notificacoes()->notificar($preparada['usuario_ids'], $preparada['empresa_id'], [
                    'tipo'     => 'automacao',
                    'titulo'   => $preparada['titulo'],
                    'mensagem' => $preparada['mensagem'],
                    'link'     => $preparada['link'],
                ]);

                return null;

            case 'atualizar_campo':
                if (empty($contexto['registro_id'])) {
                    throw new FalhaPermanenteException('Não há item para atualizar (a ação só funciona em criação e atualização).');
                }

                $mudou = $this->comDadosValidos(fn () => $this->registros()->atualizarPorAutomacao(
                    $contexto['registro_id'],
                    $moduloId,
                    [$preparada['campo_id'] => $preparada['valor']],
                    $cadeia
                ));

                return $mudou ? null : "A coluna {$preparada['campo']} já estava com esse valor.";

            case 'criar_registro':
                $this->comDadosValidos(fn () => $this->registros()->criarPorAutomacao($preparada['modulo_destino_id'], $preparada['valores'], $cadeia));

                return null;
        }

        // Resolve e fixa o IP aqui, na hora de chamar (ver DestinoWebhook).
        $resolucao = $this->destinos->resolver($preparada['url']);

        try {
            ($this->http ??= new Client())->post($preparada['url'], [
                'json'            => $preparada['payload'],
                'timeout'         => 5,
                'connect_timeout' => 3,
                // Redirecionar poderia levar para a rede interna depois da checagem.
                'allow_redirects' => false,
                'curl'            => [
                    CURLOPT_RESOLVE   => [$resolucao],
                    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                ],
                'headers'         => [
                    'User-Agent'     => 'Levit-Automacoes/1.0',
                    'X-Levit-Evento' => $gatilho,
                ],
            ]);
        } catch (ClientException $e) {
            $status = $e->getResponse()->getStatusCode();
            // 408 e 429 são temporários; o resto de 4xx é erro de configuração do destino.
            if (! in_array($status, [408, 429], true)) {
                throw new FalhaPermanenteException("O webhook respondeu {$status}.", $status, $e);
            }
            throw new \RuntimeException("O webhook respondeu {$status}.", $status, $e);
        } catch (GuzzleException $e) {
            // A mensagem do cURL pode citar IPs e portas; o histórico mostra só o essencial.
            log_message('warning', 'Webhook falhou: {erro}', ['erro' => $e->getMessage()]);

            throw new \RuntimeException('O outro sistema não respondeu a tempo.', 0, $e);
        }

        return null;
    }

    /**
     * O corpo é texto: tanto o que a automação escreveu quanto os valores das
     * colunas (que podem vir do formulário público de candidatura) são
     * escapados, para ninguém injetar links, imagens ou formulários falsos
     * num e-mail que sai com o remetente da plataforma.
     */
    public static function corpoDoEmail(string $texto): string
    {
        $html = nl2br(htmlspecialchars($texto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false);

        return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f1d2b">' . $html . '</div>';
    }

    /** Dado inválido ou registro sumido não melhora repetindo: falha permanente. */
    private function comDadosValidos(callable $acao): mixed
    {
        try {
            return $acao();
        } catch (\DomainException|NaoEncontradoException $e) {
            throw new FalhaPermanenteException($e->getMessage(), 0, $e);
        }
    }

    /** Substitui {{Nome do campo}} pelo valor (sem diferenciar maiúsculas). */
    public function substituirVariaveis(string $texto, string $moduloId, array $dados): string
    {
        if (! str_contains($texto, '{{')) {
            return $texto;
        }

        $mapa      = $this->mapaDeVariaveis($moduloId);
        $ehDeDados = $this->modulo($moduloId)['tipo'] !== 'recrutamento';

        return preg_replace_callback('/\{\{(.*?)\}\}/', function (array $m) use ($mapa, $dados, $moduloId, $ehDeDados) {
            $chave = $mapa[mb_strtolower(trim($m[1]))] ?? null;
            $valor = $chave !== null ? ($dados[$chave] ?? '') : '';

            // {{Responsável}} mostra o nome da pessoa, não o identificador guardado.
            $tipo = $ehDeDados && $chave !== null && $valor !== '' ? $this->tipoDoCampo($moduloId, $chave) : null;
            if ($tipo === 'responsavel') {
                return $this->pessoa((string) $valor)['nome'] ?? '';
            }
            // Datas e prazos no formato brasileiro (o banco guarda AAAA-MM-DD).
            if (in_array($tipo, ['data', 'prazo'], true) && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string) $valor, $d)) {
                return "{$d[3]}/{$d[2]}/{$d[1]}";
            }

            return is_array($valor) ? implode(', ', $valor) : (string) $valor;
        }, $texto);
    }

    /** Em vagas, as variáveis são os campos do candidato; nos demais módulos, os campos do módulo. */
    private function mapaDeVariaveis(string $moduloId): array
    {
        if ($this->modulo($moduloId)['tipo'] === 'recrutamento') {
            return CamposCandidato::mapaDeVariaveis();
        }

        $mapa = [];
        foreach ($this->camposDoModulo($moduloId) as $id => $nome) {
            $mapa[mb_strtolower(trim($nome))] = $id;
        }

        return $mapa;
    }

    /** @return array<string, string> id => nome */
    private function camposDoModulo(string $moduloId): array
    {
        if (! isset($this->campos[$moduloId])) {
            $linhas                  = (new CampoModuloModel())->select('id, nome, tipo')->where('modulo_id', $moduloId)->findAll();
            $this->campos[$moduloId] = array_column($linhas, 'nome', 'id');
            $this->tipos[$moduloId]  = array_column($linhas, 'tipo', 'id');
        }

        return $this->campos[$moduloId];
    }

    private function tipoDoCampo(string $moduloId, string $campoId): ?string
    {
        $this->camposDoModulo($moduloId);

        return $this->tipos[$moduloId][$campoId] ?? null;
    }

    /** Pessoa da coluna "Responsável" do item (a primeira preenchida, ou a coluna indicada). */
    private function responsavelDoItem(string $moduloId, array $dados, ?string $campoId = null): ?array
    {
        $this->camposDoModulo($moduloId);
        foreach ($this->tipos[$moduloId] ?? [] as $id => $tipo) {
            if ($tipo === 'responsavel' && ($campoId === null || $campoId === $id) && ! empty($dados[$id])) {
                return $this->pessoa((string) $dados[$id]);
            }
        }

        return null;
    }

    private function pessoa(string $usuarioId): ?array
    {
        if (! array_key_exists($usuarioId, $this->pessoas)) {
            $this->pessoas[$usuarioId] = preg_match('/^[0-9a-f-]{36}$/i', $usuarioId)
                ? db_connect()->table('usuario')->select('id, nome, email')->where('id', $usuarioId)->get()->getRowArray()
                : null;
        }

        return $this->pessoas[$usuarioId];
    }

    private function resumo(array $preparada): string
    {
        return match ($preparada['tipo']) {
            'enviar_email'    => "E-mail enviado para {$preparada['destinatario']}.",
            'notificacao'     => $preparada['destinatarios'] === 1 ? 'Notificação enviada para 1 pessoa.' : "Notificação enviada para {$preparada['destinatarios']} pessoas.",
            'atualizar_campo' => $preparada['valor'] === '' ? "Coluna {$preparada['campo']} esvaziada." : "Coluna {$preparada['campo']} atualizada para \"{$preparada['valor']}\".",
            'criar_registro'  => "Item criado em {$preparada['modulo']}.",
            default           => "Outro sistema avisado: {$preparada['url']}.",
        };
    }

    private function notificacoes(): NotificacaoService
    {
        return $this->notificacoes ??= new NotificacaoService();
    }

    private function registros(): RegistroService
    {
        return $this->registros ??= new RegistroService();
    }

    private function modulo(string $moduloId): array
    {
        if (! isset($this->modulos[$moduloId])) {
            $modulo = $moduloId !== '' ? (new ModuloModel())->select('id, empresa_id, tipo, nome')->find($moduloId) : null;
            if (! $modulo) {
                throw new FalhaPermanenteException('A tabela usada por esta automação não existe mais.');
            }
            $this->modulos[$moduloId] = $modulo;
        }

        return $this->modulos[$moduloId];
    }

    private function passo(int $indice, string $tipo, string $status, string $mensagem, int $inicio): array
    {
        return ['indice' => $indice, 'tipo' => $tipo, 'status' => $status, 'mensagem' => $mensagem, 'duracao_ms' => $this->msDesde($inicio)];
    }

    private function msDesde(int $inicio): int
    {
        return (int) round((hrtime(true) - $inicio) / 1e6);
    }
}
