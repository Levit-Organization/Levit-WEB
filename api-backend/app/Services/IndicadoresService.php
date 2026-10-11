<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Libraries\Relogio;

/**
 * Indicadores sobre os DADOS da empresa (não só sobre a atividade): funil de
 * recrutamento, entradas e saídas do financeiro, cumprimento de prazos e um
 * relatório montado pela pessoa (agrupar uma tabela por uma coluna).
 *
 * Todo indicador com período vem junto do valor do período anterior de mesmo
 * tamanho, para a tela e o PDF mostrarem a variação.
 *
 * Períodos: `$inicio` inclusivo e `$fim` exclusivo, no fuso local (Relogio).
 */
class IndicadoresService
{
    /** Fases de quem saiu do processo: ficam fora do funil e contam como saída. */
    public const FASES_DE_SAIDA = [
        'reprovado', 'reprovada', 'recusado', 'recusada', 'desistiu', 'desistente', 'desistencia',
        'eliminado', 'eliminada', 'descartado', 'descartada', 'perdido', 'perdida', 'cancelado',
        'cancelada', 'arquivado', 'arquivada', 'nao aprovado', 'nao aprovada', 'nao selecionado',
        'nao selecionada',
    ];

    /** Candidato parado na mesma fase há esse tanto de dias pede atenção. */
    public const DIAS_PARADO = 14;

    /** Colunas pelas quais dá para agrupar no relatório montado. */
    public const TIPOS_AGRUPAVEIS = ['selecao', 'responsavel', 'texto', 'data', 'prazo', 'recorrencia'];

    public const OPERACOES = ['contar', 'somar', 'media'];

    private const MAX_GRUPOS = 50;

    // ------------------------------------------------------------------
    // Painel
    // ------------------------------------------------------------------

    public function painel(string $empresaId, \DateTimeImmutable $inicio, \DateTimeImmutable $fim): array
    {
        [$antInicio, $antFim] = self::periodoAnterior($inicio, $fim);

        return [
            'periodo'          => self::descreverPeriodo($inicio, $fim),
            'periodo_anterior' => self::descreverPeriodo($antInicio, $antFim),
            'resumo'           => $this->resumo($empresaId, $inicio, $fim, $antInicio, $antFim),
            'recrutamento'     => $this->recrutamento($empresaId, $inicio, $fim, $antInicio, $antFim),
            'financeiro'       => $this->financeiro($empresaId, $inicio, $fim, $antInicio, $antFim),
            'prazos'           => $this->prazos($empresaId, $inicio, $fim, $antInicio, $antFim),
        ];
    }

    /** Período imediatamente anterior, com o mesmo número de dias. */
    public static function periodoAnterior(\DateTimeImmutable $inicio, \DateTimeImmutable $fim): array
    {
        $dias = (int) $inicio->diff($fim)->days;

        return [$inicio->modify("-{$dias} days"), $inicio];
    }

    /** Variação percentual; nula quando o anterior é zero e o atual não (não dá para calcular). */
    public static function variacao(float|int $atual, float|int $anterior): ?float
    {
        if ((float) $anterior === 0.0) {
            return (float) $atual === 0.0 ? 0.0 : null;
        }

        return round(($atual - $anterior) / abs($anterior) * 100, 1);
    }

    public static function comparar(float|int $atual, float|int $anterior): array
    {
        return ['atual' => $atual, 'anterior' => $anterior, 'variacao' => self::variacao($atual, $anterior)];
    }

    /** Datas inclusivas para exibir (o fim é exclusivo: mostra o dia anterior). */
    public static function descreverPeriodo(\DateTimeImmutable $inicio, \DateTimeImmutable $fim): array
    {
        return ['inicio' => $inicio->format('Y-m-d'), 'fim' => $fim->modify('-1 day')->format('Y-m-d')];
    }

    private static function utc(\DateTimeImmutable $d): string
    {
        return $d->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }

    // ------------------------------------------------------------------
    // Resumo
    // ------------------------------------------------------------------

    private function resumo(string $empresaId, \DateTimeImmutable $inicio, \DateTimeImmutable $fim, \DateTimeImmutable $antInicio, \DateTimeImmutable $antFim): array
    {
        $db = db_connect();

        $contar = static function (string $sql, \DateTimeImmutable $de, \DateTimeImmutable $ate) use ($db, $empresaId): int {
            return (int) ($db->query($sql, [$empresaId, self::utc($de), self::utc($ate)])->getRowArray()['n'] ?? 0);
        };

        $sqlAtividades = 'SELECT COUNT(*) AS n FROM atividade WHERE empresa_id = ? AND criado_em >= ? AND criado_em < ?';
        $sqlPessoas    = 'SELECT COUNT(DISTINCT usuario_id) AS n FROM atividade WHERE empresa_id = ? AND usuario_id IS NOT NULL AND criado_em >= ? AND criado_em < ?';
        $sqlItens      = 'SELECT COUNT(*) AS n FROM registro r JOIN modulo m ON m.id = r.modulo_id WHERE m.empresa_id = ? AND r.criado_em >= ? AND r.criado_em < ?';
        $sqlCandidatos = 'SELECT COUNT(*) AS n FROM candidato c JOIN modulo m ON m.id = c.modulo_id WHERE m.empresa_id = ? AND c.criado_em >= ? AND c.criado_em < ?';

        $resumo = [];
        foreach (['atividades' => $sqlAtividades, 'pessoas_ativas' => $sqlPessoas, 'itens_criados' => $sqlItens, 'candidatos' => $sqlCandidatos] as $chave => $sql) {
            $resumo[$chave] = self::comparar($contar($sql, $inicio, $fim), $contar($sql, $antInicio, $antFim));
        }

        return $resumo;
    }

    // ------------------------------------------------------------------
    // Recrutamento
    // ------------------------------------------------------------------

    private function recrutamento(string $empresaId, \DateTimeImmutable $inicio, \DateTimeImmutable $fim, \DateTimeImmutable $antInicio, \DateTimeImmutable $antFim): array
    {
        $db      = db_connect();
        $modulos = $db->table('modulo')->select('id, nome')->where('empresa_id', $empresaId)->where('tipo', 'recrutamento')
            ->orderBy('nome', 'ASC')->get()->getResultArray();
        if ($modulos === []) {
            return [];
        }
        $ids = array_column($modulos, 'id');

        $fases = $db->table('fase_recrutamento')->select('id, modulo_id, nome, ordem')->whereIn('modulo_id', $ids)
            ->orderBy('ordem', 'ASC')->get()->getResultArray();
        $candidatos = $db->table('candidato')->select('id, modulo_id, fase_atual_id, criado_em')->whereIn('modulo_id', $ids)
            ->get()->getResultArray();
        $historico = $candidatos === [] ? [] : $db->query(
            'SELECT h.candidato_id, h.fase_anterior_id, h.fase_nova_id, h.criado_em
               FROM historico_fase h JOIN candidato c ON c.id = h.candidato_id
              WHERE c.modulo_id IN ? ORDER BY h.criado_em ASC, h.id ASC',
            [$ids]
        )->getResultArray();

        $periodos = [
            'atual'    => [self::utc($inicio), self::utc($fim)],
            'anterior' => [self::utc($antInicio), self::utc($antFim)],
        ];
        $agora = self::utc(Relogio::agora());

        $resultado = [];
        foreach ($modulos as $modulo) {
            $resultado[] = ['modulo_id' => $modulo['id'], 'nome' => $modulo['nome']] + self::funil(
                array_values(array_filter($fases, static fn ($f) => $f['modulo_id'] === $modulo['id'])),
                array_values(array_filter($candidatos, static fn ($c) => $c['modulo_id'] === $modulo['id'])),
                $historico,
                $periodos,
                $agora
            );
        }

        return $resultado;
    }

    public static function faseDeSaida(string $nome): bool
    {
        return in_array(PrazoService::normalizar($nome), self::FASES_DE_SAIDA, true);
    }

    /**
     * Funil de uma vaga (cálculo puro, testável sem banco). Timestamps em UTC.
     *
     * - `fases[].atual`: quantos estão na fase agora.
     * - `fases[].chegaram`: dos candidatos que se inscreveram no período, quantos
     *   chegaram até essa fase (ou passaram dela). É o funil de conversão.
     * - `fases[].dias_medios`: tempo médio que ficaram na fase, contando quem
     *   saiu dela no período.
     * - Fases de saída (Reprovado, Desistiu...) ficam fora do funil.
     *
     * @param array<int, array{id: string, nome: string, ordem: int|string}>                                 $fases     ordenadas
     * @param array<int, array{id: string, fase_atual_id: string, criado_em: string}>                         $candidatos
     * @param array<int, array{candidato_id: string, fase_anterior_id: ?string, fase_nova_id: ?string, criado_em: string}> $historico ordenado por data
     * @param array{atual: array{0: string, 1: string}, anterior: array{0: string, 1: string}}               $periodos
     */
    public static function funil(array $fases, array $candidatos, array $historico, array $periodos, string $agora): array
    {
        $noFunil = array_values(array_filter($fases, static fn ($f) => ! self::faseDeSaida($f['nome'])));
        $posicao = [];
        foreach ($noFunil as $i => $f) {
            $posicao[$f['id']] = $i;
        }
        $ultima = $noFunil === [] ? null : $noFunil[count($noFunil) - 1]['id'];
        $saida  = array_column(array_filter($fases, static fn ($f) => self::faseDeSaida($f['nome'])), 'id');

        $porCandidato = [];
        foreach ($historico as $h) {
            $porCandidato[$h['candidato_id']][] = $h;
        }

        $noPeriodo = static fn (string $t, string $p) => $t >= $periodos[$p][0] && $t < $periodos[$p][1];

        $atual       = array_fill_keys(array_column($fases, 'id'), 0);
        $chegaram    = array_fill_keys(array_keys($posicao), 0);
        $permanencia = [];
        $inscritos   = ['atual' => 0, 'anterior' => 0];
        $concluidos  = ['atual' => 0, 'anterior' => 0];
        $sairam      = ['atual' => 0, 'anterior' => 0];
        $parados     = 0;
        $limiteParado = (new \DateTimeImmutable($agora))->modify('-' . self::DIAS_PARADO . ' days')->format('Y-m-d H:i:s');

        foreach ($candidatos as $c) {
            if (array_key_exists($c['fase_atual_id'], $atual)) {
                $atual[$c['fase_atual_id']]++;
            }
            $movimentos = $porCandidato[$c['id']] ?? [];

            // Linha do tempo: em que fase entrou e quando.
            $faseInicial = $movimentos[0]['fase_anterior_id'] ?? $c['fase_atual_id'];
            $entradas    = [[$faseInicial, $c['criado_em']]];
            foreach ($movimentos as $m) {
                $entradas[] = [$m['fase_nova_id'], $m['criado_em']];
            }

            // Quanto tempo ficou em cada fase (só o que terminou no período).
            for ($i = 0; $i < count($entradas) - 1; $i++) {
                [$fase, $desde] = $entradas[$i];
                $ate            = $entradas[$i + 1][1];
                if ($fase !== null && isset($posicao[$fase]) && $noPeriodo($ate, 'atual')) {
                    $permanencia[$fase][] = (strtotime($ate) - strtotime($desde)) / 86400;
                }
            }

            foreach (['atual', 'anterior'] as $p) {
                if ($noPeriodo($c['criado_em'], $p)) {
                    $inscritos[$p]++;
                }
                foreach ($movimentos as $m) {
                    if (! $noPeriodo($m['criado_em'], $p)) {
                        continue;
                    }
                    if ($m['fase_nova_id'] === $ultima) {
                        $concluidos[$p]++;
                    } elseif (in_array($m['fase_nova_id'], $saida, true)) {
                        $sairam[$p]++;
                    }
                }
            }

            // Funil: até onde chegou quem se inscreveu no período.
            if ($noPeriodo($c['criado_em'], 'atual')) {
                $maisLonge = -1;
                foreach ($entradas as [$fase]) {
                    if ($fase !== null && isset($posicao[$fase])) {
                        $maisLonge = max($maisLonge, $posicao[$fase]);
                    }
                }
                foreach ($posicao as $id => $pos) {
                    if ($pos <= $maisLonge) {
                        $chegaram[$id]++;
                    }
                }
            }

            $ultimoMovimento = $entradas[count($entradas) - 1][1];
            $emAndamento     = isset($posicao[$c['fase_atual_id']]) && $c['fase_atual_id'] !== $ultima;
            if ($emAndamento && $ultimoMovimento < $limiteParado) {
                $parados++;
            }
        }

        return [
            'fases' => array_map(static fn ($f) => [
                'id'          => $f['id'],
                'nome'        => $f['nome'],
                'saida'       => ! isset($posicao[$f['id']]),
                'atual'       => $atual[$f['id']] ?? 0,
                'chegaram'    => $chegaram[$f['id']] ?? null,
                'dias_medios' => isset($permanencia[$f['id']])
                    ? round(array_sum($permanencia[$f['id']]) / count($permanencia[$f['id']]), 1)
                    : null,
            ], $fases),
            'inscritos'  => self::comparar($inscritos['atual'], $inscritos['anterior']),
            'concluidos' => self::comparar($concluidos['atual'], $concluidos['anterior']),
            'sairam'     => self::comparar($sairam['atual'], $sairam['anterior']),
            'parados'    => $parados,
            'total'      => count($candidatos),
        ];
    }

    // ------------------------------------------------------------------
    // Financeiro
    // ------------------------------------------------------------------

    private function financeiro(string $empresaId, \DateTimeImmutable $inicio, \DateTimeImmutable $fim, \DateTimeImmutable $antInicio, \DateTimeImmutable $antFim): array
    {
        $db      = db_connect();
        $modulos = $db->table('modulo')->select('id, nome')->where('empresa_id', $empresaId)->where('tipo', 'financeiro')
            ->orderBy('nome', 'ASC')->get()->getResultArray();
        if ($modulos === []) {
            return [];
        }

        // data_lancamento é DATE local: compara com as datas locais do período.
        $totais = static function (string $moduloId, \DateTimeImmutable $de, \DateTimeImmutable $ate) use ($db): array {
            $linhas = $db->query(
                'SELECT tipo, COALESCE(SUM(valor), 0) AS total FROM lancamento_financeiro
                  WHERE modulo_id = ? AND data_lancamento >= ? AND data_lancamento < ? GROUP BY tipo',
                [$moduloId, $de->format('Y-m-d'), $ate->format('Y-m-d')]
            )->getResultArray();
            $porTipo = array_column($linhas, 'total', 'tipo');

            return ['entradas' => (float) ($porTipo['entrada'] ?? 0), 'saidas' => (float) ($porTipo['saida'] ?? 0)];
        };

        // Série dos 6 meses que terminam no mês do fim do período.
        $ultimoMes   = $fim->modify('-1 day')->modify('first day of this month');
        $primeiroMes = $ultimoMes->modify('-5 months');
        $meses       = [];
        for ($m = $primeiroMes; $m <= $ultimoMes; $m = $m->modify('+1 month')) {
            $meses[] = $m->format('Y-m');
        }

        $resultado = [];
        foreach ($modulos as $modulo) {
            $atual    = $totais($modulo['id'], $inicio, $fim);
            $anterior = $totais($modulo['id'], $antInicio, $antFim);

            $categorias = $db->query(
                "SELECT l.tipo, COALESCE(c.nome, 'Sem categoria') AS categoria, SUM(l.valor) AS total
                   FROM lancamento_financeiro l LEFT JOIN categoria_financeira c ON c.id = l.categoria_id
                  WHERE l.modulo_id = ? AND l.data_lancamento >= ? AND l.data_lancamento < ?
                  GROUP BY l.tipo, COALESCE(c.nome, 'Sem categoria') ORDER BY total DESC",
                [$modulo['id'], $inicio->format('Y-m-d'), $fim->format('Y-m-d')]
            )->getResultArray();

            $serie = array_fill_keys($meses, ['entradas' => 0.0, 'saidas' => 0.0]);
            foreach ($db->query(
                "SELECT to_char(data_lancamento, 'YYYY-MM') AS mes, tipo, SUM(valor) AS total FROM lancamento_financeiro
                  WHERE modulo_id = ? AND data_lancamento >= ? AND data_lancamento < ? GROUP BY 1, 2",
                [$modulo['id'], $primeiroMes->format('Y-m-d'), $ultimoMes->modify('+1 month')->format('Y-m-d')]
            )->getResultArray() as $l) {
                $serie[$l['mes']][$l['tipo'] === 'entrada' ? 'entradas' : 'saidas'] = (float) $l['total'];
            }

            $porCategoria = static fn (string $tipo) => array_values(array_map(
                static fn ($c) => ['categoria' => $c['categoria'], 'total' => (float) $c['total']],
                array_filter($categorias, static fn ($c) => $c['tipo'] === $tipo)
            ));

            $resultado[] = [
                'modulo_id' => $modulo['id'],
                'nome'      => $modulo['nome'],
                'entradas'  => self::comparar($atual['entradas'], $anterior['entradas']),
                'saidas'    => self::comparar($atual['saidas'], $anterior['saidas']),
                'saldo'     => self::comparar(
                    round($atual['entradas'] - $atual['saidas'], 2),
                    round($anterior['entradas'] - $anterior['saidas'], 2)
                ),
                'saidas_por_categoria'   => $porCategoria('saida'),
                'entradas_por_categoria' => $porCategoria('entrada'),
                'meses'                  => array_map(
                    static fn ($mes, $v) => ['mes' => $mes] + $v,
                    array_keys($serie),
                    $serie
                ),
            ];
        }

        return $resultado;
    }

    // ------------------------------------------------------------------
    // Prazos
    // ------------------------------------------------------------------

    private function prazos(string $empresaId, \DateTimeImmutable $inicio, \DateTimeImmutable $fim, \DateTimeImmutable $antInicio, \DateTimeImmutable $antFim): array
    {
        $servico = new PrazoService();
        $modulos = $servico->modulosDeDados($empresaId);
        $ids     = array_column($modulos, 'id');
        $hoje    = Relogio::hoje();

        $atual    = $this->prazosVencendoEntre($ids, $inicio->format('Y-m-d'), $fim->format('Y-m-d'), $hoje);
        $anterior = $this->prazosVencendoEntre($ids, $antInicio->format('Y-m-d'), $antFim->format('Y-m-d'), $hoje);

        $atrasados = array_values(array_filter(
            $servico->comNomesDosResponsaveis($servico->itensEmAberto($modulos, $ids, $hoje, 0), $empresaId),
            static fn ($i) => $i['prazo'] < $hoje
        ));
        $porResponsavel = [];
        foreach ($atrasados as $i) {
            $nome                  = $i['responsavel_nome'] ?: 'Sem responsável';
            $porResponsavel[$nome] = ($porResponsavel[$nome] ?? 0) + 1;
        }
        arsort($porResponsavel);

        $taxa = static fn (array $p) => $p['total'] === 0 ? null : round($p['concluidos'] / $p['total'] * 100);

        return [
            'vencendo'        => self::comparar($atual['total'], $anterior['total']),
            'concluidos'      => self::comparar($atual['concluidos'], $anterior['concluidos']),
            'taxa_conclusao'  => ['atual' => $taxa($atual), 'anterior' => $taxa($anterior)],
            'atrasados_agora' => count($atrasados),
            'atrasados_por_responsavel' => array_map(
                static fn ($nome, $n) => ['responsavel' => $nome, 'total' => $n],
                array_keys(array_slice($porResponsavel, 0, 10, true)),
                array_slice($porResponsavel, 0, 10, true)
            ),
        ];
    }

    /**
     * Prazos que vencem em [de, ate) e quantos deles já estão concluídos (alguma
     * coluna de lista numa opção de fim de trabalho, mesma regra do PrazoService).
     *
     * @return array{total: int, concluidos: int}
     */
    private function prazosVencendoEntre(array $moduloIds, string $de, string $ate, string $hoje): array
    {
        if ($moduloIds === []) {
            return ['total' => 0, 'concluidos' => 0];
        }
        $db     = db_connect();
        $campos = $db->table('campo_modulo')->select('id, modulo_id, tipo')->whereIn('modulo_id', $moduloIds)
            ->whereIn('tipo', ['prazo', 'selecao'])->get()->getResultArray();

        $porModulo = [];
        foreach ($campos as $c) {
            $porModulo[$c['modulo_id']][$c['tipo']][] = $c['id'];
        }

        $filtros  = [];
        $bindings = [];
        foreach ($porModulo as $moduloId => $tipos) {
            foreach ($tipos['prazo'] ?? [] as $prazoId) {
                $filtros[] = "(modulo_id = ? AND dados->>? >= ? AND dados->>? < ?)";
                array_push($bindings, $moduloId, $prazoId, $de, $prazoId, $ate);
            }
        }
        if ($filtros === []) {
            return ['total' => 0, 'concluidos' => 0];
        }

        $total      = 0;
        $concluidos = 0;
        foreach ($db->query('SELECT modulo_id, dados FROM registro WHERE ' . implode(' OR ', $filtros), $bindings)->getResultArray() as $linha) {
            $dados = json_decode($linha['dados'], true) ?: [];
            $tipos = $porModulo[$linha['modulo_id']];
            $feito = false;
            foreach ($tipos['selecao'] ?? [] as $listaId) {
                if (PrazoService::opcaoDeConclusao(isset($dados[$listaId]) ? (string) $dados[$listaId] : null)) {
                    $feito = true;
                    break;
                }
            }
            foreach ($tipos['prazo'] as $prazoId) {
                $data = $dados[$prazoId] ?? null;
                if (is_string($data) && $data >= $de && $data < $ate) {
                    $total++;
                    $concluidos += $feito ? 1 : 0;
                }
            }
        }

        return ['total' => $total, 'concluidos' => $concluidos];
    }

    // ------------------------------------------------------------------
    // Relatório montado: agrupar uma tabela por uma coluna
    // ------------------------------------------------------------------

    /** Tabelas de dados com as colunas que servem para agrupar e para somar. */
    public function tabelas(string $empresaId): array
    {
        $db      = db_connect();
        $modulos = $db->table('modulo')->select('id, nome, icone')->where('empresa_id', $empresaId)->where('tipo', 'dados')
            ->orderBy('nome', 'ASC')->get()->getResultArray();
        if ($modulos === []) {
            return [];
        }
        $campos = $db->table('campo_modulo')->select('id, modulo_id, nome, tipo')->whereIn('modulo_id', array_column($modulos, 'id'))
            ->orderBy('ordem', 'ASC')->get()->getResultArray();

        return array_map(static function ($m) use ($campos) {
            $doModulo = array_values(array_filter($campos, static fn ($c) => $c['modulo_id'] === $m['id']));

            return $m + [
                'agrupar' => array_values(array_map(
                    static fn ($c) => ['id' => $c['id'], 'nome' => $c['nome'], 'tipo' => $c['tipo']],
                    array_filter($doModulo, static fn ($c) => in_array($c['tipo'], self::TIPOS_AGRUPAVEIS, true))
                )),
                'numeros' => array_values(array_map(
                    static fn ($c) => ['id' => $c['id'], 'nome' => $c['nome']],
                    array_filter($doModulo, static fn ($c) => $c['tipo'] === 'numero')
                )),
            ];
        }, $modulos);
    }

    /**
     * Agrupa os itens de uma tabela por uma coluna e conta, soma ou tira a
     * média de uma coluna de número. Datas e prazos agrupam por mês.
     * O período (opcional) filtra pela data de criação do item.
     */
    public function agrupar(string $empresaId, array $params): array
    {
        $db       = db_connect();
        $moduloId = (string) ($params['modulo_id'] ?? '');
        $modulo   = preg_match('/^[0-9a-f-]{36}$/i', $moduloId)
            ? $db->table('modulo')->select('id, nome')->where('id', $moduloId)->where('empresa_id', $empresaId)->where('tipo', 'dados')->get()->getRowArray()
            : null;
        if (! $modulo) {
            throw new NaoEncontradoException('Tabela não encontrada.');
        }

        $campos = array_column(
            $db->table('campo_modulo')->select('id, nome, tipo')->where('modulo_id', $moduloId)->get()->getResultArray(),
            null,
            'id'
        );

        $grupo = $campos[(string) ($params['agrupar_por'] ?? '')] ?? null;
        if (! $grupo || ! in_array($grupo['tipo'], self::TIPOS_AGRUPAVEIS, true)) {
            throw new \DomainException('Escolha uma coluna para agrupar (lista, responsável, texto ou data).');
        }

        $operacao = (string) ($params['operacao'] ?? 'contar');
        if (! in_array($operacao, self::OPERACOES, true)) {
            throw new \DomainException('Escolha entre contar, somar ou tirar a média.');
        }
        $valor = null;
        if ($operacao !== 'contar') {
            $valor = $campos[(string) ($params['campo_valor'] ?? '')] ?? null;
            if (! $valor || $valor['tipo'] !== 'numero') {
                throw new \DomainException('Para somar ou tirar a média, escolha uma coluna de número.');
            }
        }

        $porMes      = in_array($grupo['tipo'], ['data', 'prazo'], true);
        $expressao   = $porMes
            ? "CASE WHEN dados->>? ~ '^[0-9]{4}-[0-9]{2}' THEN substr(dados->>?, 1, 7) END"
            : "NULLIF(dados->>?, '')";
        $bindings    = $porMes ? [$grupo['id'], $grupo['id']] : [$grupo['id']];
        $numero      = "CASE WHEN dados->>? ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (dados->>?)::numeric END";
        $valorId     = $valor['id'] ?? $grupo['id'];
        array_push($bindings, $valorId, $valorId, $moduloId);

        $filtroPeriodo = '';
        $inicio        = self::dataValida($params['inicio'] ?? null);
        $fim           = self::dataValida($params['fim'] ?? null);
        if ($inicio && $fim) {
            $filtroPeriodo = ' AND criado_em >= ? AND criado_em < ?';
            $bindings[]    = self::utc(new \DateTimeImmutable($inicio . ' 00:00:00', Relogio::fuso()));
            $bindings[]    = self::utc((new \DateTimeImmutable($fim . ' 00:00:00', Relogio::fuso()))->modify('+1 day'));
        }

        $linhas = $db->query(
            "SELECT grupo, COUNT(*) AS total, SUM(v) AS soma, AVG(v) AS media FROM (
                SELECT {$expressao} AS grupo, {$numero} AS v FROM registro WHERE modulo_id = ?{$filtroPeriodo}
             ) t GROUP BY grupo",
            $bindings
        )->getResultArray();

        $nomes = [];
        if ($grupo['tipo'] === 'responsavel') {
            $idsPessoas = array_values(array_filter(array_column($linhas, 'grupo'), static fn ($id) => is_string($id) && preg_match('/^[0-9a-f-]{36}$/i', $id)));
            if ($idsPessoas !== []) {
                $nomes = array_column(
                    $db->table('usuario')->select('id, nome')->where('empresa_id', $empresaId)->whereIn('id', $idsPessoas)->get()->getResultArray(),
                    'nome',
                    'id'
                );
            }
        }

        return [
            'tabela'      => $modulo['nome'],
            'agrupado_por' => $grupo['nome'],
            'operacao'    => $operacao,
            'coluna_valor' => $valor['nome'] ?? null,
        ] + self::montarGrupos($linhas, $operacao, $grupo['tipo'], $nomes);
    }

    /** Formata e ordena os grupos (cálculo puro, testável sem banco). */
    public static function montarGrupos(array $linhas, string $operacao, string $tipoGrupo, array $nomesPessoas = []): array
    {
        $porMes = in_array($tipoGrupo, ['data', 'prazo'], true);
        $grupos = array_map(static function ($l) use ($operacao, $tipoGrupo, $nomesPessoas) {
            $chave = $l['grupo'];
            $rotulo = match (true) {
                $chave === null || $chave === '' => $tipoGrupo === 'responsavel' ? 'Sem responsável' : 'Sem valor',
                $tipoGrupo === 'responsavel'     => $nomesPessoas[$chave] ?? 'Pessoa removida',
                default                          => (string) $chave,
            };
            $valor = match ($operacao) {
                'somar' => round((float) ($l['soma'] ?? 0), 2),
                'media' => $l['media'] === null ? null : round((float) $l['media'], 2),
                default => (int) $l['total'],
            };

            return ['chave' => $chave, 'rotulo' => $rotulo, 'valor' => $valor, 'itens' => (int) $l['total']];
        }, $linhas);

        // Datas em ordem cronológica (sem valor no fim); o resto do maior para o menor.
        usort($grupos, $porMes
            ? static fn ($a, $b) => [$a['chave'] === null, $a['chave']] <=> [$b['chave'] === null, $b['chave']]
            : static fn ($a, $b) => [$a['chave'] === null, -($a['valor'] ?? 0), $a['rotulo']] <=> [$b['chave'] === null, -($b['valor'] ?? 0), $b['rotulo']]);

        $cortados = max(0, count($grupos) - self::MAX_GRUPOS);
        $grupos   = array_slice($grupos, 0, self::MAX_GRUPOS);

        return [
            'grupos'      => array_map(static fn ($g) => array_diff_key($g, ['chave' => 1]), $grupos),
            'total_itens' => array_sum(array_column($linhas, 'total')),
            'cortados'    => $cortados,
        ];
    }

    private static function dataValida(mixed $d): ?string
    {
        return is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && \DateTimeImmutable::createFromFormat('Y-m-d', $d)?->format('Y-m-d') === $d
            ? $d
            : null;
    }
}
