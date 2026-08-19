<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CampoModuloModel;
use App\Models\ModuloModel;
use App\Models\RegistroModel;

class RegistroService
{
    protected ModuloModel $moduloModel;
    protected CampoModuloModel $campoModuloModel;
    protected RegistroModel $registroModel;

    public function __construct()
    {
        $this->moduloModel      = new ModuloModel();
        $this->campoModuloModel = new CampoModuloModel();
        $this->registroModel    = new RegistroModel();
    }

    public function listarRegistros(string $moduloId, string $empresaId, ?string $busca = null): array
    {
        $this->confirmarModuloDaEmpresa($moduloId, $empresaId);

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

    public function criarRegistro(string $moduloId, string $empresaId, string $usuarioId, array $dados): array
    {
        $campos         = $this->confirmarModuloDaEmpresa($moduloId, $empresaId, true);
        $dadosValidados = $this->validarDadosDoRegistro($campos, $dados);

        $registroId = $this->registroModel->insert([
            'modulo_id'  => $moduloId,
            'dados'      => $dadosValidados,
            'criado_por' => $usuarioId,
        ]);

        return $this->buscarRegistro($registroId, $moduloId, $empresaId);
    }

    public function atualizarRegistro(string $registroId, string $moduloId, string $empresaId, string $usuarioId, array $dados): array
    {
        $this->buscarRegistro($registroId, $moduloId, $empresaId);

        $campos         = $this->confirmarModuloDaEmpresa($moduloId, $empresaId, true);
        $dadosValidados = $this->validarDadosDoRegistro($campos, $dados);

        $this->registroModel->update($registroId, [
            'dados'          => $dadosValidados,
            'atualizado_por' => $usuarioId,
        ]);

        return $this->buscarRegistro($registroId, $moduloId, $empresaId);
    }

    public function excluirRegistro(string $registroId, string $moduloId, string $empresaId): void
    {
        $this->buscarRegistro($registroId, $moduloId, $empresaId);
        $this->registroModel->delete($registroId);
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
            throw new NaoEncontradoException('Registro não encontrado.');
        }

        return $registro;
    }

    /**
     * Confirma que o módulo existe e pertence à empresa. Opcionalmente,
     * já devolve a lista de campos dele (evita uma segunda consulta
     * em quem for validar dados logo em seguida).
     */
    private function confirmarModuloDaEmpresa(string $moduloId, string $empresaId, bool $comCampos = false): ?array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        if (! $comCampos) {
            return null;
        }

        return $this->campoModuloModel->where('modulo_id', $moduloId)->findAll();
    }

    /**
     * Valida os dados recebidos contra a definição real dos campos do
     * módulo — o tipo de cada campo dita a regra aplicada.
     *
     * @throws \DomainException se algum valor não bater com o tipo esperado
     */
    private function validarDadosDoRegistro(array $campos, array $dadosRecebidos): array
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
                        throw new \DomainException("O campo '{$campo['nome']}' precisa ser um número.");
                    }
                    $dadosValidados[$campo['id']] = $valor + 0;
                    break;

                case 'data':
                    $data = \DateTime::createFromFormat('Y-m-d', $valor);
                    if (! $data || $data->format('Y-m-d') !== $valor) {
                        throw new \DomainException("O campo '{$campo['nome']}' precisa ser uma data válida (AAAA-MM-DD).");
                    }
                    $dadosValidados[$campo['id']] = $valor;
                    break;

                case 'selecao':
                    if (! in_array($valor, $campo['opcoes'] ?? [], true)) {
                        throw new \DomainException("O campo '{$campo['nome']}' precisa ser uma das opções válidas.");
                    }
                    $dadosValidados[$campo['id']] = $valor;
                    break;
            }
        }

        return $dadosValidados;
    }
}