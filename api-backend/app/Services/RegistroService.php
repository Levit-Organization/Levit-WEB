<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CampoModuloModel;
use App\Models\ModuloModel;
use App\Models\RegistroModel;
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

    public function listarRegistros(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, ?string $busca = null): array
    {
        $this->confirmarModuloDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        if ($busca === null || trim($busca) === '') {
            return $this->registroModel
                ->where('modulo_id', $moduloId)
                ->orderBy('criado_em', 'DESC')
                ->findAll();
        }

        $camposTexto = $this->campoModuloModel
            ->where('modulo_id', $moduloId)
            ->where('tipo', 'texto')
            ->findAll();

        if (empty($camposTexto)) {
            return [];
        }

        $condicoes = [];
        $bindings  = [$moduloId];

        foreach ($camposTexto as $campo) {
            $condicoes[] = "dados->>'{$campo['id']}' ILIKE ?";
            $bindings[]  = '%' . $busca . '%';
        }

        $sql = 'SELECT * FROM registro WHERE modulo_id = ? AND (' . implode(' OR ', $condicoes) . ') ORDER BY criado_em DESC';

        $registros = db_connect()->query($sql, $bindings)->getResultArray();

        foreach ($registros as &$registro) {
            $registro['dados'] = json_decode($registro['dados'], true);
        }

        return $registros;
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

        $this->registroModel->delete($registroId);

        Events::trigger('registro_excluido', [
            'modulo_id'      => $moduloId,
            'registro_id'    => $registroId,
            'dados_registro' => $registro['dados'],
        ]);
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

    private function confirmarModuloDaEmpresa(string $moduloId, string $empresaId, bool $comCampos = false): ?array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Tabela não encontrada.');
        }

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
            }
        }

        return $dadosValidados;
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