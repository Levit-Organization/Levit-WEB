<?php

namespace App\Controllers;

class BaseApiController extends BaseController
{
    /**
     * Resposta de sucesso padronizada.
     */
    protected function respondSuccess($data = null, int $statusCode = 200)
    {
        return $this->response
            ->setStatusCode($statusCode)
            ->setJSON([
                'status' => 'success',
                'data'   => $data,
            ]);
    }

    /**
     * Resposta de erro padronizada.
     */
    protected function respondError(string $message, int $statusCode = 400, ?array $errors = null)
    {
        $body = [
            'status'  => 'error',
            'message' => $message,
        ];

        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        return $this->response
            ->setStatusCode($statusCode)
            ->setJSON($body);
    }
}