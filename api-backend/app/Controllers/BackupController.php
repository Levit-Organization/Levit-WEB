<?php

namespace App\Controllers;

use App\Exceptions\NaoEncontradoException;
use App\Services\BackupService;

class BackupController extends BaseApiController
{
    protected BackupService $backupService;

    public function __construct()
    {
        $this->backupService = new BackupService();
    }

    public function exportarJson()
    {
        $dados = $this->backupService->exportarJson(service('authenticatedUser')->empresaId);

        $nomeArquivo = 'backup_levit_' . date('Y-m-d_His') . '.json';

        return $this->response
            ->setContentType('application/json')
            ->setHeader('Content-Disposition', "attachment; filename=\"{$nomeArquivo}\"")
            ->setBody(json_encode($dados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function exportarCsv($moduloId)
    {
        try {
            $resultado = $this->backupService->exportarCsvModulo($moduloId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        $fluxo = fopen('php://temp', 'r+');
        fputcsv($fluxo, $resultado['cabecalho']);
        foreach ($resultado['linhas'] as $linha) {
            fputcsv($fluxo, $linha);
        }
        rewind($fluxo);
        $conteudoCsv = stream_get_contents($fluxo);
        fclose($fluxo);

        $nomeArquivo = $resultado['nome_modulo'] . '_' . date('Y-m-d') . '.csv';

        return $this->response
            ->setContentType('text/csv')
            ->setHeader('Content-Disposition', "attachment; filename=\"{$nomeArquivo}\"")
            ->setBody($conteudoCsv);
    }

    public function resetarFabrica()
    {
        $user = service('authenticatedUser');

        if (! $this->backupService->podeResetar($user->empresaId, $user->id)) {
            return $this->respondError('Somente o administrador principal pode resetar os dados da empresa.', 403);
        }

        $this->backupService->resetarFabrica($user->empresaId);

        return $this->respondSuccess(null, 200);
    }
}