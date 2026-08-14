<?php

namespace App\Controllers;

use App\Exceptions\NaoEncontradoException;
use App\Services\CandidatoService;

class CandidatoController extends BaseApiController
{
    protected CandidatoService $candidatoService;

    public function __construct()
    {
        $this->candidatoService = new CandidatoService();
    }

    public function candidatar($empresaId)
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
            $candidato = $this->candidatoService->criarCandidatura($empresaId, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        }

        return $this->respondSuccess($candidato, 201);
    }

    public function kanban()
    {
        $kanban = $this->candidatoService->listarKanban(service('authenticatedUser')->empresaId);

        return $this->respondSuccess($kanban, 200);
    }

    public function detalhes($candidatoId)
    {
        try {
            $candidato = $this->candidatoService->buscarCandidato($candidatoId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function moverFase($candidatoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->moverFase($candidatoId, $user->empresaId, $dados['fase'] ?? '', $user->id);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function excluir($candidatoId)
    {
        try {
            $this->candidatoService->excluirCandidato($candidatoId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null, 200);
    }
}