<?php

namespace App\Controllers;

use App\Exceptions\NaoEncontradoException;
use App\Services\NotificacaoService;

/**
 * Notificações do usuário logado. Cada usuário só enxerga e altera as suas.
 */
class NotificacaoController extends BaseApiController
{
    protected NotificacaoService $notificacaoService;

    public function __construct()
    {
        $this->notificacaoService = new NotificacaoService();
    }

    public function listar()
    {
        $user = service('authenticatedUser');

        return $this->respondSuccess($this->notificacaoService->listar(
            $user->id,
            $this->request->getGet('antes_de') ?: null,
            (int) ($this->request->getGet('limite') ?: 20),
            (bool) $this->request->getGet('nao_lidas')
        ));
    }

    /** Endpoint barato, consultado periodicamente pelo sino. */
    public function contagem()
    {
        return $this->respondSuccess(['nao_lidas' => $this->notificacaoService->contarNaoLidas(service('authenticatedUser')->id)]);
    }

    public function marcarLida($notificacaoId)
    {
        try {
            $this->notificacaoService->marcarLida($notificacaoId, service('authenticatedUser')->id);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null);
    }

    public function marcarTodasLidas()
    {
        return $this->respondSuccess(['atualizadas' => $this->notificacaoService->marcarTodasLidas(service('authenticatedUser')->id)]);
    }

    public function excluir($notificacaoId)
    {
        try {
            $this->notificacaoService->excluir($notificacaoId, service('authenticatedUser')->id);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null);
    }
}
