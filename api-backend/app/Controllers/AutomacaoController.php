<?php

namespace App\Controllers;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Services\AutomacaoService;

class AutomacaoController extends BaseApiController
{
    protected AutomacaoService $automacaoService;

    public function __construct()
    {
        $this->automacaoService = new AutomacaoService();
    }

    public function criar($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'    => ['required', 'min_length[2]', 'max_length[100]'],
            'gatilho' => ['required'],
            'acoes'   => ['required'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        $user = service('authenticatedUser');

        try {
            $automacao = $this->automacaoService->criarAutomacao($moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $user->id, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($automacao, 201);
    }

    public function listar($moduloId)
    {
        $user = service('authenticatedUser');

        try {
            $automacoes = $this->automacaoService->listarAutomacoes($moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($automacoes, 200);
    }

    public function alternarAtivo($moduloId, $automacaoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $automacao = $this->automacaoService->alternarAtivo($automacaoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, (bool) ($dados['ativo'] ?? true));
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($automacao, 200);
    }

    public function excluir($moduloId, $automacaoId)
    {
        $user = service('authenticatedUser');

        try {
            $this->automacaoService->excluirAutomacao($automacaoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess(null, 200);
    }
}