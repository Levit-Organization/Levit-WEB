<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\AutomacaoModel;
use App\Models\AutomacaoAcaoModel;
use App\Models\CampoModuloModel;
use App\Models\ModuloModel;

class AutomacaoService
{
    private const GATILHOS_VALIDOS    = ['criacao', 'atualizacao', 'exclusao'];
    private const OPERADORES_VALIDOS  = ['igual', 'diferente'];
    private const TIPOS_ACAO_VALIDOS  = ['enviar_email', 'webhook'];

    protected ModuloModel $moduloModel;
    protected CampoModuloModel $campoModuloModel;
    protected AutomacaoModel $automacaoModel;
    protected AutomacaoAcaoModel $automacaoAcaoModel;

    public function __construct()
    {
        $this->moduloModel        = new ModuloModel();
        $this->campoModuloModel   = new CampoModuloModel();
        $this->automacaoModel     = new AutomacaoModel();
        $this->automacaoAcaoModel = new AutomacaoAcaoModel();
    }

    public function criarAutomacao(string $moduloId, string $empresaId, string $usuarioId, array $dados): array
    {
        if (! $this->moduloModel->where('id', $moduloId)->where('empresa_id', $empresaId)->first()) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        $gatilho = $dados['gatilho'] ?? '';
        if (! in_array($gatilho, self::GATILHOS_VALIDOS, true)) {
            throw new \DomainException("Gatilho inválido: '{$gatilho}'.");
        }

        $acoes = $dados['acoes'] ?? [];
        if (empty($acoes)) {
            throw new \DomainException('A automação precisa de pelo menos uma ação.');
        }
        foreach ($acoes as $acao) {
            $this->validarAcao($acao);
        }

        $campoCondicaoId  = $dados['campo_condicao_id'] ?? null;
        $condicaoOperador = $dados['condicao_operador'] ?? null;
        $condicaoValor    = $dados['condicao_valor'] ?? null;

        if ($campoCondicaoId !== null) {
            if (! $this->campoModuloModel->where('id', $campoCondicaoId)->where('modulo_id', $moduloId)->first()) {
                throw new \DomainException('Campo de condição não pertence a este módulo.');
            }
            if (! in_array($condicaoOperador, self::OPERADORES_VALIDOS, true)) {
                throw new \DomainException("Operador de condição inválido: '{$condicaoOperador}'.");
            }
            if ($condicaoValor === null || $condicaoValor === '') {
                throw new \DomainException('A condição precisa de um valor para comparação.');
            }
        }

        $db = db_connect();
        $db->transStart();

        $automacaoId = $this->automacaoModel->insert([
            'modulo_id'         => $moduloId,
            'nome'              => $dados['nome'],
            'gatilho'           => $gatilho,
            'campo_condicao_id' => $campoCondicaoId,
            'condicao_operador' => $campoCondicaoId ? $condicaoOperador : null,
            'condicao_valor'    => $campoCondicaoId ? $condicaoValor : null,
            'criado_por'        => $usuarioId,
        ]);

        foreach ($acoes as $ordem => $acao) {
            $this->automacaoAcaoModel->insert([
                'automacao_id' => $automacaoId,
                'tipo'         => $acao['tipo'],
                'configuracao' => $acao['configuracao'] ?? [],
                'ordem'        => $ordem,
            ]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar a automação. Tente novamente.');
        }

        return $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
    }

    /**
     * Valida a configuração de uma ação de acordo com o tipo dela —
     * cada tipo exige campos diferentes na configuração.
     */
    private function validarAcao(array $acao): void
    {
        $tipo = $acao['tipo'] ?? null;
        if (! in_array($tipo, self::TIPOS_ACAO_VALIDOS, true)) {
            throw new \DomainException("Tipo de ação inválido: '{$tipo}'.");
        }

        $config = $acao['configuracao'] ?? [];

        if ($tipo === 'enviar_email' && (empty($config['destinatario_campo_id']) || empty($config['assunto']) || empty($config['corpo']))) {
            throw new \DomainException('Ação de e-mail precisa de destinatário, assunto e corpo.');
        }

        if ($tipo === 'webhook' && (empty($config['url']) || ! filter_var($config['url'], FILTER_VALIDATE_URL))) {
            throw new \DomainException('Ação de webhook precisa de uma URL válida.');
        }
    }

    public function listarAutomacoes(string $moduloId, string $empresaId): array
    {
        if (! $this->moduloModel->where('id', $moduloId)->where('empresa_id', $empresaId)->first()) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        $automacoes = $this->automacaoModel->where('modulo_id', $moduloId)->findAll();

        foreach ($automacoes as &$automacao) {
            $automacao['acoes'] = $this->automacaoAcaoModel
                ->where('automacao_id', $automacao['id'])
                ->orderBy('ordem', 'ASC')
                ->findAll();
        }
        unset($automacao);

        return $automacoes;
    }

    public function buscarAutomacao(string $automacaoId, string $moduloId, string $empresaId): array
    {
        $automacao = $this->automacaoModel
            ->select('automacao.*')
            ->join('modulo', 'modulo.id = automacao.modulo_id')
            ->where('automacao.id', $automacaoId)
            ->where('automacao.modulo_id', $moduloId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $automacao) {
            throw new NaoEncontradoException('Automação não encontrada.');
        }

        $automacao['acoes'] = $this->automacaoAcaoModel
            ->where('automacao_id', $automacaoId)
            ->orderBy('ordem', 'ASC')
            ->findAll();

        return $automacao;
    }

    public function alternarAtivo(string $automacaoId, string $moduloId, string $empresaId, bool $ativo): array
    {
        $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);

        $this->automacaoModel->update($automacaoId, ['ativo' => $ativo]);

        return $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
    }

    public function excluirAutomacao(string $automacaoId, string $moduloId, string $empresaId): void
    {
        $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        $this->automacaoModel->delete($automacaoId);
    }
}