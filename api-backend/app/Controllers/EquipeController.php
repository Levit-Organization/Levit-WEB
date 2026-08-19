<?php

namespace App\Controllers;

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
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        $user = service('authenticatedUser');

        try {
            $resultado = $this->equipeService->convidar($user->empresaId, $user->id, $dados['email'], $dados['cargo_id']);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        }

        return $this->respondSuccess($resultado, 201);
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
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess(
            $this->authService->montarRespostaAutenticacao($resultado['usuario'], $resultado['empresa']),
            201
        );
    }

    public function listarMembros()
    {
        $membros = $this->equipeService->listarMembros(service('authenticatedUser')->empresaId);

        return $this->respondSuccess($membros, 200);
    }

    public function removerMembro($usuarioId)
    {
        try {
            $this->equipeService->removerMembro($usuarioId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        }

        return $this->respondSuccess(null, 200);
    }
}