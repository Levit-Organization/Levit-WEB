<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CandidatoModel;
use App\Models\FaseRecrutamentoModel;
use App\Models\HistoricoFaseModel;
use App\Models\ModuloModel;

class CandidatoService
{
    protected ModuloModel $moduloModel;
    protected FaseRecrutamentoModel $faseRecrutamentoModel;
    protected CandidatoModel $candidatoModel;
    protected HistoricoFaseModel $historicoFaseModel;

    public function __construct()
    {
        $this->moduloModel           = new ModuloModel();
        $this->faseRecrutamentoModel = new FaseRecrutamentoModel();
        $this->candidatoModel        = new CandidatoModel();
        $this->historicoFaseModel    = new HistoricoFaseModel();
    }

    /**
     * Registra uma candidatura pública para uma vaga específica.
     *
     * @throws NaoEncontradoException se a vaga não existir
     * @throws \DomainException se o e-mail já se candidatou a essa vaga
     */
    public function criarCandidatura(string $moduloId, array $dados): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('tipo', 'recrutamento')
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Vaga não encontrada.');
        }

        if ($this->candidatoModel->where('modulo_id', $moduloId)->where('email', $dados['email'])->first()) {
            throw new \DomainException('Você já se candidatou para esta vaga anteriormente.');
        }

        $primeiraFase = $this->faseRecrutamentoModel
            ->where('modulo_id', $moduloId)
            ->orderBy('ordem', 'ASC')
            ->first();

        if (! $primeiraFase) {
            throw new \RuntimeException('Esta vaga ainda não tem nenhuma fase configurada.');
        }

        $candidatoId = $this->candidatoModel->insert([
            'modulo_id'      => $moduloId,
            'fase_atual_id'  => $primeiraFase['id'],
            'nome'           => $dados['nome'],
            'email'          => $dados['email'],
            'telefone'       => $dados['telefone'] ?? null,
            'cargo_desejado' => $dados['cargo_desejado'] ?? null,
            'mensagem'       => $dados['mensagem'] ?? null,
        ]);

        return $this->buscarCandidato($candidatoId, $moduloId, $modulo['empresa_id']);
    }

    /**
     * Monta o Kanban da vaga, agrupado por fase (na ordem configurada),
     * com contagem por coluna.
     */
    public function listarKanban(string $moduloId, string $empresaId): array
    {
        $this->confirmarVagaDaEmpresa($moduloId, $empresaId);

        $fases = $this->faseRecrutamentoModel
            ->where('modulo_id', $moduloId)
            ->orderBy('ordem', 'ASC')
            ->findAll();

        $candidatos = $this->candidatoModel
            ->where('modulo_id', $moduloId)
            ->orderBy('criado_em', 'ASC')
            ->findAll();

        $kanban = [];

        foreach ($fases as $fase) {
            $kanban[$fase['id']] = [
                'fase'       => $fase['nome'],
                'total'      => 0,
                'candidatos' => [],
            ];
        }

        foreach ($candidatos as $candidato) {
            $faseId = $candidato['fase_atual_id'];

            if (isset($kanban[$faseId])) {
                $kanban[$faseId]['candidatos'][] = $candidato;
                $kanban[$faseId]['total']++;
            }
        }

        return $kanban;
    }

    /**
     * @throws NaoEncontradoException se candidato ou fase não existirem nesta vaga
     * @throws \DomainException se o candidato já estiver nessa fase
     */
    public function moverFase(string $candidatoId, string $moduloId, string $empresaId, string $novaFaseId, string $usuarioId): array
    {
        $this->confirmarVagaDaEmpresa($moduloId, $empresaId);

        $candidato = $this->candidatoModel
            ->where('id', $candidatoId)
            ->where('modulo_id', $moduloId)
            ->first();

        if (! $candidato) {
            throw new NaoEncontradoException('Candidato não encontrado.');
        }

        if (! $this->faseRecrutamentoModel->where('id', $novaFaseId)->where('modulo_id', $moduloId)->first()) {
            throw new NaoEncontradoException('Fase não encontrada nesta vaga.');
        }

        if ($candidato['fase_atual_id'] === $novaFaseId) {
            throw new \DomainException('O candidato já está nessa fase.');
        }

        $db = db_connect();
        $db->transStart();

        $this->candidatoModel->update($candidatoId, ['fase_atual_id' => $novaFaseId]);

        $this->historicoFaseModel->insert([
            'candidato_id'     => $candidatoId,
            'fase_anterior_id' => $candidato['fase_atual_id'],
            'fase_nova_id'     => $novaFaseId,
            'alterado_por'     => $usuarioId,
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível mover o candidato. Tente novamente.');
        }

        return $this->buscarCandidato($candidatoId, $moduloId, $empresaId);
    }

    /**
     * Busca um candidato com verificação completa de posse — vaga
     * pertence à empresa, candidato pertence à vaga — numa única query.
     */
    public function buscarCandidato(string $candidatoId, string $moduloId, string $empresaId): array
    {
        $candidato = $this->candidatoModel
            ->select('candidato.*')
            ->join('modulo', 'modulo.id = candidato.modulo_id')
            ->where('candidato.id', $candidatoId)
            ->where('candidato.modulo_id', $moduloId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $candidato) {
            throw new NaoEncontradoException('Candidato não encontrado.');
        }

        return $candidato;
    }

    public function excluirCandidato(string $candidatoId, string $moduloId, string $empresaId): void
    {
        $this->buscarCandidato($candidatoId, $moduloId, $empresaId);
        $this->candidatoModel->delete($candidatoId);
    }

    /**
     * @throws NaoEncontradoException se a vaga não existir/pertencer à empresa
     */
    private function confirmarVagaDaEmpresa(string $moduloId, string $empresaId): void
    {
        $existe = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->where('tipo', 'recrutamento')
            ->first();

        if (! $existe) {
            throw new NaoEncontradoException('Vaga não encontrada.');
        }
    }
}