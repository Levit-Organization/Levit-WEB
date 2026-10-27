<?php

namespace App\Services\Pesquisa;

use App\Exceptions\AcessoNegadoException;
use App\Services\RecorrenciaService;

/**
 * Pesquisa avançada nos itens de uma tabela, inclusive pelos dados das tabelas
 * ligadas a ela (colunas do tipo "vinculo"). Vira um trecho de WHERE com
 * parâmetros nomeados (:f1:, :f2:...): nada do que vem do usuário entra cru no
 * SQL, e as colunas só são aceitas se existirem na tabela certa.
 *
 * Formato (o das condições de automação, mais grupos e ligações):
 *   { "logica": "e" | "ou", "regras": [ regra | grupo ] }
 *   regra: { "campo", "operador", "valor"?, "valor_ate"?,
 *            "via"?: [ { "campo", "sentido": "ida" | "volta" } ],
 *            "quantificador"?: "algum" | "nenhum" }
 *
 * - "via" percorre ligações antes de olhar a coluna. "ida" vai do item para o
 *   que ele aponta (Pedido › Cliente); "volta" vai para os itens de outra tabela
 *   que apontam para ele (Cliente › Pedidos do cliente).
 * - Com "via", a regra vale se ALGUM item ligado atende (ou NENHUM, com o
 *   quantificador "nenhum"). Sem "campo" no fim, só pergunta se há item ligado
 *   (operadores "preenchido" e "vazio").
 */
final class Filtros
{
    public const MAX_REGRAS = 20;

    /** Ligações seguidas numa regra (Pedido › Cliente › Cidade = 1). */
    public const MAX_SALTOS = 3;

    private const MAX_NIVEIS = 3;

    private const IGUALDADE = ['igual', 'diferente', 'vazio', 'preenchido'];
    private const ORDEM     = ['igual', 'diferente', 'maior', 'menor', 'entre', 'vazio', 'preenchido'];

    public const OPERADORES_POR_TIPO = [
        'texto'       => ['igual', 'diferente', 'contem', 'nao_contem', 'vazio', 'preenchido'],
        'numero'      => self::ORDEM,
        'data'        => self::ORDEM,
        'prazo'       => self::ORDEM,
        'momento'     => self::ORDEM,
        'selecao'     => self::IGUALDADE,
        'responsavel' => self::IGUALDADE,
        'recorrencia' => self::IGUALDADE,
        'vinculo'     => self::IGUALDADE,
    ];

    /** Como cada operador aparece em texto (mesmos rótulos da tela de filtros). */
    private const ROTULOS = [
        'igual'      => 'é igual a',
        'diferente'  => 'é diferente de',
        'contem'     => 'contém',
        'nao_contem' => 'não contém',
        'maior'      => 'maior que',
        'menor'      => 'menor que',
        'entre'      => 'entre',
        'vazio'      => 'está vazio',
        'preenchido' => 'está preenchido',
    ];

    private const ROTULOS_DE_DATA = ['igual' => 'é em', 'diferente' => 'não é em', 'maior' => 'depois de', 'menor' => 'antes de'];

    /** Colunas que todo item tem (tipo "momento": comparadas pelo dia). */
    public const COLUNAS_DO_SISTEMA = ['criado_em' => 'Criado em', 'atualizado_em' => 'Atualizado em'];

    /** @var array<string, string> */
    private array $binds = [];

    private int $apelidos = 0;
    private int $totalRegras = 0;

    /**
     * @param array<string, array> $campos  colunas de todas as tabelas da empresa, por id
     *                                      (modulo_id, nome, tipo, modulo_vinculado_id)
     * @param \Closure(string): bool $podeVer se quem pesquisa enxerga a tabela
     * @param array<string, string> $tabelas nome das tabelas por id (só para descrever)
     */
    public function __construct(private readonly array $campos, private readonly \Closure $podeVer, private readonly array $tabelas = [])
    {
    }

    /**
     * Os filtros em português, um por linha, para mostrar num relatório
     * ("Cliente › Cidade contém “Recife”"). Espera filtros já aceitos por paraSql.
     *
     * @param \Closure(array $campo, string $valor): string $nomeDoValor nome de uma pessoa ou de um item ligado
     *
     * @return list<string>
     */
    public function descrever(array $filtros, \Closure $nomeDoValor): array
    {
        $linhas = [];
        foreach ($filtros['regras'] ?? [] as $regra) {
            if (! is_array($regra)) {
                continue;
            }
            $linhas[] = array_key_exists('regras', $regra)
                ? '(' . implode(($regra['logica'] ?? 'e') === 'ou' ? ' ou ' : ' e ', $this->descrever($regra, $nomeDoValor)) . ')'
                : $this->frase($regra, $nomeDoValor);
        }

        return $linhas;
    }

    private function frase(array $regra, \Closure $nomeDoValor): string
    {
        $caminho = [];
        $volta   = false;
        foreach (is_array($regra['via'] ?? null) ? $regra['via'] : [] as $salto) {
            $ligacao = $this->campos[$salto['campo'] ?? ''] ?? null;
            if ($ligacao === null) {
                continue;
            }
            $deVolta = ($salto['sentido'] ?? 'ida') === 'volta';
            $volta   = $volta || $deVolta;
            // De volta, o caminho passa pela tabela de quem aponta (Pedidos); de ida, pela coluna (Cliente).
            $caminho[] = $deVolta ? ($this->tabelas[$ligacao['modulo_id']] ?? 'Itens ligados') : $ligacao['nome'];
        }

        $operador = (string) ($regra['operador'] ?? '');
        $campoId  = (string) ($regra['campo'] ?? '');

        if ($campoId === '') {
            return implode(' › ', $caminho) . ($operador === 'vazio' ? ' não tem nenhum item' : ' tem algum item');
        }

        $campo     = isset(self::COLUNAS_DO_SISTEMA[$campoId])
            ? ['nome' => self::COLUNAS_DO_SISTEMA[$campoId], 'tipo' => 'momento']
            : ($this->campos[$campoId] ?? ['nome' => 'Coluna removida', 'tipo' => 'texto']);
        $caminho[] = $campo['nome'];

        $prefixo = match (true) {
            ($regra['quantificador'] ?? 'algum') === 'nenhum' => 'Nenhum de ',
            $volta                                            => 'Algum de ',
            default                                           => '',
        };
        $rotulo = match (true) {
            in_array($campo['tipo'], ['data', 'prazo', 'momento'], true) => self::ROTULOS_DE_DATA[$operador] ?? null,
            $campo['tipo'] === 'vinculo'                                 => ['igual' => 'é', 'diferente' => 'não é'][$operador] ?? null,
            default                                                      => null,
        } ?? self::ROTULOS[$operador] ?? $operador;

        $frase = $prefixo . implode(' › ', $caminho) . ' ' . $rotulo;
        if (in_array($operador, ['vazio', 'preenchido'], true)) {
            return $frase;
        }

        $frase .= ' ' . $this->textoDoValor($campo, (string) ($regra['valor'] ?? ''), $nomeDoValor);

        return $operador === 'entre'
            ? $frase . ' e ' . $this->textoDoValor($campo, (string) ($regra['valor_ate'] ?? ''), $nomeDoValor)
            : $frase;
    }

    private function textoDoValor(array $campo, string $valor, \Closure $nomeDoValor): string
    {
        $valor = trim($valor);

        return match ($campo['tipo']) {
            'data', 'prazo', 'momento' => self::dataValida($valor) ? (new \DateTimeImmutable($valor))->format('d/m/Y') : $valor,
            'numero'                   => is_numeric($valor) ? rtrim(rtrim(number_format((float) $valor, 2, ',', '.'), '0'), ',') : $valor,
            'responsavel', 'vinculo'   => $nomeDoValor($campo, $valor),
            'recorrencia'              => RecorrenciaService::PERIODOS[$valor]['rotulo'] ?? $valor,
            default                    => "“{$valor}”",
        };
    }

    /**
     * @return array{0: string, 1: array<string, string>} condição e parâmetros nomeados
     *
     * @throws \DomainException      filtro malformado ou com valor inválido
     * @throws AcessoNegadoException ligação para uma tabela que a pessoa não vê
     */
    public function paraSql(array $filtros, string $moduloId, string $apelido = 'r'): array
    {
        $this->binds       = [];
        $this->apelidos    = 0;
        $this->totalRegras = 0;

        $sql = $this->grupo($filtros, $moduloId, $apelido, 1);

        return [$sql ?? 'TRUE', $this->binds];
    }

    private function grupo(array $grupo, string $moduloId, string $a, int $nivel): ?string
    {
        if ($nivel > self::MAX_NIVEIS) {
            throw new \DomainException('O filtro tem grupos dentro de grupos demais.');
        }

        $logica = $grupo['logica'] ?? 'e';
        $regras = $grupo['regras'] ?? [];
        if (! in_array($logica, ['e', 'ou'], true) || ! is_array($regras)) {
            throw new \DomainException('Filtro inválido. Refaça o filtro.');
        }

        $partes = [];
        foreach ($regras as $regra) {
            if (! is_array($regra)) {
                throw new \DomainException('Filtro inválido. Refaça o filtro.');
            }
            $partes[] = array_key_exists('regras', $regra)
                ? $this->grupo($regra, $moduloId, $a, $nivel + 1)
                : $this->regra($regra, $moduloId, $a);
        }

        $partes = array_values(array_filter($partes, static fn ($p) => $p !== null));
        if ($partes === []) {
            return null;
        }

        return count($partes) === 1 ? $partes[0] : '(' . implode($logica === 'ou' ? ' OR ' : ' AND ', $partes) . ')';
    }

    private function regra(array $regra, string $moduloId, string $a): string
    {
        if (++$this->totalRegras > self::MAX_REGRAS) {
            throw new \DomainException('Use no máximo ' . self::MAX_REGRAS . ' filtros de uma vez.');
        }

        $via = $regra['via'] ?? [];
        if (! is_array($via) || ! array_is_list($via)) {
            throw new \DomainException('Filtro inválido. Refaça o filtro.');
        }
        if (count($via) > self::MAX_SALTOS) {
            throw new \DomainException('Um filtro passa por no máximo ' . self::MAX_SALTOS . ' ligações entre tabelas.');
        }
        if ($via === []) {
            return $this->condicao($regra, $moduloId, $a);
        }

        $quantificador = $regra['quantificador'] ?? 'algum';
        if (! in_array($quantificador, ['algum', 'nenhum'], true)) {
            throw new \DomainException('Filtro inválido. Refaça o filtro.');
        }

        $sql = $this->saltar($via, $regra, $moduloId, $a);

        return $quantificador === 'nenhum' ? "NOT {$sql}" : $sql;
    }

    /** Uma subconsulta EXISTS por ligação; a condição fica na última tabela. */
    private function saltar(array $via, array $regra, string $moduloId, string $a): string
    {
        $salto = array_shift($via);
        if (! is_array($salto)) {
            throw new \DomainException('Filtro inválido. Refaça o filtro.');
        }

        $campo = $this->campo($salto['campo'] ?? null);
        if ($campo['tipo'] !== 'vinculo' || empty($campo['modulo_vinculado_id'])) {
            throw new \DomainException("A coluna “{$campo['nome']}” não liga a outra tabela.");
        }

        $volta   = ($salto['sentido'] ?? 'ida') === 'volta';
        $origem  = $volta ? $campo['modulo_vinculado_id'] : $campo['modulo_id'];
        $destino = $volta ? $campo['modulo_id'] : $campo['modulo_vinculado_id'];
        if ($origem !== $moduloId) {
            throw new \DomainException("A ligação “{$campo['nome']}” não parte desta tabela.");
        }
        if (! ($this->podeVer)($destino)) {
            throw new AcessoNegadoException("Você não tem acesso à tabela ligada pela coluna “{$campo['nome']}”.");
        }

        $b       = 'v' . ++$this->apelidos;
        $chave   = $this->param($campo['id']);
        $ligacao = $volta
            ? self::contem($b, $chave, "{$a}.id::text")
            : "{$b}.id IN (" . self::idsLigados($a, $chave) . ')';

        $existe = "EXISTS (SELECT 1 FROM registro {$b} WHERE {$b}.modulo_id = {$this->param($destino)} AND {$ligacao}";

        if ($via !== []) {
            return $existe . ' AND ' . $this->saltar($via, $regra, $destino, $b) . ')';
        }

        if ((string) ($regra['campo'] ?? '') === '') {
            return match ($regra['operador'] ?? null) {
                'preenchido' => $existe . ')',
                'vazio'      => "NOT {$existe})",
                default      => throw new \DomainException('Escolha a coluna da tabela ligada.'),
            };
        }

        return $existe . ' AND ' . $this->condicao($regra, $destino, $b) . ')';
    }

    private function condicao(array $regra, string $moduloId, string $a): string
    {
        $campoId  = (string) ($regra['campo'] ?? '');
        $operador = (string) ($regra['operador'] ?? '');

        if (isset(self::COLUNAS_DO_SISTEMA[$campoId])) {
            $tipo = 'momento';
            $nome = self::COLUNAS_DO_SISTEMA[$campoId];
            $expr = "{$a}.{$campoId}::date";
        } else {
            $campo = $this->campo($campoId);
            if ($campo['modulo_id'] !== $moduloId) {
                throw new \DomainException("A coluna “{$campo['nome']}” não é desta tabela.");
            }
            $tipo  = $campo['tipo'];
            $nome  = $campo['nome'];
            $chave = $this->param($campo['id']);
            $expr  = $tipo === 'numero'
                ? "(CASE WHEN jsonb_typeof({$a}.dados->{$chave}) = 'number' THEN ({$a}.dados->>{$chave})::numeric END)"
                : "({$a}.dados->>{$chave})";
        }

        if (! in_array($operador, self::OPERADORES_POR_TIPO[$tipo] ?? [], true)) {
            throw new \DomainException("Essa comparação não vale para a coluna “{$nome}”.");
        }

        if ($tipo === 'vinculo') {
            return $this->condicaoDeVinculo($operador, $regra, $a, $chave, $nome);
        }

        if ($operador === 'vazio' || $operador === 'preenchido') {
            $vazio = $tipo === 'texto' ? "({$expr} IS NULL OR btrim({$expr}) = '')" : "({$expr} IS NULL)";

            return $operador === 'vazio' ? $vazio : "NOT {$vazio}";
        }

        $texto = $this->valor($regra['valor'] ?? null, $tipo, $nome);

        if ($operador === 'contem' || $operador === 'nao_contem') {
            $padrao = $this->param(self::padraoLike($texto));

            return $operador === 'contem' ? "{$expr} ILIKE {$padrao}" : "({$expr} IS NULL OR {$expr} NOT ILIKE {$padrao})";
        }

        $cast  = ['numero' => '::numeric', 'momento' => '::date'][$tipo] ?? '';
        $valor = $this->param($texto) . $cast;

        return match ($operador) {
            'igual'     => $tipo === 'texto' ? "lower({$expr}) = lower({$valor})" : "{$expr} = {$valor}",
            'diferente' => "({$expr} IS NULL OR " . ($tipo === 'texto' ? "lower({$expr}) <> lower({$valor})" : "{$expr} <> {$valor}") . ')',
            'maior'     => "{$expr} > {$valor}",
            'menor'     => "{$expr} < {$valor}",
            'entre'     => "{$expr} BETWEEN SYMMETRIC {$valor} AND "
                . $this->param($this->valor($regra['valor_ate'] ?? null, $tipo, $nome)) . $cast,
        };
    }

    /** Coluna de ligação: "igual" = aponta para aquele item (entre os que tiver). */
    private function condicaoDeVinculo(string $operador, array $regra, string $a, string $chave, string $nome): string
    {
        if ($operador === 'vazio' || $operador === 'preenchido') {
            $vazio = "(COALESCE({$a}.dados->{$chave}, '[]'::jsonb) = '[]'::jsonb)";

            return $operador === 'vazio' ? $vazio : "NOT {$vazio}";
        }

        $id = trim((string) (is_scalar($regra['valor'] ?? null) ? $regra['valor'] : ''));
        if (! self::uuidValido($id)) {
            throw new \DomainException("Escolha o item da coluna “{$nome}”.");
        }
        $contem = self::contem($a, $chave, $this->param($id) . '::text');

        return $operador === 'igual' ? $contem : "NOT {$contem}";
    }

    /** Valor de comparação, conferido para o tipo da coluna. */
    private function valor(mixed $valor, string $tipo, string $nome): string
    {
        $texto = is_scalar($valor) ? trim((string) $valor) : '';
        if ($texto === '') {
            throw new \DomainException("Informe o valor do filtro em “{$nome}”.");
        }
        if (mb_strlen($texto) > 500) {
            throw new \DomainException("O valor do filtro em “{$nome}” é longo demais.");
        }
        if ($tipo === 'numero' && ! is_numeric($texto)) {
            throw new \DomainException("O filtro em “{$nome}” precisa de um número.");
        }
        if (in_array($tipo, ['data', 'prazo', 'momento'], true) && ! self::dataValida($texto)) {
            throw new \DomainException("O filtro em “{$nome}” precisa de uma data (AAAA-MM-DD).");
        }

        return $texto;
    }

    private function campo(mixed $id): array
    {
        $campo = is_string($id) ? ($this->campos[$id] ?? null) : null;
        if ($campo === null) {
            throw new \DomainException('Uma das colunas do filtro não existe mais. Refaça o filtro.');
        }

        return $campo;
    }

    private function param(string $valor): string
    {
        $nome               = 'f' . (count($this->binds) + 1);
        $this->binds[$nome] = $valor;

        return ":{$nome}:";
    }

    /**
     * A coluna de ligação do item `$a` contém o id `$id` (expressão SQL de texto).
     * Guarda um id (um item) ou uma lista (vários): as duas formas usam o índice GIN.
     */
    private static function contem(string $a, string $chave, string $id): string
    {
        return "({$a}.dados @> jsonb_build_object({$chave}::text, {$id}) OR {$a}.dados @> jsonb_build_object({$chave}::text, jsonb_build_array({$id})))";
    }

    /** Ids guardados na coluna de ligação do item `$a`, como uuid (lista ou um só). */
    private static function idsLigados(string $a, string $chave): string
    {
        return 'SELECT e::uuid FROM jsonb_array_elements_text(CASE jsonb_typeof(' . "{$a}.dados->{$chave}"
            . ") WHEN 'array' THEN {$a}.dados->{$chave} WHEN 'string' THEN jsonb_build_array({$a}.dados->{$chave}) ELSE '[]'::jsonb END) AS e"
            . " WHERE e ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'";
    }

    /** "contém": % e _ digitados valem como texto, não como curinga. */
    private static function padraoLike(string $texto): string
    {
        return '%' . addcslashes($texto, '\\%_') . '%';
    }

    public static function uuidValido(string $valor): bool
    {
        return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $valor);
    }

    private static function dataValida(string $valor): bool
    {
        $data = \DateTime::createFromFormat('!Y-m-d', $valor);

        return $data !== false && $data->format('Y-m-d') === $valor;
    }
}
