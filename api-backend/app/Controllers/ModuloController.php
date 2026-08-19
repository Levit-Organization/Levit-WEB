<?php

namespace App\Controllers;

use App\Services\ModuloService;
use App\Exceptions\NaoEncontradoException;

class ModuloController extends BaseApiController
{
    protected ModuloService $moduloService;

    public function __construct()
    {
        $this->moduloService = new ModuloService();
    }

    public function criar()
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'   => ['required', 'min_length[2]', 'max_length[100]'],
            'icone'  => ['permit_empty', 'max_length[50]'],
            'tipo'   => ['permit_empty', 'in_list[dados,arquivo,recrutamento]'],
            'campos' => ['permit_empty'],
            'fases'  => ['permit_empty'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        $user = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->criarModulo($user->empresaId, $user->id, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($modulo, 201);
    }

    public function atualizar($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'  => ['permit_empty', 'min_length[2]', 'max_length[100]'],
            'icone' => ['permit_empty', 'max_length[50]'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        $user = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->atualizarModulo($moduloId, $user->empresaId, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess($modulo, 200);
    }

    public function adicionarCampo($moduloId)
    {
        $campo = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->adicionarCampo($moduloId, $user->empresaId, $campo);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($modulo, 201);
    }

    public function atualizarCampo($moduloId, $campoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->atualizarCampo($campoId, $moduloId, $user->empresaId, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess($modulo, 200);
    }

    public function reordenarCampos($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->reordenarCampos($moduloId, $user->empresaId, $dados['ordem'] ?? []);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($modulo, 200);
    }

    public function excluirCampo($moduloId, $campoId)
    {
        $user = service('authenticatedUser');

        try {
            $this->moduloService->excluirCampo($campoId, $moduloId, $user->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        }

        return $this->respondSuccess(null, 200);
    }

    public function detalhes($moduloId)
    {
        try {
            $modulo = $this->moduloService->buscarModuloComCampos($moduloId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess($modulo, 200);
    }

    public function listar()
    {
        $modulos = $this->moduloService->listarModulos(service('authenticatedUser')->empresaId);

        return $this->respondSuccess($modulos, 200);
    }

    public function excluir($moduloId)
    {
        try {
            $this->moduloService->excluirModulo($moduloId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null, 200);
    }

        public function adicionarFase($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->adicionarFase($moduloId, $user->empresaId, $dados['nome'] ?? '');
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($modulo, 201);
    }

    public function atualizarFase($moduloId, $faseId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->atualizarFase($faseId, $moduloId, $user->empresaId, $dados['nome'] ?? '');
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($modulo, 200);
    }

    public function reordenarFases($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $modulo = $this->moduloService->reordenarFases($moduloId, $user->empresaId, $dados['ordem'] ?? []);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($modulo, 200);
    }

    public function excluirFase($moduloId, $faseId)
    {
        $user = service('authenticatedUser');

        try {
            $this->moduloService->excluirFase($faseId, $moduloId, $user->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        }

        return $this->respondSuccess(null, 200);
    }
}