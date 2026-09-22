<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CategoriaFinanceiraModel;
use App\Models\LancamentoFinanceiroModel;
use App\Models\ModuloModel;

class FinanceiroService
{
    private const TIPOS_LANCAMENTO_VALIDOS = ['entrada', 'saida'];

    protected ModuloModel $moduloModel;
    protected CategoriaFinanceiraModel $categoriaModel;
    protected LancamentoFinanceiroModel $lancamentoModel;
    protected RegistroService $registroService;
    protected AutorizacaoModuloService $autorizacaoModuloService;

    public function __construct()
    {
        $this->moduloModel              = new ModuloModel();
        $this->categoriaModel           = new CategoriaFinanceiraModel();
        $this->lancamentoModel          = new LancamentoFinanceiroModel();
        $this->registroService          = new RegistroService();
        $this->autorizacaoModuloService = new AutorizacaoModuloService();
    }

    // ==========================================================
    // Categorias — escopo: empresa (compartilhadas entre todos os
    // módulos financeiros da mesma empresa, não por módulo individual)
    // ==========================================================

    public function listarCategorias(string $empresaId): array
    {
        return $this->categoriaModel
            ->where('empresa_id', $empresaId)
            ->orderBy('nome', 'ASC')
            ->findAll();
    }

    /**
     * @throws \DomainException se já existir categoria com esse nome na empresa
     */
    public function criarCategoria(string $empresaId, string $nome): array
    {
        $nome = trim($nome);

        if ($nome === '') {
            throw new \DomainException('O nome da categoria não pode ficar vazio.');
        }

        $existente = $this->categoriaModel
            ->where('empresa_id', $empresaId)
            ->where('nome', $nome)
            ->first();

        if ($existente) {
            throw new \DomainException('Já existe uma categoria com esse nome nesta empresa.');
        }

        $categoriaId = $this->categoriaModel->insert([
            'empresa_id' => $empresaId,
            'nome'       => $nome,
        ]);

        return $this->categoriaModel->find($categoriaId);
    }

    /**
     * Não bloqueia a exclusão se houver lançamentos usando a categoria:
     * a FK é ON DELETE SET NULL, então os lançamentos continuam válidos,
     * só perdem o rótulo de categoria. Diferente da exclusão de cargo
     * (onde perder o vínculo quebraria acesso de alguém), aqui é uma
     * perda de rótulo, reversível e de baixo risco — não precisa da
     * mesma checagem proativa.
     *
     * @throws NaoEncontradoException se a categoria não existir/pertencer à empresa
     */
    public function excluirCategoria(string $empresaId, string $categoriaId): void
    {
        $categoria = $this->categoriaModel
            ->where('id', $categoriaId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $categoria) {
            throw new NaoEncontradoException('Categoria não encontrada.');
        }

        $this->categoriaModel->delete($categoriaId);
    }

    // ==========================================================
    // Lançamentos — escopo: um módulo específico do tipo 'financeiro'
    // ==========================================================

    /**
     * Retorna os lançamentos ordenados por data, com o saldo acumulado
     * calculado linha a linha (respeitando o filtro de categoria, se
     * houver) e um resumo de totais do conjunto filtrado.
     *
     * @throws NaoEncontradoException se o módulo não existir/pertencer à
     *         empresa, ou não for do tipo 'financeiro'
     */
    public function listarLancamentos(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, ?string $categoriaId = null): array
    {
        $this->confirmarModuloFinanceiro($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $query = $this->lancamentoModel
            ->select('lancamento_financeiro.*, categoria_financeira.nome as categoria_nome')
            ->join('categoria_financeira', 'categoria_financeira.id = lancamento_financeiro.categoria_id', 'left')
            ->where('lancamento_financeiro.modulo_id', $moduloId);

        if ($categoriaId !== null) {
            $query->where('lancamento_financeiro.categoria_id', $categoriaId);
        }

        $lancamentos = $query
            ->orderBy('lancamento_financeiro.data_lancamento', 'ASC')
            ->orderBy('lancamento_financeiro.criado_em', 'ASC')
            ->findAll();

        $saldoAcumulado = 0.0;
        $totalEntradas  = 0.0;
        $totalSaidas    = 0.0;

        foreach ($lancamentos as &$lancamento) {
            $valor = (float) $lancamento['valor'];

            if ($lancamento['tipo'] === 'entrada') {
                $saldoAcumulado += $valor;
                $totalEntradas  += $valor;
            } else {
                $saldoAcumulado -= $valor;
                $totalSaidas    += $valor;
            }

            $lancamento['saldo_acumulado'] = round($saldoAcumulado, 2);
        }
        unset($lancamento);

        return [
            'lancamentos' => $lancamentos,
            'resumo'      => [
                'total_entradas' => round($totalEntradas, 2),
                'total_saidas'   => round($totalSaidas, 2),
                'saldo_periodo'  => round($totalEntradas - $totalSaidas, 2),
            ],
        ];
    }

    /**
     * Campos extras (definidos pela empresa via /modulos/{id}/campos, o
     * mesmo mecanismo do módulo "dados") são passados em
     * $dados['campos_extras'] e viram um registro vinculado — reaproveita
     * 100% a validação e o armazenamento que o RegistroService já tem.
     *
     * @throws NaoEncontradoException se o módulo não existir/pertencer à
     *         empresa, ou não for do tipo 'financeiro'
     * @throws \DomainException se os campos fixos do lançamento forem inválidos
     */
    public function criarLancamento(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $usuarioId, array $dados): array
    {
        $this->confirmarModuloFinanceiro($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $camposValidados = $this->validarCamposLancamento($empresaId, $dados, false);

        $db = db_connect();
        $db->transStart();

        $registro = $this->registroService->criarRegistro(
            $moduloId,
            $empresaId,
            $cargoId,
            $acessoTotal,
            $usuarioId,
            ['dados' => $dados['campos_extras'] ?? []]
        );

        $lancamentoId = $this->lancamentoModel->insert(array_merge($camposValidados, [
            'modulo_id'   => $moduloId,
            'registro_id' => $registro['id'],
        ]));

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar o lançamento. Tente novamente.');
        }

        return $this->buscarLancamentoCompleto($lancamentoId, $moduloId, $empresaId);
    }

    /**
     * Atualização parcial: só os campos presentes em $dados são alterados
     * (mesma semântica do PUT /equipe/{id}).
     *
     * @throws NaoEncontradoException se módulo ou lançamento não existirem/
     *         pertencerem à empresa
     * @throws \DomainException se os campos fixos informados forem inválidos
     */
    public function atualizarLancamento(string $lancamentoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $usuarioId, array $dados): array
    {
        $this->confirmarModuloFinanceiro($moduloId, $empresaId);
        $lancamento = $this->buscarLancamento($lancamentoId, $moduloId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $camposValidados = $this->validarCamposLancamento($empresaId, $dados, true);

        $db = db_connect();
        $db->transStart();

        if (! empty($camposValidados)) {
            $this->lancamentoModel->update($lancamentoId, $camposValidados);
        }

        if (isset($dados['campos_extras'])) {
            $this->registroService->atualizarRegistro(
                $lancamento['registro_id'],
                $moduloId,
                $empresaId,
                $cargoId,
                $acessoTotal,
                $usuarioId,
                ['dados' => $dados['campos_extras']]
            );
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível atualizar o lançamento. Tente novamente.');
        }

        return $this->buscarLancamentoCompleto($lancamentoId, $moduloId, $empresaId);
    }

    /**
     * Exclui pelo registro vinculado (mesmo padrão do ArquivoService): a
     * FK registro_id → registro é CASCADE, então a linha de
     * lancamento_financeiro some junto, numa única operação atômica.
     *
     * @throws NaoEncontradoException se módulo ou lançamento não existirem/
     *         pertencerem à empresa
     */
    public function excluirLancamento(string $lancamentoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $this->confirmarModuloFinanceiro($moduloId, $empresaId);
        $lancamento = $this->buscarLancamento($lancamentoId, $moduloId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $this->registroService->excluirRegistro($lancamento['registro_id'], $moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    // ==========================================================
    // Helpers privados
    // ==========================================================

    /**
     * @throws NaoEncontradoException se o módulo não existir, não
     *         pertencer à empresa, ou não for do tipo 'financeiro'
     */
    private function confirmarModuloFinanceiro(string $moduloId, string $empresaId): void
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->where('tipo', 'financeiro')
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo financeiro não encontrado.');
        }
    }

    /**
     * @throws NaoEncontradoException se o lançamento não existir/pertencer ao módulo
     */
    private function buscarLancamento(string $lancamentoId, string $moduloId): array
    {
        $lancamento = $this->lancamentoModel
            ->where('id', $lancamentoId)
            ->where('modulo_id', $moduloId)
            ->first();

        if (! $lancamento) {
            throw new NaoEncontradoException('Lançamento não encontrado.');
        }

        return $lancamento;
    }

    private function buscarLancamentoCompleto(string $lancamentoId, string $moduloId, string $empresaId): array
    {
        $lancamento = $this->lancamentoModel
            ->select('lancamento_financeiro.*, categoria_financeira.nome as categoria_nome')
            ->join('categoria_financeira', 'categoria_financeira.id = lancamento_financeiro.categoria_id', 'left')
            ->where('lancamento_financeiro.id', $lancamentoId)
            ->first();

        $registro                    = $this->registroService->buscarRegistro($lancamento['registro_id'], $moduloId, $empresaId);
        $lancamento['campos_extras'] = $registro['dados'];

        return $lancamento;
    }

    /**
     * Valida e monta só os campos FIXOS do lançamento (data, tipo, valor
     * etc). Campos extras são tratados à parte, via RegistroService.
     *
     * @param bool $parcial quando true (update), campos ausentes em
     *        $dados são ignorados; quando false (create), os campos
     *        obrigatórios precisam estar presentes
     *
     * @throws \DomainException
     */
    private function validarCamposLancamento(string $empresaId, array $dados, bool $parcial): array
    {
        $campos = [];

        if (array_key_exists('descricao', $dados)) {
            $descricao = trim((string) $dados['descricao']);

            if ($descricao === '') {
                throw new \DomainException('A descrição não pode ficar vazia.');
            }

            $campos['descricao'] = $descricao;
        } elseif (! $parcial) {
            throw new \DomainException('A descrição é obrigatória.');
        }

        if (array_key_exists('data', $dados)) {
            $data = \DateTime::createFromFormat('Y-m-d', (string) ($dados['data'] ?? ''));

            if (! $data || $data->format('Y-m-d') !== $dados['data']) {
                throw new \DomainException('A data precisa estar no formato AAAA-MM-DD.');
            }

            $campos['data_lancamento'] = $dados['data'];
        } elseif (! $parcial) {
            throw new \DomainException('A data é obrigatória.');
        }

        if (array_key_exists('tipo', $dados)) {
            if (! in_array($dados['tipo'], self::TIPOS_LANCAMENTO_VALIDOS, true)) {
                throw new \DomainException("Tipo de lançamento inválido: '{$dados['tipo']}'. Use 'entrada' ou 'saida'.");
            }

            $campos['tipo'] = $dados['tipo'];
        } elseif (! $parcial) {
            throw new \DomainException('O tipo do lançamento é obrigatório.');
        }

        if (array_key_exists('valor', $dados)) {
            if (! is_numeric($dados['valor']) || $dados['valor'] <= 0) {
                throw new \DomainException('O valor precisa ser um número maior que zero.');
            }

            $campos['valor'] = $dados['valor'] + 0;
        } elseif (! $parcial) {
            throw new \DomainException('O valor é obrigatório.');
        }

        if (array_key_exists('conciliado', $dados)) {
            $campos['conciliado'] = (bool) $dados['conciliado'];
        }

        if (array_key_exists('categoria_id', $dados)) {
            if ($dados['categoria_id'] !== null) {
                $categoria = $this->categoriaModel
                    ->where('id', $dados['categoria_id'])
                    ->where('empresa_id', $empresaId)
                    ->first();

                if (! $categoria) {
                    throw new \DomainException('Categoria inválida ou não pertence à empresa.');
                }
            }

            $campos['categoria_id'] = $dados['categoria_id'];
        }

        return $campos;
    }
}