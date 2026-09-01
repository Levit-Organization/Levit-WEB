<?php

namespace App\Services\Email;

class LogEmailService implements EmailServiceInterface
{
    public function enviar(string $destinatarioEmail, string $assunto, string $corpoHtml): void
    {
        log_message('info', "[E-MAIL SIMULADO] Para: {$destinatarioEmail} | Assunto: {$assunto} | Corpo: {$corpoHtml}");
    }
}