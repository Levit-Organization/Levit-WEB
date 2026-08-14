<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CandidatoModel;
use App\Models\EmpresaModel;
use App\Models\HistoricoFaseModel;
use App\Models\RegistroModel;

class CandidatoService
{
    private const FASES_VALIDAS = ['triagem', 'entrevista', 'teste tecnico', 'aprovado'];

    protected EmpresaModel $empresaModel;
    protected CandidatoModel $candidatoModel;
    protected HistoricoFaseModel $historicoFaseModel;
    protected RegistroModel $registroModel;

    public function __construct()
    {
        $this->empresaModel       = new EmpresaModel();
        $this->candidatoModel     = new CandidatoModel();
        $this->historicoFaseModel = new HistoricoFaseModel();
        $this->registroModel      = new RegistroModel();
    }

    /**
     * Registra uma candidatura pública — endpoint sem autenticação.
     * Mantido para compatibilidade, mas o foco agora são os módulos customizados.
     */
    public function criarCandidatura(string $empresaId, array $dados): array
    {
        if (! $this->empresaModel->find($empresaId)) {
            throw new NaoEncontradoException('Empresa não encontrada.');
        }

        $jaExiste = $this->candidatoModel
            ->where('empresa_id', $empresaId)
            ->where('email', $dados['email'])
            ->first();

        if ($jaExiste) {
            throw new \DomainException('Você já se candidatou para esta empresa anteriormente.');
        }

        $candidatoId = $this->candidatoModel->insert([
            'empresa_id'     => $empresaId,
            'nome'           => $dados['nome'],
            'email'          => $dados['email'],
            'telefone'       => $dados['telefone'] ?? null,
            'cargo_desejado' => $dados['cargo_desejado'] ?? null,
            'mensagem'       => $dados['mensagem'] ?? null,
        ]);

        return $this->candidatoModel->find($candidatoId);
    }

    /**
     * Monta o Kanban pegando registros de todos os módulos do tipo 'recrutamento'.
     */
    public function listarKanban(string $empresaId): array
    {
        $db = db_connect();
        
        $registros = $db->query(
            "SELECT registro.*, modulo.nome as vaga, modulo.id as modulo_id
             FROM registro 
             JOIN modulo ON modulo.id = registro.modulo_id 
             WHERE modulo.empresa_id = ? AND modulo.tipo = 'recrutamento'
             ORDER BY registro.criado_em ASC",
            [$empresaId]
        )->getResultArray();

        // Pre-fetch all field names for recruitment modules
        $camposRows = $db->query(
            "SELECT cm.id, cm.nome, cm.modulo_id
             FROM campo_modulo cm
             JOIN modulo m ON m.id = cm.modulo_id
             WHERE m.empresa_id = ? AND m.tipo = 'recrutamento'",
            [$empresaId]
        )->getResultArray();

        $campoNomes = [];
        foreach ($camposRows as $campo) {
            $campoNomes[$campo['id']] = $campo['nome'];
        }

        $kanban = [];

        foreach (self::FASES_VALIDAS as $fase) {
            $kanban[$fase] = ['total' => 0, 'candidatos' => []];
        }

        foreach ($registros as $registro) {
            $dadosRaw = json_decode($registro['dados'], true) ?? [];
            $fase = $dadosRaw['_fase_atual'] ?? 'triagem';
            
            if (!in_array($fase, self::FASES_VALIDAS, true)) {
                $fase = 'triagem';
            }

            // Replace UUID keys with human-readable field names
            $dadosLegivel = [];
            foreach ($dadosRaw as $key => $value) {
                if ($key === '_fase_atual') continue;
                $nome = $campoNomes[$key] ?? $key;
                $dadosLegivel[$nome] = $value;
            }
            
            $registro['dados'] = $dadosLegivel;
            $registro['fase_atual'] = $fase;
            $kanban[$fase]['candidatos'][] = $registro;
            $kanban[$fase]['total']++;
        }

        return $kanban;
    }

    /**
     * Move de fase um registro de recrutamento.
     */
    public function moverFase(string $registroId, string $empresaId, string $novaFase, string $usuarioId): array
    {
        if (! in_array($novaFase, self::FASES_VALIDAS, true)) {
            throw new \DomainException("Fase inválida: '{$novaFase}'.");
        }

        $db = db_connect();
        $registro = $db->query(
            "SELECT registro.* FROM registro 
             JOIN modulo ON modulo.id = registro.modulo_id 
             WHERE registro.id = ? AND modulo.empresa_id = ? AND modulo.tipo = 'recrutamento'",
            [$registroId, $empresaId]
        )->getRowArray();

        if (! $registro) {
            throw new NaoEncontradoException('Registro de candidato não encontrado.');
        }
        
        $dados = json_decode($registro['dados'], true) ?? [];
        $faseAtual = $dados['_fase_atual'] ?? 'triagem';

        if ($faseAtual === $novaFase) {
            throw new \DomainException('O candidato já está nessa fase.');
        }

        $dados['_fase_atual'] = $novaFase;
        
        $this->registroModel->update($registroId, [
            'dados' => $dados,
            'atualizado_por' => $usuarioId
        ]);

        return $this->buscarCandidato($registroId, $empresaId);
    }

    public function buscarCandidato(string $registroId, string $empresaId): array
    {
        $db = db_connect();
        $registro = $db->query(
            "SELECT registro.* FROM registro 
             JOIN modulo ON modulo.id = registro.modulo_id 
             WHERE registro.id = ? AND modulo.empresa_id = ? AND modulo.tipo = 'recrutamento'",
            [$registroId, $empresaId]
        )->getRowArray();

        if (! $registro) {
            throw new NaoEncontradoException('Registro de candidato não encontrado.');
        }
        
        $registro['dados'] = json_decode($registro['dados'], true) ?? [];
        return $registro;
    }

    public function excluirCandidato(string $registroId, string $empresaId): void
    {
        $this->buscarCandidato($registroId, $empresaId);
        $this->registroModel->delete($registroId);
    }
}