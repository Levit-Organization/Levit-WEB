<?php

use App\Exceptions\FalhaPermanenteException;
use App\Services\Automacao\AutomacaoExecutor;
use App\Services\NotificacaoService;
use App\Services\RegistroService;
use CodeIgniter\Test\CIUnitTestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;

/**
 * @internal
 */
final class AutomacaoExecutorTest extends CIUnitTestCase
{
    private const MODULO = 'mod-1';

    /** Notificações em memória: guarda o que seria gravado. */
    private function notificacoesFalsas(array $usuarios = ['u1', 'u2']): NotificacaoService
    {
        return new class ($usuarios) extends NotificacaoService {
            public array $enviadas = [];
            public array $filtros  = [];

            public function __construct(private array $usuarios)
            {
            }

            public function usuariosComAcessoAoModulo(string $moduloId, string $empresaId, ?string $cargoId = null, ?string $usuarioId = null): array
            {
                $this->filtros[] = compact('cargoId', 'usuarioId');

                return $this->usuarios;
            }

            public function notificar(array $usuarioIds, string $empresaId, array $notificacao): int
            {
                $this->enviadas[] = compact('usuarioIds', 'empresaId', 'notificacao');

                return count($usuarioIds);
            }
        };
    }

    /** Registros em memória: guarda as chamadas das ações sobre dados. */
    private function registrosFalsos(bool $mudou = true): RegistroService
    {
        return new class ($mudou) extends RegistroService {
            public array $chamadas = [];

            public function __construct(private bool $mudou)
            {
            }

            public function atualizarPorAutomacao(string $registroId, string $moduloId, array $alteracoes, array $cadeia): bool
            {
                $this->chamadas[] = ['atualizar', $registroId, $moduloId, $alteracoes, $cadeia];

                return $this->mudou;
            }

            public function criarPorAutomacao(string $moduloId, array $dados, array $cadeia): string
            {
                $this->chamadas[] = ['criar', $moduloId, $dados, $cadeia];

                return 'novo-id';
            }
        };
    }

    private function executor(array $respostas = [], ?NotificacaoService $notificacoes = null, ?RegistroService $registros = null): AutomacaoExecutor
    {
        $executor = new AutomacaoExecutor(
            new Client(['handler' => HandlerStack::create(new MockHandler($respostas))]),
            $notificacoes ?? $this->notificacoesFalsas(),
            $registros ?? $this->registrosFalsos(),
            new \App\Services\Automacao\DestinoWebhook(static fn () => ['93.184.216.34'])
        );

        // Campos e módulo pré-carregados: os testes não precisam de banco.
        (new ReflectionProperty($executor, 'campos'))->setValue($executor, [
            self::MODULO => ['campo-nome' => 'Nome', 'campo-email' => 'Email', 'campo-tags' => 'Tags', 'campo-status' => 'Status'],
            'mod-2'      => ['d-titulo' => 'Título', 'd-origem' => 'Origem'],
        ]);
        (new ReflectionProperty($executor, 'modulos'))->setValue($executor, [
            self::MODULO => ['id' => self::MODULO, 'empresa_id' => 'emp-1', 'tipo' => 'dados', 'nome' => 'Leads'],
            'mod-2'      => ['id' => 'mod-2', 'empresa_id' => 'emp-1', 'tipo' => 'dados', 'nome' => 'Tarefas'],
            'vaga-1'     => ['id' => 'vaga-1', 'empresa_id' => 'emp-1', 'tipo' => 'recrutamento', 'nome' => 'Dev Front'],
            'outra-emp'  => ['id' => 'outra-emp', 'empresa_id' => 'emp-2', 'tipo' => 'dados', 'nome' => 'Alheio'],
        ]);

        return $executor;
    }

    private function automacao(array $extra = []): array
    {
        return $extra + ['id' => 'aut-1', 'modulo_id' => self::MODULO, 'campo_condicao_id' => null];
    }

    private function webhook(string $url = 'https://exemplo.com/hook'): array
    {
        return ['tipo' => 'webhook', 'configuracao' => ['url' => $url]];
    }

    public function testCondicaoIgualEDiferente(): void
    {
        $executor = $this->executor();
        $cond     = $this->automacao(['campo_condicao_id' => 'campo-nome', 'condicao_operador' => 'igual', 'condicao_valor' => 'Ana']);

        $this->assertTrue($executor->condicaoAtendida($cond, ['campo-nome' => 'Ana']));
        $this->assertFalse($executor->condicaoAtendida($cond, ['campo-nome' => 'Beto']));
        $this->assertTrue($executor->condicaoAtendida(['condicao_operador' => 'diferente'] + $cond, ['campo-nome' => 'Beto']));
        $this->assertTrue($executor->condicaoAtendida($this->automacao(), []), 'sem condição sempre dispara');
    }

    public function testSubstituiVariaveisSemDiferenciarMaiusculasEListas(): void
    {
        $texto = $this->executor()->substituirVariaveis('Olá {{ Nome }} ({{tags}}) {{inexistente}}!', self::MODULO, [
            'campo-nome' => 'Ana',
            'campo-tags' => ['a', 'b'],
        ]);

        $this->assertSame('Olá Ana (a, b) !', $texto);
    }

    public function testPrepararEmailUsaCampoDoRegistroComoDestinatario(): void
    {
        $previa = $this->executor()->preparar(
            ['tipo' => 'enviar_email', 'configuracao' => ['destinatario_campo_id' => 'campo-email', 'assunto' => 'Oi {{nome}}', 'corpo' => 'Corpo']],
            ['campo-email' => 'ana@exemplo.com', 'campo-nome' => 'Ana'],
            self::MODULO
        );

        $this->assertSame(['tipo' => 'enviar_email', 'destinatario' => 'ana@exemplo.com', 'assunto' => 'Oi Ana', 'corpo' => 'Corpo'], $previa);
    }

    public function testEmailComDestinatarioInvalidoEhFalhaPermanente(): void
    {
        $this->expectException(FalhaPermanenteException::class);
        $this->executor()->preparar(
            ['tipo' => 'enviar_email', 'configuracao' => ['destinatario' => 'nao-e-email', 'assunto' => 'a', 'corpo' => 'b']],
            [],
            self::MODULO
        );
    }

    public function testExecutaTodasAsAcoesComSucesso(): void
    {
        $resultado = $this->executor([new Response(200), new Response(204)])
            ->executar($this->automacao(), [$this->webhook(), $this->webhook()], ['x' => 1], 'criacao');

        $this->assertSame('sucesso', $resultado['status']);
        $this->assertCount(2, $resultado['passos']);
        $this->assertNull($resultado['falhou_em']);
    }

    public function testWebhook4xxNaoEhRetentavelEParaNaAcaoQueFalhou(): void
    {
        $resultado = $this->executor([new Response(200), new Response(404)])
            ->executar($this->automacao(), [$this->webhook(), $this->webhook(), $this->webhook()], [], 'criacao');

        $this->assertSame('erro', $resultado['status']);
        $this->assertSame(1, $resultado['falhou_em']);
        $this->assertFalse($resultado['retentavel']);
        $this->assertCount(2, $resultado['passos'], 'a terceira ação não roda');
    }

    public function testWebhook5xxE429SaoRetentaveis(): void
    {
        foreach ([500, 503, 429] as $status) {
            $resultado = $this->executor([new Response($status)])
                ->executar($this->automacao(), [$this->webhook()], [], 'criacao');

            $this->assertTrue($resultado['retentavel'], "status {$status}");
        }
    }

    public function testRetentativaContinuaDaAcaoQueFalhou(): void
    {
        $resultado = $this->executor([new Response(200)])
            ->executar($this->automacao(), [$this->webhook(), $this->webhook()], [], 'criacao', 1);

        $this->assertSame('sucesso', $resultado['status']);
        $this->assertSame([1], array_column($resultado['passos'], 'indice'));
    }

    public function testSimularNaoEnviaEMostraErrosPorAcao(): void
    {
        // Nenhuma resposta no mock: qualquer chamada HTTP faria o teste falhar.
        $simulacao = $this->executor()->simular(
            $this->automacao(),
            [$this->webhook(), ['tipo' => 'enviar_email', 'configuracao' => ['assunto' => 'a', 'corpo' => 'b']]],
            ['campo-nome' => 'Ana']
        );

        $this->assertTrue($simulacao['condicao_atendida']);
        $this->assertSame('ok', $simulacao['passos'][0]['status']);
        $this->assertSame('https://exemplo.com/hook', $simulacao['passos'][0]['previa']['url']);
        $this->assertSame('erro', $simulacao['passos'][1]['status']);
    }

    private function condicaoDeMudanca(string $operador, string $valor = 'Fechado', ?string $de = null): array
    {
        return $this->automacao([
            'campo_condicao_id' => 'campo-status',
            'condicao_operador' => $operador,
            'condicao_valor'    => $valor,
            'condicao_valor_de' => $de,
        ]);
    }

    public function testMudouSoDisparaQuandoOValorMuda(): void
    {
        $executor = $this->executor();
        $cond     = $this->condicaoDeMudanca('mudou');

        $this->assertTrue($executor->condicaoAtendida($cond, ['campo-status' => 'B'], ['campo-status' => 'A']));
        $this->assertFalse($executor->condicaoAtendida($cond, ['campo-status' => 'A'], ['campo-status' => 'A']));
        $this->assertFalse($executor->condicaoAtendida($cond, ['campo-status' => 'A'], null), 'sem anteriores (criação) não dispara');
    }

    public function testMudouParaExigeMudancaEValorFinal(): void
    {
        $executor = $this->executor();
        $cond     = $this->condicaoDeMudanca('mudou_para', 'Fechado');

        $this->assertTrue($executor->condicaoAtendida($cond, ['campo-status' => 'Fechado'], ['campo-status' => 'Proposta']));
        $this->assertFalse($executor->condicaoAtendida($cond, ['campo-status' => 'Fechado'], ['campo-status' => 'Fechado']), 'já estava fechado: editar outro campo não redispara');
        $this->assertFalse($executor->condicaoAtendida($cond, ['campo-status' => 'Perdido'], ['campo-status' => 'Proposta']));
    }

    public function testMudouDeParaConfereOrigemEDestino(): void
    {
        $executor = $this->executor();
        $cond     = $this->condicaoDeMudanca('mudou_de_para', 'Fechado', 'Proposta');

        $this->assertTrue($executor->condicaoAtendida($cond, ['campo-status' => 'Fechado'], ['campo-status' => 'Proposta']));
        $this->assertFalse($executor->condicaoAtendida($cond, ['campo-status' => 'Fechado'], ['campo-status' => 'Novo']));
    }

    public function testNotificacaoParaTodosComVariaveisELinkDoModulo(): void
    {
        $notificacoes = $this->notificacoesFalsas(['u1', 'u2', 'u3']);
        $resultado    = $this->executor([], $notificacoes)->executar(
            $this->automacao(),
            [['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'todos', 'titulo' => 'Lead {{nome}} fechou', 'mensagem' => 'Status: {{status}}']]],
            ['campo-nome' => 'ACME', 'campo-status' => 'Fechado'],
            'atualizacao'
        );

        $this->assertSame('sucesso', $resultado['status']);
        $this->assertSame('Notificação enviada para 3 pessoas.', $resultado['passos'][0]['mensagem']);
        $this->assertSame(['u1', 'u2', 'u3'], $notificacoes->enviadas[0]['usuarioIds']);
        $this->assertSame('emp-1', $notificacoes->enviadas[0]['empresaId']);
        $this->assertSame(
            ['tipo' => 'automacao', 'titulo' => 'Lead ACME fechou', 'mensagem' => 'Status: Fechado', 'link' => '/modulos/mod-1/registros'],
            $notificacoes->enviadas[0]['notificacao']
        );
    }

    public function testNotificacaoParaCargoFiltraPeloCargo(): void
    {
        $notificacoes = $this->notificacoesFalsas();
        $this->executor([], $notificacoes)->preparar(
            ['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'cargo', 'destino_id' => 'cargo-9', 'titulo' => 'Oi']],
            [],
            self::MODULO
        );

        $this->assertSame(['cargoId' => 'cargo-9', 'usuarioId' => null], $notificacoes->filtros[0]);
    }

    public function testNotificacaoSemDestinatarioComAcessoEhFalhaPermanente(): void
    {
        $resultado = $this->executor([], $this->notificacoesFalsas([]))->executar(
            $this->automacao(),
            [['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'todos', 'titulo' => 'Oi']]],
            [],
            'criacao'
        );

        $this->assertSame('erro', $resultado['status']);
        $this->assertFalse($resultado['retentavel']);
    }

    public function testPreviaDaNotificacaoNaoExpoeIdsInternos(): void
    {
        $simulacao = $this->executor()->simular(
            $this->automacao(),
            [['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'todos', 'titulo' => 'Oi']]],
            []
        );

        $previa = $simulacao['passos'][0]['previa'];
        $this->assertSame(2, $previa['destinatarios']);
        $this->assertArrayNotHasKey('usuario_ids', $previa);
        $this->assertArrayNotHasKey('empresa_id', $previa);
    }

    public function testCondicoesNovasTemPrioridadeSobreAsAntigas(): void
    {
        $automacao = $this->automacao([
            'campo_condicao_id' => 'campo-nome', 'condicao_operador' => 'igual', 'condicao_valor' => 'Ana',
            'condicoes'         => ['logica' => 'e', 'regras' => [['campo' => 'campo-status', 'operador' => 'igual', 'valor' => 'Fechado']]],
        ]);

        $this->assertTrue($this->executor()->condicaoAtendida($automacao, ['campo-nome' => 'Beto', 'campo-status' => 'Fechado']));
    }

    public function testAtualizarCampoUsaORegistroQueDisparouEPassaACadeia(): void
    {
        $registros = $this->registrosFalsos();
        $resultado = $this->executor([], null, $registros)->executar(
            $this->automacao(),
            [['tipo' => 'atualizar_campo', 'configuracao' => ['campo_id' => 'campo-status', 'valor' => 'Contato feito com {{nome}}']]],
            ['campo-nome' => 'ACME'],
            'criacao',
            0,
            ['registro_id' => 'reg-1', 'cadeia' => ['aut-0', 'aut-1']]
        );

        $this->assertSame('sucesso', $resultado['status']);
        $this->assertSame('Coluna Status atualizada para "Contato feito com ACME".', $resultado['passos'][0]['mensagem']);
        $this->assertSame(['atualizar', 'reg-1', self::MODULO, ['campo-status' => 'Contato feito com ACME'], ['aut-0', 'aut-1']], $registros->chamadas[0]);
    }

    public function testAtualizarCampoSemMudancaAvisaNoPasso(): void
    {
        $resultado = $this->executor([], null, $this->registrosFalsos(false))->executar(
            $this->automacao(),
            [['tipo' => 'atualizar_campo', 'configuracao' => ['campo_id' => 'campo-status', 'valor' => 'X']]],
            [],
            'atualizacao',
            0,
            ['registro_id' => 'reg-1']
        );

        $this->assertSame('A coluna Status já estava com esse valor.', $resultado['passos'][0]['mensagem']);
    }

    public function testAtualizarCampoSemRegistroEhFalhaPermanente(): void
    {
        $resultado = $this->executor()->executar(
            $this->automacao(),
            [['tipo' => 'atualizar_campo', 'configuracao' => ['campo_id' => 'campo-status', 'valor' => 'X']]],
            [],
            'exclusao'
        );

        $this->assertSame('erro', $resultado['status']);
        $this->assertFalse($resultado['retentavel']);
    }

    public function testCriarRegistroMapeiaCamposEIgnoraVazios(): void
    {
        $registros = $this->registrosFalsos();
        $resultado = $this->executor([], null, $registros)->executar(
            $this->automacao(),
            [['tipo' => 'criar_registro', 'configuracao' => ['modulo_destino_id' => 'mod-2', 'mapeamento' => [
                'd-titulo' => 'Ligar para {{nome}}',
                'd-origem' => '{{inexistente}}',
                'removido' => 'x',
            ]]]],
            ['campo-nome' => 'ACME'],
            'criacao',
            0,
            ['registro_id' => 'reg-1', 'cadeia' => ['aut-1']]
        );

        $this->assertSame('Item criado em Tarefas.', $resultado['passos'][0]['mensagem']);
        $this->assertSame(['criar', 'mod-2', ['d-titulo' => 'Ligar para ACME'], ['aut-1']], $registros->chamadas[0]);
    }

    public function testCriarRegistroEmOutraEmpresaOuVagaEhBloqueado(): void
    {
        foreach (['outra-emp', 'vaga-1'] as $destino) {
            $resultado = $this->executor()->executar(
                $this->automacao(),
                [['tipo' => 'criar_registro', 'configuracao' => ['modulo_destino_id' => $destino, 'mapeamento' => ['x' => 'y']]]],
                [],
                'criacao'
            );
            $this->assertSame('erro', $resultado['status'], $destino);
            $this->assertFalse($resultado['retentavel'], $destino);
        }
    }

    public function testPreviaDeCriarRegistroMostraNomesDosCampos(): void
    {
        $simulacao = $this->executor()->simular(
            $this->automacao(),
            [['tipo' => 'criar_registro', 'configuracao' => ['modulo_destino_id' => 'mod-2', 'mapeamento' => ['d-titulo' => 'Ligar para {{nome}}']]]],
            ['campo-nome' => 'ACME']
        );

        $this->assertSame(['tipo' => 'criar_registro', 'modulo' => 'Tarefas', 'dados' => ['Título' => 'Ligar para ACME']], $simulacao['passos'][0]['previa']);
    }

    public function testEmVagasAsVariaveisSaoOsCamposDoCandidato(): void
    {
        $texto = $this->executor()->substituirVariaveis(
            '{{Nome}} foi de {{Etapa anterior}} para {{etapa}} ({{Cargo desejado}})',
            'vaga-1',
            ['nome' => 'Ana', 'etapa' => 'Entrevista', 'etapa_anterior' => 'Triagem', 'cargo_desejado' => 'Dev']
        );

        $this->assertSame('Ana foi de Triagem para Entrevista (Dev)', $texto);
    }

    /** Tabela com coluna "Responsável", com a pessoa já carregada (sem banco). */
    private function executorComResponsavel(?NotificacaoService $notificacoes = null): AutomacaoExecutor
    {
        $executor = $this->executor([], $notificacoes);
        $uuid     = '0190a000-0000-7000-8000-000000000001';

        $campos = (new ReflectionProperty($executor, 'campos'))->getValue($executor);
        $campos['mod-3'] = ['t-tarefa' => 'Tarefa', 't-resp' => 'Responsável', 't-prazo' => 'Prazo'];
        (new ReflectionProperty($executor, 'campos'))->setValue($executor, $campos);
        (new ReflectionProperty($executor, 'tipos'))->setValue($executor, [
            'mod-3' => ['t-tarefa' => 'texto', 't-resp' => 'responsavel', 't-prazo' => 'prazo'],
        ]);
        $modulos = (new ReflectionProperty($executor, 'modulos'))->getValue($executor);
        $modulos['mod-3'] = ['id' => 'mod-3', 'empresa_id' => 'emp-1', 'tipo' => 'dados', 'nome' => 'Obrigações'];
        (new ReflectionProperty($executor, 'modulos'))->setValue($executor, $modulos);
        (new ReflectionProperty($executor, 'pessoas'))->setValue($executor, [
            $uuid => ['id' => $uuid, 'nome' => 'Ana Souza', 'email' => 'ana@escritorio.com'],
        ]);

        return $executor;
    }

    public function testVariavelResponsavelMostraONome(): void
    {
        $dados = ['t-tarefa' => 'DAS de março', 't-resp' => '0190a000-0000-7000-8000-000000000001', 't-prazo' => '2026-03-20'];
        $this->assertSame(
            'Ana Souza, o DAS de março vence em 20/03/2026.',
            $this->executorComResponsavel()->substituirVariaveis('{{Responsável}}, o {{Tarefa}} vence em {{Prazo}}.', 'mod-3', $dados)
        );
    }

    public function testEmailParaOResponsavelUsaOEmailDaConta(): void
    {
        $previa = $this->executorComResponsavel()->preparar(
            ['tipo' => 'enviar_email', 'configuracao' => ['destinatario_campo_id' => 't-resp', 'assunto' => 'Prazo', 'corpo' => 'Oi']],
            ['t-resp' => '0190a000-0000-7000-8000-000000000001'],
            'mod-3'
        );
        $this->assertSame('ana@escritorio.com', $previa['destinatario']);
    }

    public function testNotificacaoVaiSoParaOResponsavel(): void
    {
        $notificacoes = $this->notificacoesFalsas(['0190a000-0000-7000-8000-000000000001']);
        $previa       = $this->executorComResponsavel($notificacoes)->preparar(
            ['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'responsavel', 'titulo' => 'Vence hoje: {{Tarefa}}']],
            ['t-tarefa' => 'DAS', 't-resp' => '0190a000-0000-7000-8000-000000000001'],
            'mod-3'
        );
        $this->assertSame(1, $previa['destinatarios']);
        $this->assertSame('0190a000-0000-7000-8000-000000000001', $notificacoes->filtros[0]['usuarioId']);
        $this->assertSame('Vence hoje: DAS', $previa['titulo']);
    }

    public function testNotificacaoSemResponsavelFalhaDeVez(): void
    {
        $this->expectException(\App\Exceptions\FalhaPermanenteException::class);
        $this->executorComResponsavel()->preparar(
            ['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'responsavel', 'titulo' => 'x']],
            ['t-tarefa' => 'DAS'],
            'mod-3'
        );
    }
}
