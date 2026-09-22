<?php

namespace App\Controllers;

use App\Exceptions\NaoEncontradoException;
use App\Services\AutorizacaoModuloService;

class CargoModuloPermissaoController extends BaseApiController
{
    protected AutorizacaoModuloService $autorizacaoModuloService;

    public function __construct()
    {
        $this->autorizacaoModuloService = new AutorizacaoModuloService();
    }

    public function listar($cargoId)
    {
        try {
            $niveis = $this->autorizacaoModuloService->listarNiveisDoCargo(service('authenticatedUser')->empresaId, $cargoId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess($niveis, 200);
    }

    public function definir($cargoId, $moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = ['nivel' => ['required', 'in_list[visualizar,editar,gerenciar]']];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $niveis = $this->autorizacaoModuloService->definirNivel(service('authenticatedUser')->empresaId, $cargoId, $moduloId, $dados['nivel']);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($niveis, 200);
    }

    public function remover($cargoId, $moduloId)
    {
        try {
            $this->autorizacaoModuloService->removerNivel(service('authenticatedUser')->empresaId, $cargoId, $moduloId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null, 200);
    }
}