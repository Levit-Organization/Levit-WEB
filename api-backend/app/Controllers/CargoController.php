<?php

namespace App\Controllers;

use App\Services\CargoService;

class CargoController extends BaseApiController
{
    protected CargoService $cargoService;

    public function __construct()
    {
        $this->cargoService = new CargoService();
    }

    public function listar()
    {
        $cargos = $this->cargoService->listarCargos(service('authenticatedUser')->empresaId);

        return $this->respondSuccess($cargos, 200);
    }

    public function criar()
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'       => ['required', 'min_length[2]', 'max_length[50]'],
            'permissoes' => ['permit_empty'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $cargo = $this->cargoService->criarCargo(
                service('authenticatedUser')->empresaId,
                $dados['nome'],
                $dados['permissoes'] ?? []
            );
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($cargo, 201);
    }
}