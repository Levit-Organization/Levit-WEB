<?php

namespace App\Filters;

use App\Services\AuthService;
use App\Services\JwtService;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $authHeader = $request->getServer('HTTP_AUTHORIZATION');

        if (! $authHeader || ! str_starts_with($authHeader, 'Bearer ')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token de autenticação não informado.']);
        }

        $token = substr($authHeader, 7);

        try {
            $claims = (new JwtService())->validar($token);
        } catch (\Exception $e) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token inválido ou expirado.']);
        }

        $authService = new AuthService();

        if ($authService->tokenRevogado($claims->jti)) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token inválido ou expirado.']);
        }

        $permissoes = $authService->dadosDeAutorizacao($claims->sub);

        if ($permissoes === null) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token inválido ou expirado.']);
        }

        service('authenticatedUser')->preencher(
            $claims->sub,
            $claims->empresa_id,
            $claims->jti,
            $claims->exp,
            $permissoes
        );

        if (! empty($arguments)) {
            $permissaoNecessaria = $arguments[0];

            if (! in_array($permissaoNecessaria, $permissoes, true)) {
                return service('response')
                    ->setStatusCode(403)
                    ->setJSON(['status' => 'error', 'message' => 'Você não tem permissão para realizar esta ação.']);
            }
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nada a fazer depois da resposta, por enquanto.
    }
}