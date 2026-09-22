<?php

namespace App\Jobs;

use App\Models\AutomacaoAcaoModel;
use App\Models\AutomacaoLogModel;
use App\Models\AutomacaoModel;
use CodeIgniter\Queue\BaseJob;
use GuzzleHttp\Client;

class ProcessarAutomacoes extends BaseJob
{
    public function process()
    {
        $moduloId      = $this->data['modulo_id'];
        $gatilho       = $this->data['gatilho'];
        $registroId    = $this->data['registro_id'] ?? null;
        $dadosRegistro = $this->data['dados_registro'] ?? [];

        $automacaoModel = new AutomacaoModel();

        $automacoes = $automacaoModel
            ->where('modulo_id', $moduloId)
            ->where('gatilho', $gatilho)
            ->where('ativo', true)
            ->findAll();

        foreach ($automacoes as $automacao) {
            $this->processarUmaAutomacao($automacao, $registroId, $dadosRegistro);
        }
    }

    private function processarUmaAutomacao(array $automacao, ?string $registroId, array $dadosRegistro): void
    {
        if (! $this->condicaoAtendida($automacao, $dadosRegistro)) {
            return; // condição não bateu — não é falha, só não era pra disparar
        }

        $logModel = new AutomacaoLogModel();

        try {
            $acaoModel = new AutomacaoAcaoModel();
            $acoes = $acaoModel
                ->where('automacao_id', $automacao['id'])
                ->orderBy('ordem', 'ASC')
                ->findAll();

            foreach ($acoes as $acao) {
                $this->executarAcao($acao, $dadosRegistro, $automacao['modulo_id']);
            }

            $logModel->insert([
                'automacao_id' => $automacao['id'],
                'registro_id'  => $registroId,
                'status'       => 'sucesso',
            ]);
        } catch (\Throwable $e) {
            $logModel->insert([
                'automacao_id' => $automacao['id'],
                'registro_id'  => $registroId,
                'status'       => 'erro',
                'detalhes'     => $e->getMessage(),
            ]);
        }
    }

    private function condicaoAtendida(array $automacao, array $dadosRegistro): bool
    {
        if ($automacao['campo_condicao_id'] === null) {
            return true;
        }

        $valorCampo = $dadosRegistro[$automacao['campo_condicao_id']] ?? null;

        return match ($automacao['condicao_operador']) {
            'igual'     => (string) $valorCampo === (string) $automacao['condicao_valor'],
            'diferente' => (string) $valorCampo !== (string) $automacao['condicao_valor'],
            default     => false,
        };
    }

    private function executarAcao(array $acao, array $dadosRegistro, string $moduloId): void
    {
        match ($acao['tipo']) {
            'enviar_email' => $this->executarEnvioEmail($acao, $dadosRegistro, $moduloId),
            'webhook'      => $this->executarWebhook($acao, $dadosRegistro),
            default        => throw new \RuntimeException("Tipo de ação desconhecido: {$acao['tipo']}"),
        };
    }

    private function substituirVariaveis(string $texto, string $moduloId, array $dadosRegistro): string
    {
        if (!preg_match_all('/\{\{(.*?)\}\}/', $texto, $matches)) {
            return $texto;
        }

        $campoModel = new \App\Models\ModuloCampoModel();
        $campos = $campoModel->where('modulo_id', $moduloId)->findAll();
        
        $mapaNomesParaIds = [];
        foreach ($campos as $campo) {
            $mapaNomesParaIds[mb_strtolower(trim($campo['nome']))] = $campo['id'];
        }

        $textoSubstituido = $texto;
        foreach ($matches[1] as $index => $nomeVariavel) {
            $nomeLimpo = mb_strtolower(trim($nomeVariavel));
            $valor = '';
            
            if (isset($mapaNomesParaIds[$nomeLimpo])) {
                $campoId = $mapaNomesParaIds[$nomeLimpo];
                $valor = $dadosRegistro[$campoId] ?? '';
            }
            
            $textoSubstituido = str_replace($matches[0][$index], (string)$valor, $textoSubstituido);
        }

        return $textoSubstituido;
    }

    private function executarEnvioEmail(array $acao, array $dadosRegistro, string $moduloId): void
    {
        $config = $acao['configuracao'];
        
        $destinatarioBruto = $config['destinatario'] ?? '';
        if (empty($destinatarioBruto) && !empty($config['destinatario_campo_id'])) {
            $destinatarioBruto = $dadosRegistro[$config['destinatario_campo_id']] ?? '';
        }

        $destinatario = $this->substituirVariaveis($destinatarioBruto, $moduloId, $dadosRegistro);

        if (empty($destinatario)) {
            throw new \RuntimeException('Não foi possível determinar o destinatário do e-mail.');
        }

        $assunto = $this->substituirVariaveis($config['assunto'] ?? '', $moduloId, $dadosRegistro);
        $corpo   = $this->substituirVariaveis($config['corpo'] ?? '', $moduloId, $dadosRegistro);

        service('email')->enviar($destinatario, $assunto, $corpo);
    }

    private function executarWebhook(array $acao, array $dadosRegistro): void
    {
        $config = $acao['configuracao'];

        (new Client())->post($config['url'], [
            'json'    => $dadosRegistro,
            'timeout' => 5,
        ]);
    }
}