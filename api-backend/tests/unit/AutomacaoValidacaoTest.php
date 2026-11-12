<?php

use App\Services\AutomacaoService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Cadastro de automações nas partes que não consultam o banco: validação de
 * nome e de ações, e o formato que a listagem devolve para a tela.
 *
 * @internal
 */
final class AutomacaoValidacaoTest extends CIUnitTestCase
{
    private function chamar(string $metodo, mixed ...$argumentos): mixed
    {
        $servico = (new ReflectionClass(AutomacaoService::class))->newInstanceWithoutConstructor();

        return (new ReflectionMethod($servico, $metodo))->invoke($servico, ...$argumentos);
    }

    private function validarAcao(array $acao, bool $ehVaga = false, array $gatilhos = ['criacao']): void
    {
        $this->chamar('validarAcao', $acao, 'empresa', 'modulo', $ehVaga, $gatilhos);
    }

    private function assertAcaoRecusada(string $mensagem, array $acao, bool $ehVaga = false, array $gatilhos = ['criacao']): void
    {
        try {
            $this->validarAcao($acao, $ehVaga, $gatilhos);
            $this->fail('Deveria recusar: ' . json_encode($acao));
        } catch (DomainException $e) {
            $this->assertSame($mensagem, $e->getMessage());
        }
    }

    public function testNomeDaAutomacao(): void
    {
        foreach (['', ' a ', str_repeat('x', 101)] as $nome) {
            try {
                $this->chamar('validarDefinicao', 'modulo', 'empresa', ['nome' => $nome]);
                $this->fail("Deveria recusar o nome '{$nome}'");
            } catch (DomainException $e) {
                $this->assertSame('O nome precisa ter entre 2 e 100 caracteres.', $e->getMessage());
            }
        }
    }

    public function testAcoesValidasSemBanco(): void
    {
        $this->validarAcao(['tipo' => 'enviar_email', 'configuracao' => ['destinatario' => 'a@b.com', 'assunto' => 'Oi', 'corpo' => 'Texto']]);
        $this->validarAcao(['tipo' => 'enviar_email', 'configuracao' => ['destinatario_campo_id' => 'c1', 'assunto' => 'Oi', 'corpo' => 'Texto']]);
        $this->validarAcao(['tipo' => 'webhook', 'configuracao' => ['url' => 'https://exemplo.com.br/gancho']]);
        $this->validarAcao(['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'todos', 'titulo' => 'Novo item']], true, ['candidato_criado']);
        $this->addToAssertionCount(4);
    }

    public function testAcoesRecusadas(): void
    {
        $this->assertAcaoRecusada("Tipo de ação inválido: 'sms'.", ['tipo' => 'sms']);
        $this->assertAcaoRecusada('Ação de e-mail precisa de destinatário, assunto e corpo.', ['tipo' => 'enviar_email', 'configuracao' => ['assunto' => 'Oi', 'corpo' => 'x']]);
        $this->assertAcaoRecusada('Ação de e-mail precisa de destinatário, assunto e corpo.', ['tipo' => 'enviar_email', 'configuracao' => ['destinatario' => 'a@b.com', 'corpo' => 'x']]);
        $this->assertAcaoRecusada('Informe o endereço do outro sistema.', ['tipo' => 'webhook', 'configuracao' => []]);
        $this->assertAcaoRecusada('Esse endereço aponta para uma rede interna e não pode ser usado.', ['tipo' => 'webhook', 'configuracao' => ['url' => 'http://localhost/x']]);
        $this->assertAcaoRecusada('Ações sobre itens não estão disponíveis em vagas.', ['tipo' => 'atualizar_campo', 'configuracao' => ['campo_id' => 'c1']], true);
        $this->assertAcaoRecusada('Ações sobre itens não estão disponíveis em vagas.', ['tipo' => 'criar_registro', 'configuracao' => []], true);
        $this->assertAcaoRecusada(
            '"Atualizar coluna" não funciona com o gatilho "Exclusão": o item já não existe.',
            ['tipo' => 'atualizar_campo', 'configuracao' => ['campo_id' => 'c1']],
            false,
            ['criacao', 'exclusao']
        );
    }

    public function testNotificacaoRecusada(): void
    {
        $this->assertAcaoRecusada('Escolha quem recebe a notificação.', ['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'chefe', 'titulo' => 'x']]);
        $this->assertAcaoRecusada('A notificação precisa de um título.', ['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'todos', 'titulo' => '  ']]);
        $this->assertAcaoRecusada(
            'O título da notificação pode ter no máximo 200 caracteres.',
            ['tipo' => 'notificacao', 'configuracao' => ['destinatarios' => 'todos', 'titulo' => str_repeat('á', 201)]]
        );
    }

    public function testListagemNoFormatoDaTela(): void
    {
        $lista = $this->chamar('completarParaListagem', [
            [
                'id' => 'a1', 'gatilho' => 'criacao', 'gatilhos' => null, 'condicoes' => null,
                'campo_condicao_id' => 'c1', 'condicao_operador' => 'igual', 'condicao_valor' => 'Feito',
                'acoes_json'   => '[{"tipo":"webhook","configuracao":"{\"url\":\"https://x.com\"}"},{"tipo":"notificacao","configuracao":{"titulo":"Oi"}}]',
                'execucoes_7d' => '5', 'falhas_7d' => '1', 'ultima_execucao_em' => '2026-10-10 10:00:00',
            ],
            ['id' => 'a2', 'gatilho' => 'criacao', 'gatilhos' => ['atualizacao'], 'condicoes' => ['logica' => 'ou', 'regras' => [['campo' => 'x']]], 'acoes_json' => null],
        ]);

        $this->assertSame(['criacao'], $lista[0]['gatilhos']);
        $this->assertSame(['logica' => 'e', 'regras' => [['campo' => 'c1', 'operador' => 'igual', 'valor' => 'Feito', 'valor_de' => null]]], $lista[0]['condicoes']);
        $this->assertSame([['tipo' => 'webhook', 'configuracao' => ['url' => 'https://x.com']], ['tipo' => 'notificacao', 'configuracao' => ['titulo' => 'Oi']]], $lista[0]['acoes']);
        $this->assertSame(['execucoes_7d' => 5, 'falhas_7d' => 1, 'ultima_execucao_em' => '2026-10-10 10:00:00'], $lista[0]['estatisticas']);
        $this->assertArrayNotHasKey('acoes_json', $lista[0]);
        $this->assertArrayNotHasKey('execucoes_7d', $lista[0]);

        $this->assertSame(['atualizacao'], $lista[1]['gatilhos']);
        $this->assertSame(['logica' => 'ou', 'regras' => [['campo' => 'x']]], $lista[1]['condicoes']);
        $this->assertSame([], $lista[1]['acoes']);
        $this->assertSame(['execucoes_7d' => 0, 'falhas_7d' => 0, 'ultima_execucao_em' => null], $lista[1]['estatisticas']);
    }
}
