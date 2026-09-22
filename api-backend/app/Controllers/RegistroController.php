<?php

namespace App\Controllers;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Services\RegistroService;

class RegistroController extends BaseApiController
{
    protected RegistroService $registroService;

    public function __construct()
    {
        $this->registroService = new RegistroService();
    }

    public function listar($moduloId)
    {
        $user  = service('authenticatedUser');
        $busca = $this->request->getGet('busca');

        try {
            $registros = $this->registroService->listarRegistros($moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $busca);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($registros, 200);
    }

    public function criar($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $registro = $this->registroService->criarRegistro($moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $user->id, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($registro, 201);
    }

    public function atualizar($moduloId, $registroId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $registro = $this->registroService->atualizarRegistro($registroId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $user->id, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($registro, 200);
    }

    public function excluir($moduloId, $registroId)
    {
        $user = service('authenticatedUser');

        try {
            $this->registroService->excluirRegistro($registroId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess(null, 200);
    }
}