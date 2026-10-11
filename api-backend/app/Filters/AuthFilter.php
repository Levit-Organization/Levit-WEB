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

        // Revogação, cargo e permissões numa única consulta.
        $dadosAutorizacao = (new AuthService())->contextoDeAutenticacao($claims->sub, $claims->jti);

        // Senha trocada depois que o token foi emitido: sessão antiga não vale mais.
        $senhaTrocadaDepois = $dadosAutorizacao !== null
            && $dadosAutorizacao['senha_alterada_em'] !== null
            && (int) $claims->iat < strtotime($dadosAutorizacao['senha_alterada_em']);

        if ($dadosAutorizacao === null || $dadosAutorizacao['revogado'] || $senhaTrocadaDepois) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token inválido ou expirado.']);
        }

        service('authenticatedUser')->preencher(
            $claims->sub,
            $claims->empresa_id,
            $dadosAutorizacao['cargo_id'],
            $claims->jti,
            $claims->exp,
            $dadosAutorizacao['permissoes'],
            $dadosAutorizacao['acesso_total'],
            $dadosAutorizacao['niveis']
        );

        if (! empty($arguments)) {
            $permissaoNecessaria = $arguments[0];

            if (! $dadosAutorizacao['acesso_total'] && ! in_array($permissaoNecessaria, $dadosAutorizacao['permissoes'], true)) {
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