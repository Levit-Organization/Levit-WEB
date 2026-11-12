<?php

use App\Services\RegistroService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Validação dos dados de um item nas partes que não consultam o banco:
 * tipos simples, opções, repetição e o formato das colunas de ligação.
 *
 * @internal
 */
final class RegistroValidacaoTest extends CIUnitTestCase
{
    private const CAMPOS = [
        ['id' => 'nome', 'nome' => 'Nome', 'tipo' => 'texto'],
        ['id' => 'valor', 'nome' => 'Valor', 'tipo' => 'numero'],
        ['id' => 'data', 'nome' => 'Data', 'tipo' => 'data'],
        ['id' => 'prazo', 'nome' => 'Prazo', 'tipo' => 'prazo'],
        ['id' => 'status', 'nome' => 'Status', 'tipo' => 'selecao', 'opcoes' => ['A fazer', 'Feito']],
        ['id' => 'repete', 'nome' => 'Repete', 'tipo' => 'recorrencia'],
        ['id' => 'dono', 'nome' => 'Dono', 'tipo' => 'responsavel'],
        ['id' => 'cliente', 'nome' => 'Cliente', 'tipo' => 'vinculo', 'modulo_vinculado_id' => 'cli', 'opcoes' => []],
        ['id' => 'tags', 'nome' => 'Tags', 'tipo' => 'vinculo', 'modulo_vinculado_id' => 'tag', 'opcoes' => ['multiplo' => true]],
    ];

    private function validar(array $dados, array $campos = self::CAMPOS): array
    {
        $servico = (new ReflectionClass(RegistroService::class))->newInstanceWithoutConstructor();

        return (new ReflectionMethod($servico, 'validarDadosDoRegistro'))->invoke($servico, $campos, ['dados' => $dados], 'mod');
    }

    private function assertRecusa(string $mensagem, array $dados): void
    {
        try {
            $this->validar($dados);
            $this->fail('Deveria recusar: ' . json_encode($dados));
        } catch (DomainException $e) {
            $this->assertStringContainsString($mensagem, $e->getMessage());
        }
    }

    public function testConverteOsTiposEDescartaVazios(): void
    {
        $this->assertSame(
            ['nome' => '123', 'valor' => 10.5, 'data' => '2026-02-28', 'prazo' => '2026-12-31', 'status' => 'Feito', 'repete' => 'mensal'],
            $this->validar([
                'nome' => 123, 'valor' => '10.5', 'data' => '2026-02-28', 'prazo' => '2026-12-31', 'status' => 'Feito',
                'repete' => 'mensal', 'dono' => '', 'cliente' => null, 'tags' => [], 'desconhecida' => 'x',
            ])
        );
        $this->assertSame(['valor' => 7], $this->validar(['valor' => '7']));
    }

    public function testSemDadosDevolveVazio(): void
    {
        $servico = (new ReflectionClass(RegistroService::class))->newInstanceWithoutConstructor();

        $this->assertSame([], (new ReflectionMethod($servico, 'validarDadosDoRegistro'))->invoke($servico, self::CAMPOS, [], 'mod'));
    }

    public function testRecusaValoresInvalidos(): void
    {
        $this->assertRecusa("A coluna 'Valor' precisa ser um número.", ['valor' => '10,5']);
        $this->assertRecusa("A coluna 'Data' precisa ser uma data válida", ['data' => '2026-02-30']);
        $this->assertRecusa("A coluna 'Prazo' precisa ser uma data válida", ['prazo' => '31/12/2026']);
        $this->assertRecusa("A coluna 'Status' precisa ser uma das opções válidas.", ['status' => 'feito']);
        $this->assertRecusa("A coluna 'Repete' precisa ser uma das repetições", ['repete' => 'diaria']);
        // Responsável que nem é um identificador válido: recusado sem consultar o banco.
        $this->assertRecusa("A coluna 'Dono' precisa ser uma pessoa da equipe.", ['dono' => 'ana']);
    }

    public function testFormatoDasLigacoes(): void
    {
        $a = '0190a000-0000-7000-8000-00000000000a';
        $b = '0190a000-0000-7000-8000-00000000000b';

        $this->assertRecusa("A coluna 'Cliente' liga um item só.", ['cliente' => [$a, $b]]);
        $this->assertRecusa("A coluna 'Cliente' precisa apontar para itens da tabela ligada.", ['cliente' => 'abc']);
        $this->assertRecusa("A coluna 'Tags' precisa apontar para itens da tabela ligada.", ['tags' => [$a, 'nao-e-uuid']]);

        $muitos = [];
        for ($i = 0; $i <= RegistroService::MAX_LIGADOS; $i++) {
            $muitos[] = sprintf('0190a000-0000-7000-8000-%012d', $i);
        }
        $this->assertRecusa("A coluna 'Tags' liga no máximo " . RegistroService::MAX_LIGADOS . ' itens.', ['tags' => $muitos]);

        // Só espaços e repetidos: nada ligado.
        $this->assertSame([], $this->validar(['tags' => [' ', ''], 'cliente' => '  ']));
    }

    public function testCampoDeTitulo(): void
    {
        $this->assertSame('b', RegistroService::campoDeTitulo([['id' => 'a', 'tipo' => 'numero'], ['id' => 'b', 'tipo' => 'texto'], ['id' => 'c', 'tipo' => 'texto']]));
        $this->assertSame('a', RegistroService::campoDeTitulo([['id' => 'a', 'tipo' => 'numero'], ['id' => 'b', 'tipo' => 'data']]));
        $this->assertNull(RegistroService::campoDeTitulo([]));
    }
}
