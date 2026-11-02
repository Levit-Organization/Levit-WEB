<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CampoModuloModel;
use App\Models\ModuloModel;
use App\Models\RegistroModel;
use App\Services\Pesquisa\Filtros;
use CodeIgniter\Events\Events;

class RegistroService
{
    protected ModuloModel $moduloModel;
    protected CampoModuloModel $campoModuloModel;
    protected RegistroModel $registroModel;
    protected AutorizacaoModuloService $autorizacaoModuloService;

    /** @var array<string, bool> pessoas já conferidas nesta requisição */
    private array $pessoasConferidas = [];

    public function __construct()
    {
        $this->moduloModel              = new ModuloModel();
        $this->campoModuloModel         = new CampoModuloModel();
        $this->registroModel            = new RegistroModel();
        $this->autorizacaoModuloService = new AutorizacaoModuloService();
    }

    /**
     * Itens da tabela, mais novos primeiro. `busca` procura nas colunas de texto;
     * `filtros` é a pesquisa avançada (ver Pesquisa\Filtros), que pode olhar os
     * dados das tabelas ligadas. As duas se somam.
     */
    public function listarRegistros(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, ?string $busca = null, ?array $filtros = null): array
    {
        $modulo = $this->moduloDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $busca = trim((string) $busca);

        if ($modulo['tipo'] === 'arquivo') {
            return $this->listarArquivos($moduloId, $busca);
        }

        $comFiltros = ! empty($filtros['regras']);

        if ($busca === '' && ! $comFiltros) {
            return $this->registroModel
                ->where('modulo_id', $moduloId)
                ->orderBy('criado_em', 'DESC')
                ->findAll();
        }

        $condicoes = ['r.modulo_id = :modulo:'];
        $binds     = ['modulo' => $moduloId];

        if ($busca !== '') {
            $camposTexto = $this->campoModuloModel
                ->where('modulo_id', $moduloId)
                ->where('tipo', 'texto')
                ->findAll();

            if (empty($camposTexto)) {
                return [];
            }

            $ou = [];
            foreach ($camposTexto as $campo) {
                $ou[] = "r.dados->>'{$campo['id']}' ILIKE :busca:";
            }
            $condicoes[]    = '(' . implode(' OR ', $ou) . ')';
            $binds['busca'] = '%' . $busca . '%';
        }

        if ($comFiltros) {
            [$sql, $parametros] = $this->pesquisa($empresaId, $cargoId, $acessoTotal)->paraSql($filtros, $moduloId, 'r');
            $condicoes[]        = $sql;
            $binds += $parametros;
        }

        $sql = 'SELECT r.* FROM registro r WHERE ' . implode(' AND ', $condicoes) . ' ORDER BY r.criado_em DESC';

        $registros = db_connect()->query($sql, $binds)->getResultArray();

        foreach ($registros as &$registro) {
            $registro['dados'] = json_decode($registro['dados'], true);
        }

        return $registros;
    }

    /**
     * Tabela de arquivos: cada item é um arquivo, então a lista traz o nome,
     * o tamanho, o tipo e quem enviou. A busca procura no nome do arquivo.
     * A chave no armazenamento nunca sai daqui.
     */
    private function listarArquivos(string $moduloId, string $busca): array
    {
        $sql = 'SELECT r.id, r.modulo_id, r.criado_por, r.criado_em, r.atualizado_em,
                       a.nome_original AS arquivo_nome, a.tamanho_bytes AS arquivo_tamanho,
                       a.tipo_mime AS arquivo_tipo, u.nome AS enviado_por_nome
                  FROM registro r
                  JOIN arquivo a ON a.registro_id = r.id
             LEFT JOIN usuario u ON u.id = r.criado_por
                 WHERE r.modulo_id = :modulo:';
        $binds = ['modulo' => $moduloId];

        if ($busca !== '') {
            $sql .= ' AND a.nome_original ILIKE :busca:';
            $binds['busca'] = '%' . $busca . '%';
        }

        $arquivos = db_connect()->query($sql . ' ORDER BY r.criado_em DESC', $binds)->getResultArray();

        foreach ($arquivos as &$arquivo) {
            $arquivo['arquivo_tamanho'] = (int) $arquivo['arquivo_tamanho'];
        }

        return $arquivos;
    }

    /** Pesquisa avançada com as colunas de todas as tabelas da empresa e o acesso de quem pesquisa. */
    private function pesquisa(string $empresaId, string $cargoId, bool $acessoTotal): Filtros
    {
        $campos = db_connect()->query(
            'SELECT c.id, c.modulo_id, c.nome, c.tipo, c.modulo_vinculado_id FROM campo_modulo c JOIN modulo m ON m.id = c.modulo_id WHERE m.empresa_id = ?',
            [$empresaId]
        )->getResultArray();

        return new Filtros(
            array_column($campos, null, 'id'),
            fn (string $moduloId): bool => $this->autorizacaoModuloService->filtrarModulosComNivel([$moduloId], $acessoTotal, $cargoId, 'visualizar') !== []
        );
    }

    /** Máximo de itens mostrados por ligação recebida (o total vem à parte). */
    public const MAX_LIGADOS_MOSTRADOS = 50;

    /**
     * O outro lado das ligações: itens de outras tabelas (ou desta) que apontam
     * para este, agrupados pela coluna que faz a ligação. Ex.: num cliente, os
     * pedidos dele. Só entram tabelas que a pessoa vê, e ligações sem itens não.
     *
     * @return list<array{campo_id: string, campo_nome: string, modulo: array, total: int, itens: list<array{id: string, titulo: ?string}>}>
     */
    public function itensQueApontam(string $registroId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $this->buscarRegistro($registroId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $ligacoes = $this->campoModuloModel
            ->select('campo_modulo.id, campo_modulo.nome, campo_modulo.modulo_id, modulo.nome AS modulo_nome, modulo.icone AS modulo_icone')
            ->join('modulo', 'modulo.id = campo_modulo.modulo_id')
            ->where('campo_modulo.modulo_vinculado_id', $moduloId)
            ->orderBy('modulo.nome', 'ASC')
            ->findAll();
        if ($ligacoes === []) {
            return [];
        }

        $visiveis = array_flip($this->autorizacaoModuloService->filtrarModulosComNivel(
            array_values(array_unique(array_column($ligacoes, 'modulo_id'))), $acessoTotal, $cargoId, 'visualizar'
        ));

        $grupos = [];
        foreach ($ligacoes as $ligacao) {
            if (! isset($visiveis[$ligacao['modulo_id']])) {
                continue;
            }

            $linhas = db_connect()->query(
                'SELECT id, COUNT(*) OVER () AS total FROM registro
                  WHERE modulo_id = :modulo:
                    AND (dados @> jsonb_build_object(:campo:::text, :item:::text) OR dados @> jsonb_build_object(:campo:::text, jsonb_build_array(:item:::text)))
                  ORDER BY criado_em DESC LIMIT ' . self::MAX_LIGADOS_MOSTRADOS,
                ['modulo' => $ligacao['modulo_id'], 'campo' => $ligacao['id'], 'item' => $registroId]
            )->getResultArray();
            if ($linhas === []) {
                continue;
            }

            $titulos  = $this->titulosDosItens($ligacao['modulo_id'], array_column($linhas, 'id'));
            $grupos[] = [
                'campo_id'   => $ligacao['id'],
                'campo_nome' => $ligacao['nome'],
                'modulo'     => ['id' => $ligacao['modulo_id'], 'nome' => $ligacao['modulo_nome'], 'icone' => $ligacao['modulo_icone']],
                'total'      => (int) $linhas[0]['total'],
                'itens'      => array_map(static fn ($l) => ['id' => $l['id'], 'titulo' => $titulos[$l['id']] ?? null], $linhas),
            ];
        }

        return $grupos;
    }

    /** Itens da tabela como { id, titulo }, para escolher e mostrar ligações. */
    public function listarTitulos(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $this->confirmarModuloDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $lista = [];
        foreach ($this->titulosDosItens($moduloId) as $id => $titulo) {
            $lista[] = ['id' => $id, 'titulo' => $titulo];
        }

        return $lista;
    }

    /**
     * Título de cada item: o valor da primeira coluna de texto (ou da primeira
     * coluna, se não houver texto). É o "nome" do item onde ele aparece ligado.
     * Sem checagem de acesso: quem chama decide.
     *
     * @param list<string>|null $ids só estes itens (null = todos)
     *
     * @return array<string, string|null> id => título, em ordem alfabética
     */
    public function titulosDosItens(string $moduloId, ?array $ids = null): array
    {
        if ($ids !== null) {
            $ids = array_values(array_filter($ids, static fn ($id) => is_string($id) && Filtros::uuidValido($id)));
            if ($ids === []) {
                return [];
            }
        }

        $campos = $this->campoModuloModel->select('id, tipo')->where('modulo_id', $moduloId)->orderBy('ordem', 'ASC')->findAll();
        $titulo = self::campoDeTitulo($campos) !== null ? 'dados->>:campo:' : 'NULL';

        $linhas = db_connect()->query(
            "SELECT id, {$titulo} AS titulo FROM registro WHERE modulo_id = :modulo:"
            . ($ids !== null ? ' AND id IN :ids:' : '')
            . ($titulo !== 'NULL' ? " ORDER BY lower({$titulo}) NULLS LAST, criado_em" : ' ORDER BY criado_em'),
            ['modulo' => $moduloId, 'campo' => (string) self::campoDeTitulo($campos), 'ids' => $ids ?? []]
        )->getResultArray();

        return array_column($linhas, 'titulo', 'id');
    }

    /** A coluna que dá nome aos itens: a primeira de texto, ou a primeira de todas. */
    public static function campoDeTitulo(array $camposEmOrdem): ?string
    {
        foreach ($camposEmOrdem as $campo) {
            if ($campo['tipo'] === 'texto') {
                return $campo['id'];
            }
        }

        return $camposEmOrdem[0]['id'] ?? null;
    }

    public function criarRegistro(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $usuarioId, array $dados): array
    {
        $campos = $this->confirmarModuloDaEmpresa($moduloId, $empresaId, true);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $dadosValidados = $this->validarDadosDoRegistro($campos, $dados, $moduloId);

        $registroId = $this->registroModel->insert([
            'modulo_id'  => $moduloId,
            'dados'      => $dadosValidados,
            'criado_por' => $usuarioId,
        ]);

        Events::trigger('registro_criado', [
            'modulo_id'      => $moduloId,
            'registro_id'    => $registroId,
            'dados_registro' => $dadosValidados,
        ]);

        return $this->buscarRegistro($registroId, $moduloId, $empresaId);
    }

    public function atualizarRegistro(string $registroId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $usuarioId, array $dados): array
    {
        $anterior = $this->buscarRegistro($registroId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $campos         = $this->confirmarModuloDaEmpresa($moduloId, $empresaId, true);
        $dadosValidados = $this->validarDadosDoRegistro($campos, $dados, $moduloId);

        $this->registroModel->update($registroId, [
            'dados'          => $dadosValidados,
            'atualizado_por' => $usuarioId,
        ]);

        Events::trigger('registro_atualizado', [
            'modulo_id'        => $moduloId,
            'registro_id'      => $registroId,
            'dados_registro'   => $dadosValidados,
            'dados_anteriores' => $anterior['dados'] ?? [],
        ]);

        // Item que se repete e acabou de ser concluído: nasce a próxima ocorrência.
        (new RecorrenciaService())->depoisDeSalvar($registroId, $moduloId, $campos, $anterior['dados'] ?? [], $dadosValidados, $usuarioId);

        return $this->buscarRegistro($registroId, $moduloId, $empresaId);
    }

    /** Máximo de itens por importação (uma planilha maior vai em partes). */
    public const MAX_IMPORTACAO = 1000;

    /**
     * Importa itens de uma planilha. Cada linha passa pela mesma validação de
     * um item criado à mão; as válidas entram numa transação só e as inválidas
     * voltam com o número da linha e o motivo.
     *
     * Não dispara automações: importar 500 clientes não deve mandar 500
     * e-mails. Fica uma linha no histórico de atividades.
     *
     * @param array<int, array{linha?: int, dados: array}> $itens
     *
     * @return array{criados: int, erros: array<int, array{linha: int, mensagem: string}>}
     */
    public function importar(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $usuarioId, array $itens): array
    {
        $campos = $this->confirmarModuloDaEmpresa($moduloId, $empresaId, true);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        if ($itens === []) {
            throw new \DomainException('A planilha não tem nenhuma linha para importar.');
        }
        if (count($itens) > self::MAX_IMPORTACAO) {
            throw new \DomainException('Importe no máximo ' . self::MAX_IMPORTACAO . ' linhas por vez.');
        }

        $this->preconferirLigacoes($campos, $itens);

        helper('uuid');
        $agora   = gmdate('Y-m-d H:i:s');
        $validos = [];
        $erros   = [];
        foreach (array_values($itens) as $i => $item) {
            $linha = (int) ($item['linha'] ?? $i + 2); // linha 1 é o cabeçalho
            try {
                $dados = $this->validarDadosDoRegistro($campos, ['dados' => (array) ($item['dados'] ?? [])], $moduloId);
                if ($dados === []) {
                    throw new \DomainException('Linha vazia.');
                }
                $validos[] = [
                    'id'            => generate_uuid_v7(),
                    'modulo_id'     => $moduloId,
                    'dados'         => json_encode($dados, JSON_UNESCAPED_UNICODE),
                    'criado_por'    => $usuarioId,
                    'criado_em'     => $agora,
                    'atualizado_em' => $agora,
                ];
            } catch (\DomainException $e) {
                $erros[] = ['linha' => $linha, 'mensagem' => $e->getMessage()];
            }
        }

        if ($validos !== []) {
            $db = db_connect();
            $db->transStart();
            foreach (array_chunk($validos, 200) as $lote) {
                $db->table('registro')->insertBatch($lote);
            }
            $db->transComplete();
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Não foi possível importar agora. Nada foi gravado; tente de novo.');
            }

            AtividadeService::registrar('itens_importados', 'Importou ' . count($validos) . (count($validos) === 1 ? ' item' : ' itens') . ' de uma planilha', $moduloId);
        }

        return ['criados' => count($validos), 'erros' => $erros];
    }

    public function excluirRegistro(string $registroId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $registro = $this->buscarRegistro($registroId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $db = db_connect();
        $db->transStart();
        $this->registroModel->delete($registroId);
        $this->desvincular($registroId, $moduloId);
        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível excluir o item. Tente novamente.');
        }

        Events::trigger('registro_excluido', [
            'modulo_id'      => $moduloId,
            'registro_id'    => $registroId,
            'dados_registro' => $registro['dados'],
        ]);
    }

    /**
     * O item excluído sai das colunas de ligação que apontavam para ele, como
     * um ON DELETE SET NULL: quem ligava a vários perde só esse; quem ligava
     * só a ele fica vazio.
     */
    private function desvincular(string $registroId, string $moduloId): void
    {
        $campos = $this->campoModuloModel->select('id, modulo_id')->where('modulo_vinculado_id', $moduloId)->findAll();
        $db     = db_connect();

        foreach ($campos as $campo) {
            $db->query(
                "UPDATE registro SET dados = CASE
                    WHEN jsonb_typeof(dados->:campo:) = 'array' AND jsonb_array_length((dados->:campo:) - :item:::text) > 0
                        THEN jsonb_set(dados, ARRAY[:campo:]::text[], (dados->:campo:) - :item:::text)
                    ELSE dados - :campo:::text
                 END
                 WHERE modulo_id = :modulo:
                   AND (dados @> jsonb_build_object(:campo:::text, :item:::text)
                     OR dados @> jsonb_build_object(:campo:::text, jsonb_build_array(:item:::text)))",
                ['campo' => $campo['id'], 'item' => $registroId, 'modulo' => $campo['modulo_id']]
            );
        }
    }

    /**
     * Ação "atualizar campo" de uma automação. Sem checagem de permissão (quem
     * configurou a automação já tinha), mas com a mesma validação de tipos.
     * Não grava nem dispara nada se o valor já for o mesmo: isso, somado à
     * `cadeia`, impede que automações fiquem se redisparando.
     *
     * @param array<string, mixed> $alteracoes campo_id => valor
     * @param string[]             $cadeia     automações que levaram a esta alteração
     *
     * @return bool se algo mudou
     */
    public function atualizarPorAutomacao(string $registroId, string $moduloId, array $alteracoes, array $cadeia): bool
    {
        $registro = $this->registroModel->where('id', $registroId)->where('modulo_id', $moduloId)->first();
        if (! $registro) {
            throw new NaoEncontradoException('O item não existe mais.');
        }

        $anteriores = $registro['dados'] ?? [];
        $campos     = $this->campoModuloModel->where('modulo_id', $moduloId)->findAll();
        $novos      = $this->validarDadosDoRegistro($campos, ['dados' => $alteracoes + $anteriores], $moduloId);

        // Campo esvaziado pela automação: validar descarta vazios, então remove aqui.
        foreach ($alteracoes as $campoId => $valor) {
            if ($valor === null || $valor === '') {
                unset($novos[$campoId]);
            }
        }

        if ($novos == $anteriores) {
            return false;
        }

        $this->registroModel->update($registroId, ['dados' => $novos]);

        Events::trigger('registro_atualizado', [
            'modulo_id'        => $moduloId,
            'registro_id'      => $registroId,
            'dados_registro'   => $novos,
            'dados_anteriores' => $anteriores,
            'cadeia'           => $cadeia,
        ]);

        (new RecorrenciaService())->depoisDeSalvar($registroId, $moduloId, $campos, $anteriores, $novos, null);

        return true;
    }

    /**
     * Ação "criar registro" de uma automação, em qualquer módulo de dados da
     * mesma empresa.
     *
     * @return string id do registro criado
     */
    public function criarPorAutomacao(string $moduloId, array $dados, array $cadeia): string
    {
        $campos         = $this->campoModuloModel->where('modulo_id', $moduloId)->findAll();
        $dadosValidados = $this->validarDadosDoRegistro($campos, ['dados' => $dados], $moduloId);

        if ($dadosValidados === []) {
            throw new \DomainException('Nenhuma coluna preenchida para o novo item.');
        }

        $registroId = $this->registroModel->insert([
            'modulo_id' => $moduloId,
            'dados'     => $dadosValidados,
        ]);

        Events::trigger('registro_criado', [
            'modulo_id'      => $moduloId,
            'registro_id'    => $registroId,
            'dados_registro' => $dadosValidados,
            'cadeia'         => $cadeia,
        ]);

        return $registroId;
    }

    /**
     * @throws NaoEncontradoException se o registro não existir, ou não
     *         pertencer ao módulo/empresa informados
     */
    public function buscarRegistro(string $registroId, string $moduloId, string $empresaId): array
    {
        $registro = $this->registroModel
            ->select('registro.*')
            ->join('modulo', 'modulo.id = registro.modulo_id')
            ->where('registro.id', $registroId)
            ->where('registro.modulo_id', $moduloId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $registro) {
            throw new NaoEncontradoException('Item não encontrado.');
        }

        return $registro;
    }

    private function moduloDaEmpresa(string $moduloId, string $empresaId): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Tabela não encontrada.');
        }

        return $modulo;
    }

    private function confirmarModuloDaEmpresa(string $moduloId, string $empresaId, bool $comCampos = false): ?array
    {
        $this->moduloDaEmpresa($moduloId, $empresaId);

        if (! $comCampos) {
            return null;
        }

        return $this->campoModuloModel->where('modulo_id', $moduloId)->findAll();
    }

    private function validarDadosDoRegistro(array $campos, array $dadosRecebidos, string $moduloId): array
    {
        $dadosRecebidos = $dadosRecebidos['dados'] ?? [];
        $dadosValidados = [];

        foreach ($campos as $campo) {
            $valor = $dadosRecebidos[$campo['id']] ?? null;

            if ($valor === null || $valor === '') {
                continue;
            }

            switch ($campo['tipo']) {
                case 'texto':
                    $dadosValidados[$campo['id']] = (string) $valor;
                    break;

                case 'numero':
                    if (! is_numeric($valor)) {
                        throw new \DomainException("A coluna '{$campo['nome']}' precisa ser um número.");
                    }
                    $dadosValidados[$campo['id']] = $valor + 0;
                    break;

                case 'data':
                case 'prazo':
                    $data = \DateTime::createFromFormat('Y-m-d', $valor);
                    if (! $data || $data->format('Y-m-d') !== $valor) {
                        throw new \DomainException("A coluna '{$campo['nome']}' precisa ser uma data válida (AAAA-MM-DD).");
                    }
                    $dadosValidados[$campo['id']] = $valor;
                    break;

                case 'selecao':
                    if (! in_array($valor, $campo['opcoes'] ?? [], true)) {
                        throw new \DomainException("A coluna '{$campo['nome']}' precisa ser uma das opções válidas.");
                    }
                    $dadosValidados[$campo['id']] = $valor;
                    break;

                case 'recorrencia':
                    if (! isset(RecorrenciaService::PERIODOS[$valor])) {
                        throw new \DomainException("A coluna '{$campo['nome']}' precisa ser uma das repetições: semanal, quinzenal, mensal, trimestral ou anual.");
                    }
                    $dadosValidados[$campo['id']] = (string) $valor;
                    break;

                case 'responsavel':
                    if (! $this->pessoaDaEmpresaDoModulo((string) $valor, $moduloId)) {
                        throw new \DomainException("A coluna '{$campo['nome']}' precisa ser uma pessoa da equipe.");
                    }
                    $dadosValidados[$campo['id']] = (string) $valor;
                    break;

                case 'vinculo':
                    $ligados = $this->validarVinculo($campo, $valor);
                    if ($ligados !== null) {
                        $dadosValidados[$campo['id']] = $ligados;
                    }
                    break;
            }
        }

        return $dadosValidados;
    }

    /**
     * Coluna de ligação: ids de itens que existem na tabela ligada. Guarda um id
     * ou, se a coluna aceita vários, uma lista sem repetidos.
     *
     * @return list<string>|string|null null = nada ligado
     */
    private function validarVinculo(array $campo, mixed $valor): array|string|null
    {
        $ids = array_values(array_unique(array_filter(
            array_map(static fn ($id) => is_scalar($id) ? strtolower(trim((string) $id)) : '', is_array($valor) ? $valor : [$valor]),
            static fn (string $id) => $id !== ''
        )));

        if ($ids === []) {
            return null;
        }

        $multiplo = ! empty($campo['opcoes']['multiplo']);
        if (! $multiplo && count($ids) > 1) {
            throw new \DomainException("A coluna '{$campo['nome']}' liga um item só.");
        }
        if (count($ids) > self::MAX_LIGADOS) {
            throw new \DomainException("A coluna '{$campo['nome']}' liga no máximo " . self::MAX_LIGADOS . ' itens.');
        }
        foreach ($ids as $id) {
            if (! Filtros::uuidValido($id)) {
                throw new \DomainException("A coluna '{$campo['nome']}' precisa apontar para itens da tabela ligada.");
            }
        }
        if ($this->algumInexistente((string) ($campo['modulo_vinculado_id'] ?? ''), $ids)) {
            throw new \DomainException("A coluna '{$campo['nome']}' aponta para um item que não existe mais na tabela ligada.");
        }

        return $multiplo ? $ids : $ids[0];
    }

    /** Máximo de itens numa coluna de ligação que aceita vários. */
    public const MAX_LIGADOS = 100;

    /** @var array<string, bool> itens ligados já conferidos nesta requisição ("tabela|id" => existe) */
    private array $itensConferidos = [];

    /** @param list<string> $ids uuids válidos */
    private function algumInexistente(string $moduloId, array $ids): bool
    {
        $novos = array_values(array_filter($ids, fn (string $id) => ! isset($this->itensConferidos["{$moduloId}|{$id}"])));

        if ($novos !== []) {
            $achados = $moduloId === '' ? [] : array_column(
                db_connect()->query('SELECT id FROM registro WHERE modulo_id = ? AND id IN ?', [$moduloId, $novos])->getResultArray(),
                'id'
            );
            foreach ($novos as $id) {
                $this->itensConferidos["{$moduloId}|{$id}"] = in_array($id, $achados, true);
            }
        }

        foreach ($ids as $id) {
            if (! $this->itensConferidos["{$moduloId}|{$id}"]) {
                return true;
            }
        }

        return false;
    }

    /** Importação: confere de uma vez os itens ligados de todas as linhas (uma consulta por coluna). */
    private function preconferirLigacoes(array $campos, array $itens): void
    {
        foreach ($campos as $campo) {
            if ($campo['tipo'] !== 'vinculo' || empty($campo['modulo_vinculado_id'])) {
                continue;
            }

            $ids = [];
            foreach ($itens as $item) {
                $valor = is_array($item['dados'] ?? null) ? ($item['dados'][$campo['id']] ?? null) : null;
                foreach (is_array($valor) ? $valor : [$valor] as $id) {
                    if (is_string($id) && Filtros::uuidValido($id)) {
                        $ids[strtolower($id)] = true;
                    }
                }
            }

            foreach (array_chunk(array_keys($ids), 500) as $lote) {
                $this->algumInexistente($campo['modulo_vinculado_id'], $lote);
            }
        }
    }

    /** O responsável precisa ser alguém da mesma empresa da tabela. */
    private function pessoaDaEmpresaDoModulo(string $usuarioId, string $moduloId): bool
    {
        if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $usuarioId)) {
            return false;
        }

        return $this->pessoasConferidas["{$usuarioId}|{$moduloId}"] ??= (bool) db_connect()->query(
            'SELECT 1 FROM usuario u JOIN modulo m ON m.empresa_id = u.empresa_id WHERE u.id = ? AND m.id = ?',
            [$usuarioId, $moduloId]
        )->getRow();
    }
}