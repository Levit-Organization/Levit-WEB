<?php

namespace App\Services\Email;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class BrevoEmailService implements EmailServiceInterface
{
    private Client $client;
    private string $apiKey;
    private string $remetenteEmail;
    private string $remetenteNome;

    public function __construct()
    {
        $this->apiKey         = env('BREVO_API_KEY');
        $this->remetenteEmail = env('BREVO_REMETENTE_EMAIL');
        $this->remetenteNome  = env('BREVO_REMETENTE_NOME', 'Levit');
        $this->client         = new Client();
    }

    public function enviar(string $destinatarioEmail, string $assunto, string $corpoHtml): void
    {
        try {
            $this->client->post('https://api.brevo.com/v3/smtp/email', [
                'headers' => [
                    'accept'       => 'application/json',
                    'api-key'      => $this->apiKey,
                    'content-type' => 'application/json',
                ],
                'json' => [
                    'sender' => [
                        'name'  => $this->remetenteNome,
                        'email' => $this->remetenteEmail,
                    ],
                    'to' => [
                        ['email' => $destinatarioEmail],
                    ],
                    'subject'     => $assunto,
                    'htmlContent' => $corpoHtml,
                ],
            ]);
        } catch (GuzzleException $e) {
            throw new \RuntimeException('Não foi possível enviar o e-mail: ' . $e->getMessage());
        }
    }
}