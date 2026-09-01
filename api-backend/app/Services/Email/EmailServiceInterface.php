<?php

namespace App\Services\Email;

interface EmailServiceInterface
{
    public function enviar(string $destinatarioEmail, string $assunto, string $corpoHtml): void;
}