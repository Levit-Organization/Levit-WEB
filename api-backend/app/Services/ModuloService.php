<?php

namespace App\Services;

use App\Models\CampoModuloModel;
use App\Models\ModuloModel;
use App\Exceptions\NaoEncontradoException;
use App\Models\FaseRecrutamentoModel;
use App\Models\CandidatoModel;

class ModuloService
{
    private const TIPOS_VALIDOS = ['texto', 'numero', 'data', 'selecao'];

    protected ModuloModel $moduloModel;
    protected CampoModuloModel $campoModuloModel;
    protected FaseRecrutamentoModel $faseRecrutamentoModel;
    protected CandidatoModel $candidatoModel;
    protected \App\Models\AutomacaoModel $automacaoModel;

    public function __construct()
    {
        $this->moduloModel           = new ModuloModel();
        $this->campoModuloModel      = new CampoModuloModel();
        $this->faseRecrutamentoModel = new FaseRecrutamentoModel();
        $this->candidatoModel        = new CandidatoModel();
        $this->automacaoModel        = new \App\Models\AutomacaoModel();
    }

    /**
     * Cria um módulo novo, junto com seus campos iniciais.
     *
     * @throws \DomainException se os dados violarem uma regra de negócio
     */
    public function criarModulo(string $empresaId, string $usuarioId, array $dados): array
    {
        $tipo   = $dados['tipo'] ?? 'dados';
        $campos = $dados['campos'] ?? [];
        $fases  = $dados['fases'] ?? [];

        if (! in_array($tipo, ['dados', 'arquivo', 'recrutamento'], true)) {
            throw new \DomainException("Tipo de módulo inválido: '{$tipo}'.");
        }

        if ($tipo === 'dados' && empty($campos)) {
            throw new \DomainException('O módulo precisa de pelo menos um campo.');
        }

        if ($tipo === 'recrutamento' && empty($fases)) {
            throw new \DomainException('O módulo de recrutamento precisa de pelo menos uma fase.');
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

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar o módulo. Tente novamente.');
        }

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    /**
     * Confirma que um campo existe, pertence ao módulo informado, e que
     * esse módulo pertence à empresa de quem está pedindo.
     */
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
            throw new NaoEncontradoException('Campo não encontrado.');
        }

        return $campo;
    }

    /**
     * Valida um campo individual: nome preenchido, tipo permitido, e
     * opções obrigatórias quando o tipo é "selecao".
     */
    private function validarCampo(array $campo): void
    {
        if (empty($campo['nome'])) {
            throw new \DomainException('Todo campo precisa de um nome.');
        }

        if (! in_array($campo['tipo'] ?? null, self::TIPOS_VALIDOS, true)) {
            $tipoRecebido = $campo['tipo'] ?? '(vazio)';
            throw new \DomainException("Tipo de campo inválido: '{$tipoRecebido}'.");
        }

        if ($campo['tipo'] === 'selecao' && empty($campo['opcoes'])) {
            throw new \DomainException('Campos do tipo Seleção Única precisam de ao menos uma opção.');
        }
    }

    /**
     * Busca um módulo já com seus campos, ordenados — SEMPRE filtrando
     * pela empresa do usuário que está pedindo.
     *
     * @throws \DomainException se o módulo não existir OU não pertencer à empresa
     */
    public function buscarModuloComCampos(string $moduloId, string $empresaId): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

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

    /**
     * Atualiza nome e/ou ícone de um módulo já existente.
     */
    public function atualizarModulo(string $moduloId, string $empresaId, array $dados): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

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

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    /**
     * Adiciona um campo novo a um módulo já existente — mesmo que
     * ele já tenha registros (US05, critério 2).
     */
    public function adicionarCampo(string $moduloId, string $empresaId, array $campo): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        $this->validarCampo($campo);

        $proximaOrdem = $this->campoModuloModel
            ->where('modulo_id', $moduloId)
            ->countAllResults();

        $this->campoModuloModel->insert([
            'modulo_id' => $moduloId,
            'nome'      => $campo['nome'],
            'tipo'      => $campo['tipo'],
            'opcoes'    => $campo['opcoes'] ?? null,
            'ordem'     => $proximaOrdem,
        ]);

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    public function atualizarCampo(string $campoId, string $moduloId, string $empresaId, array $dados): array
    {
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

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    public function reordenarCampos(string $moduloId, string $empresaId, array $ordemCampoIds): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        $idsExistentes = array_column(
            $this->campoModuloModel->where('modulo_id', $moduloId)->findAll(),
            'id'
        );

        $listaBate = count($ordemCampoIds) === count($idsExistentes)
            && empty(array_diff($ordemCampoIds, $idsExistentes));

        if (! $listaBate) {
            throw new \DomainException('A lista enviada não corresponde exatamente aos campos deste módulo.');
        }

        $db = db_connect();
        $db->transStart();

        foreach ($ordemCampoIds as $ordem => $campoId) {
            $this->campoModuloModel->update($campoId, ['ordem' => $ordem]);
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível reordenar os campos. Tente novamente.');
        }

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    /**
     * @throws \DomainException se já existir algum registro usando esse campo
     */
    public function excluirCampo(string $campoId, string $moduloId, string $empresaId): void
    {
        $this->buscarCampoValidado($campoId, $moduloId, $empresaId);

        $db = db_connect();

        $linha = $db->query(
            'SELECT COUNT(*) AS total FROM registro WHERE modulo_id = ? AND jsonb_exists(dados, ?)',
            [$moduloId, $campoId]
        )->getRow();

        if ((int) $linha->total > 0) {
            throw new \DomainException('Não é possível excluir um campo que já possui registros preenchidos.');
        }

        if ($this->automacaoModel->where('campo_condicao_id', $campoId)->first()) {
            throw new \DomainException('Não é possível excluir um campo usado como condição em uma automação.');
        }

        $this->campoModuloModel->delete($campoId);
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

    public function adicionarFase(string $moduloId, string $empresaId, string $nomeFase): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->where('tipo', 'recrutamento')
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Vaga não encontrada.');
        }

        if (trim($nomeFase) === '') {
            throw new \DomainException('Toda fase precisa de um nome.');
        }

        $proximaOrdem = $this->faseRecrutamentoModel
            ->where('modulo_id', $moduloId)
            ->countAllResults();

        $this->faseRecrutamentoModel->insert([
            'modulo_id' => $moduloId,
            'nome'      => $nomeFase,
            'ordem'     => $proximaOrdem,
        ]);

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    public function atualizarFase(string $faseId, string $moduloId, string $empresaId, string $novoNome): array
    {
        $this->buscarFaseValidada($faseId, $moduloId, $empresaId);

        if (trim($novoNome) === '') {
            throw new \DomainException('Toda fase precisa de um nome.');
        }

        $this->faseRecrutamentoModel->update($faseId, ['nome' => $novoNome]);

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    public function reordenarFases(string $moduloId, string $empresaId, array $ordemFaseIds): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->where('tipo', 'recrutamento')
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Vaga não encontrada.');
        }

        $idsExistentes = array_column(
            $this->faseRecrutamentoModel->where('modulo_id', $moduloId)->findAll(),
            'id'
        );

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

        return $this->buscarModuloComCampos($moduloId, $empresaId);
    }

    /**
     * @throws \DomainException se ainda existir candidato ativo nessa fase
     */
    public function excluirFase(string $faseId, string $moduloId, string $empresaId): void
    {
        $this->buscarFaseValidada($faseId, $moduloId, $empresaId);

        $totalCandidatos = $this->candidatoModel->where('fase_atual_id', $faseId)->countAllResults();

        if ($totalCandidatos > 0) {
            throw new \DomainException('Não é possível excluir uma fase que ainda possui candidatos.');
        }

        $this->faseRecrutamentoModel->delete($faseId);
    }

    /**
     * Lista todos os módulos da empresa, já com o total de registros
     * de cada um — numa única consulta, evitando N+1.
     */
    public function listarModulos(string $empresaId): array
    {
        return $this->moduloModel
            ->select('modulo.*, COUNT(registro.id) AS total_registros')
            ->join('registro', 'registro.modulo_id = modulo.id', 'left')
            ->where('modulo.empresa_id', $empresaId)
            ->groupBy('modulo.id')
            ->orderBy('modulo.criado_em', 'ASC')
            ->findAll();
    }

    /**
     * @throws NaoEncontradoException se o módulo não existir ou não pertencer à empresa
     */
    public function excluirModulo(string $moduloId, string $empresaId): void
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        $this->moduloModel->delete($moduloId);
    }
}