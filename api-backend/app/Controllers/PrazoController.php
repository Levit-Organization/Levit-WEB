<?php

namespace App\Controllers;

use App\Services\PrazoService;

/** Prazos de todas as tabelas que o usuário enxerga (tela inicial). */
class PrazoController extends BaseApiController
{
    public function listar()
    {
        $escopo = $this->request->getGet('escopo') === 'meus' ? 'meus' : 'todos';

        return $this->respondSuccess((new PrazoService())->listar(service('authenticatedUser'), $escopo));
    }
}
