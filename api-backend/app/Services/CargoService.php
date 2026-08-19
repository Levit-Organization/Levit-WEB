<?php

namespace App\Services;

use App\Models\CargoModel;
use App\Models\CargoPermissaoModel;
use App\Models\PermissaoModel;

class CargoService
{
    protected CargoModel $cargoModel;
    protected PermissaoModel $permissaoModel;
    protected CargoPermissaoModel $cargoPermissaoModel;

    public function __construct()
    {
        $this->cargoModel          = new CargoModel();
        $this->permissaoModel      = new PermissaoModel();
        $this->cargoPermissaoModel = new CargoPermissaoModel();
    }

    /**
     * Lista os cargos da empresa, cada um já com suas permissões —
     * duas consultas ao todo, não importa quantos cargos existam.
     */
    public function listarCargos(string $empresaId): array
    {
        $cargos = $this->cargoModel->where('empresa_id', $empresaId)->findAll();

        if (empty($cargos)) {
            return [];
        }

        $todasPermissoes = $this->cargoPermissaoModel
            ->select('cargo_permissao.cargo_id, permissao.codigo')
            ->join('permissao', 'permissao.id = cargo_permissao.permissao_id')
            ->whereIn('cargo_permissao.cargo_id', array_column($cargos, 'id'))
            ->findAll();

        $permissoesPorCargo = [];
        foreach ($todasPermissoes as $linha) {
            $permissoesPorCargo[$linha['cargo_id']][] = $linha['codigo'];
        }

        foreach ($cargos as &$cargo) {
            $cargo['permissoes'] = $permissoesPorCargo[$cargo['id']] ?? [];
        }
        unset($cargo);

        return $cargos;
    }

    /**
     * @throws \DomainException se o nome já existir na empresa, ou algum
     *         código de permissão informado não existir no catálogo
     */
    public function criarCargo(string $empresaId, string $nome, array $codigosPermissoes): array
    {
        if ($this->cargoModel->where('empresa_id', $empresaId)->where('nome', $nome)->first()) {
            throw new \DomainException('Já existe um cargo com esse nome nesta empresa.');
        }

        $permissoesValidas = empty($codigosPermissoes)
            ? []
            : $this->permissaoModel->whereIn('codigo', $codigosPermissoes)->findAll();

        if (count($permissoesValidas) !== count(array_unique($codigosPermissoes))) {
            throw new \DomainException('Uma ou mais permissões informadas não existem.');
        }

        $db = db_connect();
        $db->transStart();

        $cargoId = $this->cargoModel->insert([
            'empresa_id' => $empresaId,
            'nome'       => $nome,
        ]);

        foreach ($permissoesValidas as $permissao) {
            $this->cargoPermissaoModel->insert([
                'cargo_id'     => $cargoId,
                'permissao_id' => $permissao['id'],
            ]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar o cargo. Tente novamente.');
        }

        $cargo = $this->cargoModel->find($cargoId);
        $cargo['permissoes'] = array_column($permissoesValidas, 'codigo');

        return $cargo;
    }
}