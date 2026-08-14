<?php

namespace App\Controllers;

use App\Exceptions\NaoEncontradoException;
use App\Services\ArquivoService;

class ArquivoController extends BaseApiController
{
    protected ArquivoService $arquivoService;

    public function __construct()
    {
        $this->arquivoService = new ArquivoService();
    }

    public function enviar($moduloId)
    {
        $arquivo = $this->request->getFile('arquivo');
        $user    = service('authenticatedUser');

        if (! $arquivo) {
            return $this->respondError('Nenhum arquivo enviado.', 422);
        }

        try {
            $resultado = $this->arquivoService->enviarArquivo($moduloId, $user->empresaId, $user->id, $arquivo);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($resultado, 201);
    }

    public function baixar($moduloId, $registroId)
    {
        $user = service('authenticatedUser');

        try {
            $arquivo = $this->arquivoService->baixarArquivo($registroId, $moduloId, $user->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->response
            ->setContentType($arquivo['tipo_mime'])
            ->setHeader('Content-Disposition', 'attachment; filename="' . $arquivo['nome_original'] . '"')
            ->setBody($arquivo['conteudo']);
    }

    public function excluir($moduloId, $registroId)
    {
        $user = service('authenticatedUser');

        try {
            $this->arquivoService->excluirArquivo($registroId, $moduloId, $user->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null, 200);
    }
}