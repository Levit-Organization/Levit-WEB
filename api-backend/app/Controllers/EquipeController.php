<?php

namespace App\Controllers;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Services\AuthService;
use App\Services\EquipeService;

class EquipeController extends BaseApiController
{
    protected EquipeService $equipeService;
    protected AuthService $authService;

    public function __construct()
    {
        $this->equipeService = new EquipeService();
        $this->authService   = new AuthService();
    }

    public function convidar()
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'email'    => ['required', 'valid_email'],
            'cargo_id' => ['required'],
            'mensagem' => ['permit_empty', 'max_length[500]'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        $user = service('authenticatedUser');

        try {
            $resultado = $this->equipeService->convidar($user->empresaId, $user->id, $dados['email'], $dados['cargo_id'], $dados['mensagem'] ?? null);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        } catch (\RuntimeException $e) {
            return $this->respondFalha($e, 502);
        }

        return $this->respondSuccess($resultado, 201);
    }

    public function listarConvites()
    {
        return $this->respondSuccess($this->equipeService->listarConvitesPendentes(service('authenticatedUser')->empresaId));
    }

    public function reenviarConvite($conviteId)
    {
        $user = service('authenticatedUser');

        try {
            $convite = $this->equipeService->reenviarConvite($user->empresaId, $conviteId, $user->id);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\RuntimeException $e) {
            return $this->respondFalha($e, 502);
        }

        return $this->respondSuccess($convite);
    }

    public function cancelarConvite($conviteId)
    {
        try {
            $this->equipeService->cancelarConvite(service('authenticatedUser')->empresaId, $conviteId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null);
    }

    /** Público: o que a página do convite mostra antes de aceitar. */
    public function detalhesDoConvite($token)
    {
        try {
            return $this->respondSuccess($this->equipeService->detalhesDoConvite($token));
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }
    }

    public function aceitarConvite()
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'token' => ['required'],
            'nome'  => ['required', 'min_length[3]', 'max_length[150]'],
            'senha' => ['required', 'min_length[8]', 'regex_match[/^(?=.*[A-Za-z])(?=.*\d).+$/]'],
        ];

        $messages = [
            'senha' => ['regex_match' => 'A senha deve conter letras e números.'],
        ];

        if (! $this->validateData($dados, $rules, $messages)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $resultado = $this->equipeService->aceitarConvite($dados['token'], $dados['nome'], $dados['senha']);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondFalha($e, 500);
        }

        return $this->respondSuccess(
            $this->authService->montarRespostaAutenticacao($resultado['usuario'], $resultado['empresa']),
            201
        );
    }

    public function listarPessoas()
    {
        return $this->respondSuccess($this->equipeService->listarPessoas(service('authenticatedUser')->empresaId));
    }

    public function listarMembros()
    {
        $membros = $this->equipeService->listarMembros(service('authenticatedUser')->empresaId);

        return $this->respondSuccess($membros, 200);
    }

    public function atualizarMembro($usuarioId)
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'     => ['permit_empty', 'min_length[3]', 'max_length[150]'],
            'cargo_id' => ['permit_empty'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $membro = $this->equipeService->atualizarMembro(service('authenticatedUser')->empresaId, $usuarioId, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($membro, 200);
    }

    public function removerMembro($usuarioId)
    {
        try {
            $this->equipeService->removerMembro($usuarioId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        }

        return $this->respondSuccess(null, 200);
    }
}