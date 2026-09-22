<?php

namespace App\Controllers;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Services\CandidatoService;

class CandidatoController extends BaseApiController
{
    protected CandidatoService $candidatoService;

    public function __construct()
    {
        $this->candidatoService = new CandidatoService();
    }

    public function candidatar($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'           => ['required', 'min_length[3]', 'max_length[150]'],
            'email'          => ['required', 'valid_email', 'max_length[150]'],
            'telefone'       => ['permit_empty', 'max_length[20]'],
            'cargo_desejado' => ['permit_empty', 'max_length[100]'],
            'mensagem'       => ['permit_empty'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $candidato = $this->candidatoService->criarCandidatura($moduloId, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($candidato, 201);
    }

    public function kanban($moduloId)
    {
        $user = service('authenticatedUser');

        try {
            $kanban = $this->candidatoService->listarKanban($moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($kanban, 200);
    }

    public function kanbanGlobal()
    {
        $user   = service('authenticatedUser');
        $kanban = $this->candidatoService->listarKanbanGlobal($user->empresaId, $user->cargoId, $user->acessoTotal);

        return $this->respondSuccess($kanban, 200);
    }

    public function detalhes($moduloId, $candidatoId)
    {
        $user = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->buscarCandidatoComPermissao($candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function moverFase($moduloId, $candidatoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->moverFase(
                $candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $dados['fase_id'] ?? '', $user->id
            );
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function moverFaseGlobal($candidatoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->moverFaseGlobalPorNome(
                $candidatoId, $user->empresaId, $user->cargoId, $user->acessoTotal, $dados['fase'] ?? '', $user->id
            );
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function excluir($moduloId, $candidatoId)
    {
        $user = service('authenticatedUser');

        try {
            $this->candidatoService->excluirCandidato($candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess(null, 200);
    }
}