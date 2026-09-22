<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CandidatoModel;
use App\Models\EmpresaModel;
use App\Models\FaseRecrutamentoModel;
use App\Models\HistoricoFaseModel;
use App\Models\ModuloModel;

class CandidatoService
{
    protected EmpresaModel $empresaModel;
    protected ModuloModel $moduloModel;
    protected CandidatoModel $candidatoModel;
    protected FaseRecrutamentoModel $faseRecrutamentoModel;
    protected HistoricoFaseModel $historicoFaseModel;
    protected AutorizacaoModuloService $autorizacaoModuloService;

    public function __construct()
    {
        $this->empresaModel             = new EmpresaModel();
        $this->moduloModel              = new ModuloModel();
        $this->candidatoModel           = new CandidatoModel();
        $this->faseRecrutamentoModel    = new FaseRecrutamentoModel();
        $this->historicoFaseModel       = new HistoricoFaseModel();
        $this->autorizacaoModuloService = new AutorizacaoModuloService();
    }

    /**
     * Candidatura pública — sem autenticação, sem cargo, sem checagem
     * de nível (não se aplica: quem chama isso não está logado).
     */
    public function criarCandidatura(string $moduloId, array $dados): array
    {
        $modulo = $this->moduloModel->where('id', $moduloId)->where('tipo', 'recrutamento')->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Vaga não encontrada.');
        }

        if ($this->candidatoModel->where('modulo_id', $moduloId)->where('email', $dados['email'])->first()) {
            throw new \DomainException('Você já se candidatou para esta vaga anteriormente.');
        }

        $primeiraFase = $this->faseRecrutamentoModel->where('modulo_id', $moduloId)->orderBy('ordem', 'ASC')->first();

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

    public function listarKanban(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $this->confirmarVagaDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $fases      = $this->faseRecrutamentoModel->where('modulo_id', $moduloId)->orderBy('ordem', 'ASC')->findAll();
        $candidatos = $this->candidatoModel->where('modulo_id', $moduloId)->orderBy('criado_em', 'ASC')->findAll();

        $kanban = [];
        foreach ($fases as $fase) {
            $kanban[$fase['id']] = ['fase' => $fase['nome'], 'total' => 0, 'candidatos' => []];
        }

        foreach ($candidatos as $candidato) {
            $fase = $candidato['fase_atual_id'];
            if (isset($kanban[$fase])) {
                $kanban[$fase]['candidatos'][] = $candidato;
                $kanban[$fase]['total']++;
            }
        }

        return $kanban;
    }

    /**
     * Kanban de todas as vagas, agrupado por nome de fase — mas só
     * considerando vagas que o cargo tem pelo menos "visualizar".
     */
    public function listarKanbanGlobal(string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $vagas = $this->moduloModel->where('empresa_id', $empresaId)->where('tipo', 'recrutamento')->findAll();

        if (empty($vagas)) {
            return [];
        }

        $vagaIdsPermitidas = $this->autorizacaoModuloService->filtrarModulosComNivel(
            array_column($vagas, 'id'),
            $acessoTotal,
            $cargoId,
            'visualizar'
        );

        $vagas = array_values(array_filter($vagas, static fn ($v) => in_array($v['id'], $vagaIdsPermitidas, true)));

        if (empty($vagas)) {
            return [];
        }

        $vagaIds       = array_column($vagas, 'id');
        $nomeVagaPorId = array_column($vagas, 'nome', 'id');

        $fases         = $this->faseRecrutamentoModel->whereIn('modulo_id', $vagaIds)->orderBy('ordem', 'ASC')->findAll();
        $nomeFasePorId = array_column($fases, 'nome', 'id');

        $kanban = [];
        foreach ($fases as $fase) {
            $chave = strtolower(trim($fase['nome']));
            if (! isset($kanban[$chave])) {
                $kanban[$chave] = ['fase' => $fase['nome'], 'total' => 0, 'candidatos' => []];
            }
        }

        $candidatos = $this->candidatoModel->whereIn('modulo_id', $vagaIds)->orderBy('criado_em', 'ASC')->findAll();

        foreach ($candidatos as $candidato) {
            $nomeFase = $nomeFasePorId[$candidato['fase_atual_id']] ?? null;
            $chave    = $nomeFase ? strtolower(trim($nomeFase)) : 'outros';

            if (! isset($kanban[$chave])) {
                $kanban[$chave] = ['fase' => $nomeFase ?? 'Outros', 'total' => 0, 'candidatos' => []];
            }

            $candidato['vaga'] = $nomeVagaPorId[$candidato['modulo_id']] ?? null;
            $kanban[$chave]['candidatos'][] = $candidato;
            $kanban[$chave]['total']++;
        }

        return $kanban;
    }

    public function moverFase(string $candidatoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $novaFaseId, string $usuarioId): array
    {
        $this->confirmarVagaDaEmpresa($moduloId, $empresaId);

        $candidato = $this->candidatoModel->where('id', $candidatoId)->where('modulo_id', $moduloId)->first();

        if (! $candidato) {
            throw new NaoEncontradoException('Candidato não encontrado.');
        }

        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

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

    public function moverFaseGlobalPorNome(string $candidatoId, string $empresaId, string $cargoId, bool $acessoTotal, string $nomeFase, string $usuarioId): array
    {
        $candidato = $this->candidatoModel
            ->select('candidato.*')
            ->join('modulo', 'modulo.id = candidato.modulo_id')
            ->where('candidato.id', $candidatoId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $candidato) {
            throw new NaoEncontradoException('Candidato não encontrado.');
        }

        $nomeFaseNormalizado = strtolower(trim($nomeFase));
        $faseAlvo = null;

        foreach ($this->faseRecrutamentoModel->where('modulo_id', $candidato['modulo_id'])->findAll() as $fase) {
            if (strtolower(trim($fase['nome'])) === $nomeFaseNormalizado) {
                $faseAlvo = $fase;
                break;
            }
        }

        if ($faseAlvo === null) {
            throw new NaoEncontradoException("A vaga deste candidato não possui uma fase chamada '{$nomeFase}'.");
        }

        return $this->moverFase($candidatoId, $candidato['modulo_id'], $empresaId, $cargoId, $acessoTotal, $faseAlvo['id'], $usuarioId);
    }

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

    public function buscarCandidatoComPermissao(string $candidatoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $candidato = $this->buscarCandidato($candidatoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        return $candidato;
    }

    public function excluirCandidato(string $candidatoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $this->buscarCandidato($candidatoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $this->candidatoModel->delete($candidatoId);
    }

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