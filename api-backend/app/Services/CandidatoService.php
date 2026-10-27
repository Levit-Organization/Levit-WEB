<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\CandidatoModel;
use App\Models\EmpresaModel;
use App\Models\FaseRecrutamentoModel;
use App\Models\HistoricoFaseModel;
use App\Models\ModuloModel;
use App\Services\Automacao\CamposCandidato;
use CodeIgniter\Events\Events;
use CodeIgniter\HTTP\Files\UploadedFile;

class CandidatoService
{
    private const CURRICULO_EXTENSOES     = ['pdf', 'doc', 'docx'];
    private const CURRICULO_MAXIMO_BYTES  = 5 * 1024 * 1024; // 5 MB

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
     * O que a página pública de candidatura mostra: o nome da vaga e da empresa.
     * Vaga sem etapa ainda não recebe candidatos, então também não aparece.
     */
    public function vagaPublica(string $moduloId): array
    {
        $modulo = $this->moduloModel->where('id', $moduloId)->where('tipo', 'recrutamento')->first();

        if (! $modulo || ! $this->faseRecrutamentoModel->where('modulo_id', $moduloId)->first()) {
            throw new NaoEncontradoException('Vaga não encontrada ou não está recebendo candidaturas.');
        }

        $empresa = $this->empresaModel->select('nome')->find($modulo['empresa_id']);

        return [
            'vaga'    => $modulo['nome'],
            'empresa' => $empresa['nome'] ?? null,
        ];
    }

    /**
     * Candidatura pública — sem autenticação, sem cargo, sem checagem
     * de nível (não se aplica: quem chama isso não está logado).
     */
    public function criarCandidatura(string $moduloId, array $dados, ?UploadedFile $curriculo = null): array
    {
        $modulo = $this->moduloModel->where('id', $moduloId)->where('tipo', 'recrutamento')->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Vaga não encontrada.');
        }

        $candidato = $this->inserirCandidato($modulo, $dados, $curriculo, 'Você já se candidatou para esta vaga anteriormente.');

        // Candidaturas seguidas na mesma vaga viram uma notificação só.
        $notificacoes = new NotificacaoService();
        $notificacoes->notificarSemFalhar(
            $notificacoes->usuariosComAcessoAoModulo($moduloId, $modulo['empresa_id']),
            $modulo['empresa_id'],
            [
                'tipo'            => 'candidatura',
                'titulo'          => "Nova candidatura em {$modulo['nome']}",
                'titulo_agrupado' => "{n} novas candidaturas em {$modulo['nome']}",
                'mensagem'        => "{$dados['nome']} se candidatou.",
                'link'            => '/recrutamento',
                'agrupador'       => "candidatura:{$moduloId}",
            ]
        );

        return $candidato;
    }

    /** Candidato registrado por alguém da equipe (quem tem "editar" na vaga). */
    public function adicionarCandidato(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $dados, ?UploadedFile $curriculo = null): array
    {
        $this->confirmarVagaDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $modulo    = $this->moduloModel->find($moduloId);
        $candidato = $this->inserirCandidato($modulo, $dados, $curriculo, 'Já existe um candidato com esse e-mail nesta vaga.');

        AtividadeService::registrar('candidato_adicionado', 'Adicionou o candidato “' . $dados['nome'] . '”', $moduloId);

        return $candidato;
    }

    public function baixarCurriculo(string $candidatoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $candidato = $this->buscarCandidatoBruto($candidatoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        if (empty($candidato['curriculo_chave'])) {
            throw new NaoEncontradoException('Este candidato não enviou currículo.');
        }

        return [
            'conteudo'      => service('storage')->obter($candidato['curriculo_chave']),
            'nome_original' => $candidato['curriculo_nome'] ?: 'curriculo',
            'tipo_mime'     => $candidato['curriculo_mime'] ?: 'application/octet-stream',
        ];
    }

    /**
     * Grava o candidato na primeira etapa da vaga, com o currículo se veio.
     * O arquivo sobe antes do insert; se o banco falhar, ele é apagado.
     */
    private function inserirCandidato(array $modulo, array $dados, ?UploadedFile $curriculo, string $mensagemDuplicado): array
    {
        $moduloId = $modulo['id'];

        if ($this->candidatoModel->where('modulo_id', $moduloId)->where('email', $dados['email'])->first()) {
            throw new \DomainException($mensagemDuplicado);
        }

        $primeiraFase = $this->faseRecrutamentoModel->where('modulo_id', $moduloId)->orderBy('ordem', 'ASC')->first();

        if (! $primeiraFase) {
            throw new \RuntimeException('Esta vaga ainda não tem nenhuma etapa configurada.');
        }

        $arquivo = $curriculo !== null && $curriculo->getError() !== UPLOAD_ERR_NO_FILE
            ? $this->salvarCurriculo($curriculo)
            : [];

        try {
            $candidatoId = $this->candidatoModel->insert([
                'modulo_id'     => $moduloId,
                'fase_atual_id' => $primeiraFase['id'],
                'nome'          => $dados['nome'],
                'email'         => $dados['email'],
                'telefone'      => ($dados['telefone'] ?? '') ?: null,
                'mensagem'      => ($dados['mensagem'] ?? '') ?: null,
            ] + $arquivo);
        } catch (\Throwable $e) {
            if (! empty($arquivo['curriculo_chave'])) {
                service('storage')->excluir($arquivo['curriculo_chave']);
            }

            throw $e;
        }

        Events::trigger('candidato_criado', [
            'modulo_id'      => $moduloId,
            'registro_id'    => null,
            'dados_registro' => CamposCandidato::dados($dados, $primeiraFase['nome']),
        ]);

        return $this->buscarCandidato($candidatoId, $moduloId, $modulo['empresa_id']);
    }

    /** @return array{curriculo_chave: string, curriculo_nome: string, curriculo_mime: string, curriculo_tamanho: int} */
    private function salvarCurriculo(UploadedFile $curriculo): array
    {
        // Acima do upload_max_filesize do PHP o arquivo nem chega: o erro vem do upload.
        if (in_array($curriculo->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
            throw new \DomainException('O currículo passa do tamanho permitido. Envie um arquivo menor.');
        }

        if (! $curriculo->isValid()) {
            throw new \DomainException('O currículo não chegou corretamente. Tente enviar de novo.');
        }

        $extensao = strtolower($curriculo->guessExtension() ?: $curriculo->getClientExtension());

        if (! in_array($extensao, self::CURRICULO_EXTENSOES, true)) {
            throw new \DomainException('Envie o currículo em PDF ou Word (.doc ou .docx).');
        }

        if ($curriculo->getSize() > self::CURRICULO_MAXIMO_BYTES) {
            throw new \DomainException('O currículo passa de 5 MB. Envie um arquivo menor.');
        }

        return [
            'curriculo_chave'   => service('storage')->salvar($curriculo->getTempName(), $extensao),
            'curriculo_nome'    => mb_substr($curriculo->getClientName(), 0, 255),
            'curriculo_mime'    => $curriculo->getMimeType(),
            'curriculo_tamanho' => $curriculo->getSize(),
        ];
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
                $kanban[$fase]['candidatos'][] = self::apresentar($candidato);
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
            $kanban[$chave]['candidatos'][] = self::apresentar($candidato);
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

        $nomes = array_column(
            $this->faseRecrutamentoModel->select('id, nome')->whereIn('id', [$candidato['fase_atual_id'], $novaFaseId])->findAll(),
            'nome',
            'id'
        );
        $etapaAnterior = $nomes[$candidato['fase_atual_id']] ?? null;
        $etapaNova     = $nomes[$novaFaseId] ?? null;

        Events::trigger('candidato_mudou_etapa', [
            'modulo_id'        => $moduloId,
            'registro_id'      => null,
            'dados_registro'   => CamposCandidato::dados($candidato, $etapaNova, $etapaAnterior),
            'dados_anteriores' => CamposCandidato::dados($candidato, $etapaAnterior),
        ]);

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
        return self::apresentar($this->buscarCandidatoBruto($candidatoId, $moduloId, $empresaId));
    }

    /** Linha do banco como está, com a chave do currículo (uso interno). */
    private function buscarCandidatoBruto(string $candidatoId, string $moduloId, string $empresaId): array
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
        $candidato = $this->buscarCandidatoBruto($candidatoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'editar');

        $this->candidatoModel->delete($candidatoId);

        if (! empty($candidato['curriculo_chave'])) {
            service('storage')->excluir($candidato['curriculo_chave']);
        }
    }

    /**
     * O que sai para a tela: a chave do storage nunca, só se há currículo e o
     * nome dele. "Cargo desejado" saiu do produto; a coluna antiga fica no banco.
     */
    private static function apresentar(array $candidato): array
    {
        $candidato['tem_curriculo'] = ! empty($candidato['curriculo_chave']);
        unset($candidato['curriculo_chave'], $candidato['curriculo_mime'], $candidato['cargo_desejado']);

        return $candidato;
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