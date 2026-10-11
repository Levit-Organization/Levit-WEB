<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\AutomacaoModel;
use App\Models\CampoModuloModel;
use App\Models\CandidatoModel;
use App\Models\FaseRecrutamentoModel;
use App\Models\ModuloModel;

class ModuloService
{
    private const TIPOS_VALIDOS = ['texto', 'numero', 'data', 'selecao', 'responsavel', 'prazo'];

    protected ModuloModel $moduloModel;
    protected CampoModuloModel $campoModuloModel;
    protected FaseRecrutamentoModel $faseRecrutamentoModel;
    protected CandidatoModel $candidatoModel;
    protected AutomacaoModel $automacaoModel;
    protected AutorizacaoModuloService $autorizacaoModuloService;

    public function __construct()
    {
        $this->moduloModel              = new ModuloModel();
        $this->campoModuloModel         = new CampoModuloModel();
        $this->faseRecrutamentoModel    = new FaseRecrutamentoModel();
        $this->candidatoModel           = new CandidatoModel();
        $this->automacaoModel           = new AutomacaoModel();
        $this->autorizacaoModuloService = new AutorizacaoModuloService();
    }

    public function criarModulo(string $empresaId, string $usuarioId, string $cargoId, array $dados): array
    {
        $tipo   = $dados['tipo'] ?? 'dados';
        $campos = $dados['campos'] ?? [];
        $fases  = $dados['fases'] ?? [];

        if (! in_array($tipo, ['dados', 'arquivo', 'recrutamento', 'financeiro'], true)) {
            throw new \DomainException("Tipo de tabela inválida: '{$tipo}'.");
        }

        if ($tipo === 'dados' && empty($campos)) {
            throw new \DomainException('A tabela precisa de pelo menos uma coluna.');
        }

        if ($tipo === 'recrutamento' && empty($fases)) {
            throw new \DomainException('A tabela de recrutamento precisa de pelo menos uma fase.');
        }

        foreach ($campos as $campo) {
            $this->validarCampo($campo);
        }

        foreach ($fases as $nomeFase) {
            if (! is_string($nomeFase) || trim($nomeFase) === '') {
                throw new \DomainException('Toda fase precisa de um nome.');
            }
        }

        $db = db_connect();
        $db->transStart();

        $moduloId = $this->moduloModel->insert([
            'empresa_id' => $empresaId,
            'nome'       => $dados['nome'],
            'icone'      => $dados['icone'] ?? null,
            'tipo'       => $tipo,
            'criado_por' => $usuarioId,
        ]);

        foreach ($campos as $ordem => $campo) {
            $this->campoModuloModel->insert([
                'modulo_id' => $moduloId,
                'nome'      => $campo['nome'],
                'tipo'      => $campo['tipo'],
                'opcoes'    => $campo['opcoes'] ?? null,
                'ordem'     => $ordem,
            ]);
        }

        foreach ($fases as $ordem => $nomeFase) {
            $this->faseRecrutamentoModel->insert([
                'modulo_id' => $moduloId,
                'nome'      => $nomeFase,
                'ordem'     => $ordem,
            ]);
        }

        // Quem criou já enxerga o que acabou de criar, mesmo sem acesso_total.
        $this->autorizacaoModuloService->concederGerenciar($cargoId, $moduloId);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar a tabela. Tente novamente.');
        }

        AtividadeService::registrar('tabela_criada', "Criou a tabela “{$dados['nome']}”", $moduloId, $dados['nome']);

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, true);
    }

    private function validarCampo(array $campo): void
    {
        if (empty($campo['nome'])) {
            throw new \DomainException('Toda coluna precisa de um nome.');
        }

        if (! in_array($campo['tipo'] ?? null, self::TIPOS_VALIDOS, true)) {
            $tipoRecebido = $campo['tipo'] ?? '(vazio)';
            throw new \DomainException("Tipo de coluna inválida: '{$tipoRecebido}'.");
        }

        if ($campo['tipo'] === 'selecao' && empty($campo['opcoes'])) {
            throw new \DomainException('Colunas do tipo lista de opções precisam de ao menos uma opção.');
        }
    }

    /**
     * Lista só os módulos que o cargo tem algum nível de acesso —
     * módulos sem nenhuma concessão ficam invisíveis (exceto acesso_total).
     */
    public function listarModulos(string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $builder = $this->moduloModel
            ->select('modulo.*, COUNT(registro.id) AS total_registros')
            ->join('registro', 'registro.modulo_id = modulo.id', 'left')
            ->where('modulo.empresa_id', $empresaId);

        if (! $acessoTotal) {
            $builder
                ->join('cargo_modulo_permissao', 'cargo_modulo_permissao.modulo_id = modulo.id')
                ->where('cargo_modulo_permissao.cargo_id', $cargoId);
        }

        return $builder
            ->groupBy('modulo.id')
            ->orderBy('modulo.criado_em', 'ASC')
            ->findAll();
    }

    public function buscarModuloComCampos(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Tabela não encontrada.');
        }

        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $modulo['campos'] = $this->campoModuloModel
            ->where('modulo_id', $moduloId)
            ->orderBy('ordem', 'ASC')
            ->findAll();

        if ($modulo['tipo'] === 'recrutamento') {
            $modulo['fases'] = $this->faseRecrutamentoModel
                ->where('modulo_id', $moduloId)
                ->orderBy('ordem', 'ASC')
                ->findAll();
        }

        return $modulo;
    }

    public function atualizarModulo(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $dados): array
    {
        $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal); // confirma existência + visualizar
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $camposParaAtualizar = [];

        if (isset($dados['nome'])) {
            $camposParaAtualizar['nome'] = $dados['nome'];
        }

        if (array_key_exists('icone', $dados)) {
            $camposParaAtualizar['icone'] = $dados['icone'];
        }

        if (! empty($camposParaAtualizar)) {
            $this->moduloModel->update($moduloId, $camposParaAtualizar);
        }

        $modulo = $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
        if (! empty($camposParaAtualizar)) {
            AtividadeService::registrar('tabela_alterada', "Alterou nome ou ícone da tabela “{$modulo['nome']}”", $moduloId, $modulo['nome']);
        }

        return $modulo;
    }

    public function adicionarCampo(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $campo): array
    {
        $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $this->validarCampo($campo);

        $proximaOrdem = $this->campoModuloModel->where('modulo_id', $moduloId)->countAllResults();

        $this->campoModuloModel->insert([
            'modulo_id' => $moduloId,
            'nome'      => $campo['nome'],
            'tipo'      => $campo['tipo'],
            'opcoes'    => $campo['opcoes'] ?? null,
            'ordem'     => $proximaOrdem,
        ]);

        AtividadeService::registrar('coluna_criada', "Adicionou a coluna “{$campo['nome']}”", $moduloId);

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    private function buscarCampoValidado(string $campoId, string $moduloId, string $empresaId): array
    {
        $campo = $this->campoModuloModel
            ->select('campo_modulo.*')
            ->join('modulo', 'modulo.id = campo_modulo.modulo_id')
            ->where('campo_modulo.id', $campoId)
            ->where('campo_modulo.modulo_id', $moduloId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $campo) {
            throw new NaoEncontradoException('Coluna não encontrada.');
        }

        return $campo;
    }

    public function atualizarCampo(string $campoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $dados): array
    {
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');
        $this->buscarCampoValidado($campoId, $moduloId, $empresaId);

        $camposParaAtualizar = [];

        if (isset($dados['nome'])) {
            $camposParaAtualizar['nome'] = $dados['nome'];
        }

        if (array_key_exists('opcoes', $dados)) {
            $camposParaAtualizar['opcoes'] = $dados['opcoes'];
        }

        if (! empty($camposParaAtualizar)) {
            $this->campoModuloModel->update($campoId, $camposParaAtualizar);
        }

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    public function reordenarCampos(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $ordemCampoIds): array
    {
        $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $idsExistentes = array_column($this->campoModuloModel->where('modulo_id', $moduloId)->findAll(), 'id');

        $listaBate = count($ordemCampoIds) === count($idsExistentes)
            && empty(array_diff($ordemCampoIds, $idsExistentes));

        if (! $listaBate) {
            throw new \DomainException('A lista enviada não corresponde exatamente às colunas desta tabela.');
        }

        $db = db_connect();
        $db->transStart();

        foreach ($ordemCampoIds as $ordem => $campoId) {
            $this->campoModuloModel->update($campoId, ['ordem' => $ordem]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível reordenar as colunas. Tente novamente.');
        }

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    public function excluirCampo(string $campoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');
        $this->buscarCampoValidado($campoId, $moduloId, $empresaId);

        $db = db_connect();

        $linha = $db->query(
            'SELECT COUNT(*) AS total FROM registro WHERE modulo_id = ? AND jsonb_exists(dados, ?)',
            [$moduloId, $campoId]
        )->getRow();

        if ((int) $linha->total > 0) {
            throw new \DomainException('Não é possível excluir uma coluna que já possui itens preenchidos.');
        }

        if ($this->automacaoModel->where('campo_condicao_id', $campoId)->first()) {
            throw new \DomainException('Não é possível excluir uma coluna usada como condição em uma automação.');
        }

        $nomeCampo = $this->campoModuloModel->select('nome')->find($campoId)['nome'] ?? 'uma coluna';
        $this->campoModuloModel->delete($campoId);
        AtividadeService::registrar('coluna_excluida', "Excluiu a coluna “{$nomeCampo}”", $moduloId);
    }

    public function excluirModulo(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $modulo = $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $this->moduloModel->delete($moduloId);
        AtividadeService::registrar('tabela_excluida', "Excluiu a tabela “{$modulo['nome']}”", $moduloId, $modulo['nome']);
    }

    public function adicionarFase(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $nomeFase): array
    {
        $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        if (trim($nomeFase) === '') {
            throw new \DomainException('Toda fase precisa de um nome.');
        }

        $proximaOrdem = $this->faseRecrutamentoModel->where('modulo_id', $moduloId)->countAllResults();

        $this->faseRecrutamentoModel->insert([
            'modulo_id' => $moduloId,
            'nome'      => $nomeFase,
            'ordem'     => $proximaOrdem,
        ]);

        AtividadeService::registrar('etapa_criada', "Adicionou a etapa “{$nomeFase}”", $moduloId);

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    private function buscarFaseValidada(string $faseId, string $moduloId, string $empresaId): array
    {
        $fase = $this->faseRecrutamentoModel
            ->select('fase_recrutamento.*')
            ->join('modulo', 'modulo.id = fase_recrutamento.modulo_id')
            ->where('fase_recrutamento.id', $faseId)
            ->where('fase_recrutamento.modulo_id', $moduloId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $fase) {
            throw new NaoEncontradoException('Fase não encontrada.');
        }

        return $fase;
    }

    public function atualizarFase(string $faseId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $novoNome): array
    {
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');
        $this->buscarFaseValidada($faseId, $moduloId, $empresaId);

        if (trim($novoNome) === '') {
            throw new \DomainException('Toda fase precisa de um nome.');
        }

        $this->faseRecrutamentoModel->update($faseId, ['nome' => $novoNome]);

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    public function reordenarFases(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $ordemFaseIds): array
    {
        $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $idsExistentes = array_column($this->faseRecrutamentoModel->where('modulo_id', $moduloId)->findAll(), 'id');

        $listaBate = count($ordemFaseIds) === count($idsExistentes)
            && empty(array_diff($ordemFaseIds, $idsExistentes));

        if (! $listaBate) {
            throw new \DomainException('A lista enviada não corresponde exatamente às fases desta vaga.');
        }

        $db = db_connect();
        $db->transStart();

        foreach ($ordemFaseIds as $ordem => $faseId) {
            $this->faseRecrutamentoModel->update($faseId, ['ordem' => $ordem]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível reordenar as fases. Tente novamente.');
        }

        return $this->buscarModuloComCampos($moduloId, $empresaId, $cargoId, $acessoTotal);
    }

    public function excluirFase(string $faseId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');
        $this->buscarFaseValidada($faseId, $moduloId, $empresaId);

        $totalCandidatos = $this->candidatoModel->where('fase_atual_id', $faseId)->countAllResults();

        if ($totalCandidatos > 0) {
            throw new \DomainException('Não é possível excluir uma fase que ainda possui candidatos.');
        }

        $this->faseRecrutamentoModel->delete($faseId);
        AtividadeService::registrar('etapa_excluida', 'Excluiu uma etapa do recrutamento', $moduloId);
    }
}