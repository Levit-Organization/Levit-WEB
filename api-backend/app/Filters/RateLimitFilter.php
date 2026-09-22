<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class RateLimitFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $throttler = service('throttler');
        $chave     = 'candidatura_' . md5($request->getIPAddress());

        if ($throttler->check($chave, 5, HOUR) === false) {
            return service('response')
                ->setStatusCode(429)
                ->setJSON(['status' => 'error', 'message' => 'Muitas tentativas. Tente novamente mais tarde.']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nada a fazer depois da resposta, por enquanto.
    }
}