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

        $dadosValidados = $this->validarDadosDoRegistro($campos, $dados);

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
        $this->buscarRegistro($registroId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $campos         = $this->confirmarModuloDaEmpresa($moduloId, $empresaId, true);
        $dadosValidados = $this->validarDadosDoRegistro($campos, $dados);

        $this->registroModel->update($registroId, [
            'dados'          => $dadosValidados,
            'atualizado_por' => $usuarioId,
        ]);

        Events::trigger('registro_atualizado', [
            'modulo_id'      => $moduloId,
            'registro_id'    => $registroId,
            'dados_registro' => $dadosValidados,
        ]);

        return $this->buscarRegistro($registroId, $moduloId, $empresaId);
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