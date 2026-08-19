<?php

namespace App\Controllers;

class Home extends BaseApiController
{
    public function index(): string
    {
        return view('welcome_message');
    }

    public function naoEncontrado()
    {
        return $this->respondError('Recurso não encontrado.', 404);
    }
}
