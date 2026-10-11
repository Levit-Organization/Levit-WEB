<?php

namespace App\Services;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Models\AutomacaoModel;
use App\Models\AutomacaoAcaoModel;
use App\Models\CampoModuloModel;
use App\Models\ModuloModel;
use App\Models\AutomacaoLogModel;
use App\Models\RegistroModel;
use App\Services\Automacao\AutomacaoExecutor;
use App\Services\Automacao\CamposCandidato;
use App\Services\Automacao\Condicoes;
use App\Services\Automacao\ModulosComAutomacao;

class AutomacaoService
{
    /** Módulos de dados disparam com registros; vagas, com candidatos. */
    private const GATILHOS_REGISTRO = ['criacao', 'atualizacao', 'exclusao'];
    private const GATILHOS_VAGA     = ['candidato_criado', 'candidato_mudou_etapa'];
    private const GATILHOS_VALIDOS  = [...self::GATILHOS_REGISTRO, ...self::GATILHOS_VAGA];
    private const TIPOS_ACAO_VALIDOS = ['enviar_email', 'webhook', 'notificacao', 'atualizar_campo', 'criar_registro'];
    private const DESTINOS_NOTIFICACAO = ['todos', 'cargo', 'usuario', 'responsavel'];

    protected ModuloModel $moduloModel;
    protected CampoModuloModel $campoModuloModel;
    protected AutomacaoModel $automacaoModel;
    protected AutomacaoAcaoModel $automacaoAcaoModel;
    protected AutorizacaoModuloService $autorizacaoModuloService;
    protected AutomacaoLogModel $automacaoLogModel;
    protected RegistroModel $registroModel;

    public function __construct()
    {
        $this->moduloModel              = new ModuloModel();
        $this->campoModuloModel         = new CampoModuloModel();
        $this->automacaoModel           = new AutomacaoModel();
        $this->automacaoAcaoModel       = new AutomacaoAcaoModel();
        $this->autorizacaoModuloService = new AutorizacaoModuloService();
        $this->automacaoLogModel        = new AutomacaoLogModel();
        $this->registroModel            = new RegistroModel();
    }

    public function criarAutomacao(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, string $usuarioId, array $dados): array
    {
        $this->confirmarModuloDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $definicao = $this->validarDefinicao($moduloId, $empresaId, $dados);

        $db = db_connect();
        $db->transStart();

        ModulosComAutomacao::esquecer($moduloId);
        $automacaoId = $this->automacaoModel->insert([
            'modulo_id'  => $moduloId,
            'criado_por' => $usuarioId,
            'ativo'      => (bool) ($dados['ativo'] ?? true),
        ] + $definicao['campos']);

        $this->gravarAcoes($automacaoId, $definicao['acoes']);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível criar a automação. Tente novamente.');
        }

        $automacao = $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        AtividadeService::registrar('automacao_criada', "Criou a automação “{$automacao['nome']}”", $moduloId);

        return $automacao;
    }

    /**
     * Substitui a definição inteira (gatilhos, condição e ações) numa única
     * transação. O id e o histórico de execuções são preservados.
     */
    public function atualizarAutomacao(string $automacaoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $dados): array
    {
        $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $definicao = $this->validarDefinicao($moduloId, $empresaId, $dados);
        $campos    = $definicao['campos'];
        if (array_key_exists('ativo', $dados)) {
            $campos['ativo'] = (bool) $dados['ativo'];
            if ($campos['ativo']) {
                $campos['pausada_por_falhas_em'] = null;
            }
        }

        $db = db_connect();
        $db->transStart();

        ModulosComAutomacao::esquecer($moduloId);
        $this->automacaoModel->update($automacaoId, $campos);
        $this->automacaoAcaoModel->where('automacao_id', $automacaoId)->delete();
        $this->gravarAcoes($automacaoId, $definicao['acoes']);

        $db->transComplete();

        if ($db->transStatus() === false) {
            throw new \RuntimeException('Não foi possível salvar a automação. Tente novamente.');
        }

        $automacao = $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        AtividadeService::registrar('automacao_alterada', "Alterou a automação “{$automacao['nome']}”", $moduloId);

        return $automacao;
    }

    /**
     * Valida nome, gatilhos, condição e ações; devolve os campos prontos para
     * gravar e a lista de ações.
     *
     * @return array{campos: array, acoes: list<array>}
     */
    private function validarDefinicao(string $moduloId, string $empresaId, array $dados): array
    {
        $nome = trim((string) ($dados['nome'] ?? ''));
        if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) {
            throw new \DomainException('O nome precisa ter entre 2 e 100 caracteres.');
        }

        $ehVaga   = $this->tipoDoModulo($moduloId) === 'recrutamento';
        $gatilhos = $this->normalizarGatilhos($dados);

        $permitidos = $ehVaga ? self::GATILHOS_VAGA : self::GATILHOS_REGISTRO;
        foreach ($gatilhos as $gatilho) {
            if (! in_array($gatilho, $permitidos, true)) {
                throw new \DomainException($ehVaga
                    ? 'Em vagas, as automações disparam com candidatos (novo candidato ou mudança de etapa).'
                    : 'Gatilhos de candidato só existem em vagas de recrutamento.');
            }
        }

        $acoes = array_values($dados['acoes'] ?? []);
        if (empty($acoes)) {
            throw new \DomainException('A automação precisa de pelo menos uma ação.');
        }
        foreach ($acoes as $acao) {
            $this->validarAcao($acao, $empresaId, $moduloId, $ehVaga, $gatilhos);
        }

        return [
            'campos' => [
                'nome'      => $nome,
                'gatilho'   => $gatilhos[0], // legado: primeiro gatilho
                'gatilhos'  => $gatilhos,
                'condicoes' => $this->normalizarCondicoes($dados, $moduloId, $ehVaga, $gatilhos),
                // Formato antigo (condição única): substituído por `condicoes`.
                'campo_condicao_id' => null,
                'condicao_operador' => null,
                'condicao_valor'    => null,
                'condicao_valor_de' => null,
            ],
            'acoes' => $acoes,
        ];
    }

    /**
     * Aceita `condicoes` ({ logica, regras }) ou a condição única antiga
     * (campo_condicao_id...). Devolve null quando não há regras.
     */
    private function normalizarCondicoes(array $dados, string $moduloId, bool $ehVaga, array $gatilhos): ?array
    {
        $condicoes = $dados['condicoes'] ?? Condicoes::doFormatoAntigo($dados);
        $regras    = array_values($condicoes['regras'] ?? []);
        if ($regras === []) {
            return null;
        }

        $logica = $condicoes['logica'] ?? 'e';
        if (! in_array($logica, ['e', 'ou'], true)) {
            throw new \DomainException('Use "e" ou "ou" para combinar as condições.');
        }
        if (count($regras) > Condicoes::MAX_REGRAS) {
            throw new \DomainException('Use no máximo ' . Condicoes::MAX_REGRAS . ' condições.');
        }

        $camposValidos = $ehVaga
            ? array_keys(CamposCandidato::CAMPOS)
            : array_column($this->campoModuloModel->select('id')->where('modulo_id', $moduloId)->findAll(), 'id');
        $temAnterior = array_intersect($gatilhos, ['atualizacao', 'candidato_mudou_etapa']) !== [];

        $normalizadas = [];
        foreach ($regras as $i => $regra) {
            $n        = $i + 1;
            $campo    = (string) ($regra['campo'] ?? '');
            $operador = (string) ($regra['operador'] ?? '');
            $valor    = $regra['valor'] ?? null;
            $valorDe  = $regra['valor_de'] ?? null;

            if (! in_array($campo, $camposValidos, true)) {
                throw new \DomainException("Condição {$n}: escolha uma coluna desta tabela.");
            }
            if (! in_array($operador, Condicoes::OPERADORES, true)) {
                throw new \DomainException("Condição {$n}: operador inválido.");
            }
            if (Condicoes::exigeValor($operador) && ($valor === null || $valor === '')) {
                throw new \DomainException("Condição {$n}: informe o valor de comparação.");
            }
            if ($operador === 'mudou_de_para' && ($valorDe === null || $valorDe === '')) {
                throw new \DomainException("Condição {$n}: informe o valor de origem (\"mudou de\").");
            }
            if (in_array($operador, Condicoes::OPERADORES_DE_MUDANCA, true) && ! $temAnterior) {
                throw new \DomainException("Condição {$n}: condições de mudança precisam do gatilho \"" . ($ehVaga ? 'Mudou de etapa' : 'Atualização') . '".');
            }

            $normalizadas[] = [
                'campo'    => $campo,
                'operador' => $operador,
                'valor'    => Condicoes::exigeValor($operador) ? (string) $valor : null,
                'valor_de' => $operador === 'mudou_de_para' ? (string) $valorDe : null,
            ];
        }

        return ['logica' => $logica, 'regras' => $normalizadas];
    }

    private function tipoDoModulo(string $moduloId): ?string
    {
        return $this->moduloModel->select('tipo')->find($moduloId)['tipo'] ?? null;
    }

    private function gravarAcoes(string $automacaoId, array $acoes): void
    {
        foreach ($acoes as $ordem => $acao) {
            $this->automacaoAcaoModel->insert([
                'automacao_id' => $automacaoId,
                'tipo'         => $acao['tipo'],
                'configuracao' => $acao['configuracao'] ?? [],
                'ordem'        => $ordem,
            ]);
        }
    }

    /**
     * Aceita `gatilhos` (lista) ou `gatilho` (texto, formato antigo). Remove
     * repetidos e valida cada um; precisa sobrar pelo menos um.
     *
     * @return string[]
     */
    private function normalizarGatilhos(array $dados): array
    {
        $bruto = $dados['gatilhos'] ?? (isset($dados['gatilho']) ? [$dados['gatilho']] : []);
        if (! is_array($bruto)) {
            $bruto = [$bruto];
        }

        $gatilhos = array_values(array_unique($bruto));
        if ($gatilhos === []) {
            throw new \DomainException('Escolha pelo menos um gatilho.');
        }

        foreach ($gatilhos as $gatilho) {
            if (! is_string($gatilho) || ! in_array($gatilho, self::GATILHOS_VALIDOS, true)) {
                throw new \DomainException('Gatilho inválido: \'' . (is_scalar($gatilho) ? $gatilho : gettype($gatilho)) . '\'.');
            }
        }

        return $gatilhos;
    }

    /**
     * Linhas antigas (sem `gatilhos` ou `condicoes`) são devolvidas no formato
     * novo: a tela só precisa conhecer um formato.
     */
    private function comGatilhos(array $automacao): array
    {
        if (empty($automacao['gatilhos'])) {
            $automacao['gatilhos'] = [$automacao['gatilho']];
        }
        $automacao['condicoes'] = Condicoes::daAutomacao($automacao);

        return $automacao;
    }

    private function validarAcao(array $acao, string $empresaId, string $moduloId, bool $ehVaga, array $gatilhos): void
    {
        $tipo = $acao['tipo'] ?? null;
        if (! in_array($tipo, self::TIPOS_ACAO_VALIDOS, true)) {
            throw new \DomainException("Tipo de ação inválido: '{$tipo}'.");
        }

        $config = $acao['configuracao'] ?? [];

        if ($tipo === 'enviar_email' && ((empty($config['destinatario_campo_id']) && empty($config['destinatario'])) || empty($config['assunto']) || empty($config['corpo']))) {
            throw new \DomainException('Ação de e-mail precisa de destinatário, assunto e corpo.');
        }

        if ($tipo === 'webhook') {
            if (empty($config['url'])) {
                throw new \DomainException('Informe o endereço do outro sistema.');
            }
            (new Automacao\DestinoWebhook())->validarFormato((string) $config['url']);
        }

        if ($tipo === 'notificacao') {
            $this->validarNotificacao($config, $empresaId, $moduloId);
        }

        if (in_array($tipo, ['atualizar_campo', 'criar_registro'], true) && $ehVaga) {
            throw new \DomainException('Ações sobre itens não estão disponíveis em vagas.');
        }

        if ($tipo === 'atualizar_campo') {
            if (in_array('exclusao', $gatilhos, true)) {
                throw new \DomainException('"Atualizar coluna" não funciona com o gatilho "Exclusão": o item já não existe.');
            }
            if (empty($config['campo_id']) || ! $this->campoModuloModel->where('id', $config['campo_id'])->where('modulo_id', $moduloId)->first()) {
                throw new \DomainException('Escolha a coluna que será atualizada.');
            }
        }

        if ($tipo === 'criar_registro') {
            $this->validarCriacao($config, $empresaId);
        }
    }

    private function validarCriacao(array $config, string $empresaId): void
    {
        $destinoId = $config['modulo_destino_id'] ?? '';
        $destino   = $destinoId !== '' ? $this->moduloModel->where('id', $destinoId)->where('empresa_id', $empresaId)->first() : null;

        if (! $destino || $destino['tipo'] === 'recrutamento') {
            throw new \DomainException('Escolha uma tabela de dados para criar o item.');
        }

        // A automação grava no destino em nome de quem a criou: essa pessoa
        // precisa poder editar a tabela de destino.
        $usuario = service('authenticatedUser');
        if ($usuario->autenticado()) {
            try {
                $this->autorizacaoModuloService->exigirNivel($usuario->acessoTotal, $usuario->cargoId, $destinoId, 'editar');
            } catch (NaoEncontradoException|AcessoNegadoException) {
                throw new \DomainException('Você precisa poder editar a tabela de destino para criar itens nela.');
            }
        }

        $mapeamento = array_filter((array) ($config['mapeamento'] ?? []), static fn ($v) => $v !== null && $v !== '');
        if ($mapeamento === []) {
            throw new \DomainException('Preencha pelo menos uma coluna do novo item.');
        }

        $camposDestino = array_column($this->campoModuloModel->select('id')->where('modulo_id', $destinoId)->findAll(), 'id');
        if (array_diff(array_keys($mapeamento), $camposDestino) !== []) {
            throw new \DomainException('Alguma coluna do novo item não existe na tabela de destino.');
        }
    }

    private function validarNotificacao(array $config, string $empresaId, ?string $moduloId = null): void
    {
        $destino = $config['destinatarios'] ?? null;
        if (! in_array($destino, self::DESTINOS_NOTIFICACAO, true)) {
            throw new \DomainException('Escolha quem recebe a notificação.');
        }
        if (trim((string) ($config['titulo'] ?? '')) === '') {
            throw new \DomainException('A notificação precisa de um título.');
        }
        if (mb_strlen((string) $config['titulo']) > 200) {
            throw new \DomainException('O título da notificação pode ter no máximo 200 caracteres.');
        }

        if ($destino === 'todos') {
            return;
        }

        if ($destino === 'responsavel') {
            if ($moduloId === null || ! $this->campoModuloModel->where('modulo_id', $moduloId)->where('tipo', 'responsavel')->first()) {
                throw new \DomainException('Para avisar o responsável, a tabela precisa de uma coluna "Responsável".');
            }

            return;
        }

        $destinoId = $config['destino_id'] ?? '';
        $tabela    = $destino === 'cargo' ? 'cargo' : 'usuario';
        $existe    = $destinoId !== '' && db_connect()->table($tabela)->where('id', $destinoId)->where('empresa_id', $empresaId)->countAllResults() > 0;

        if (! $existe) {
            throw new \DomainException($destino === 'cargo' ? 'Cargo da notificação não encontrado.' : 'Pessoa da notificação não encontrada.');
        }
    }

    public function listarAutomacoes(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $this->confirmarModuloDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        return $this->completarParaListagem($this->consultaDeListagem()->where('automacao.modulo_id', $moduloId)->findAll());
    }

    /**
     * Automações de todos os módulos que o cargo enxerga, numa só chamada.
     * A tela de automações fazia uma requisição por módulo.
     */
    public function listarTodas(string $empresaId, string $cargoId, bool $acessoTotal): array
    {
        $modulos  = $this->moduloModel->select('id, nome, icone, tipo')->where('empresa_id', $empresaId)->findAll();
        $visiveis = $this->autorizacaoModuloService->filtrarModulosComNivel(array_column($modulos, 'id'), $acessoTotal, $cargoId, 'visualizar');
        if ($visiveis === []) {
            return [];
        }

        $porId      = array_column($modulos, null, 'id');
        $automacoes = $this->completarParaListagem(
            $this->consultaDeListagem()->whereIn('automacao.modulo_id', $visiveis)->orderBy('automacao.criado_em', 'ASC')->findAll()
        );

        foreach ($automacoes as &$automacao) {
            $automacao['modulo_nome']  = $porId[$automacao['modulo_id']]['nome'] ?? null;
            $automacao['modulo_icone'] = $porId[$automacao['modulo_id']]['icone'] ?? null;
        }
        unset($automacao);

        return $automacoes;
    }

    /**
     * Automações com as ações e as estatísticas da semana na mesma consulta
     * (antes eram três: automações, ações e estatísticas).
     */
    private function consultaDeListagem(): AutomacaoModel
    {
        $desde = db_connect()->escape(date('Y-m-d H:i:s', strtotime('-7 days')));

        return $this->automacaoModel
            ->select('automacao.*')
            ->select(
                "(SELECT COALESCE(json_agg(ac ORDER BY ac.ordem), '[]') FROM automacao_acao ac WHERE ac.automacao_id = automacao.id) AS acoes_json",
                false
            )
            ->select('est.execucoes_7d, est.falhas_7d, est.ultima_execucao_em', false)
            ->join(
                "LATERAL (SELECT
                    COUNT(*) FILTER (WHERE l.executado_em >= {$desde} AND l.status IN ('sucesso', 'erro')) AS execucoes_7d,
                    COUNT(*) FILTER (WHERE l.executado_em >= {$desde} AND l.status = 'erro') AS falhas_7d,
                    MAX(l.executado_em) AS ultima_execucao_em
                  FROM automacao_log l WHERE l.automacao_id = automacao.id) est",
                // Precisa de um operador: só "TRUE" o CodeIgniter transforma em USING (TRUE).
                'TRUE = TRUE',
                'left',
                false
            );
    }

    /** Gatilhos/condições normalizados e o formato de ações e estatísticas que a tela espera. */
    private function completarParaListagem(array $automacoes): array
    {
        foreach ($automacoes as &$automacao) {
            $acoes = json_decode((string) ($automacao['acoes_json'] ?? '[]'), true) ?: [];
            foreach ($acoes as &$acao) {
                if (is_string($acao['configuracao'] ?? null)) {
                    $acao['configuracao'] = json_decode($acao['configuracao'], true);
                }
            }
            unset($acao);

            $automacao                 = $this->comGatilhos($automacao);
            $automacao['acoes']        = $acoes;
            $automacao['estatisticas'] = [
                'execucoes_7d'       => (int) ($automacao['execucoes_7d'] ?? 0),
                'falhas_7d'          => (int) ($automacao['falhas_7d'] ?? 0),
                'ultima_execucao_em' => $automacao['ultima_execucao_em'] ?? null,
            ];
            unset($automacao['acoes_json'], $automacao['execucoes_7d'], $automacao['falhas_7d'], $automacao['ultima_execucao_em']);
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

        $automacao = $this->comGatilhos($automacao);
        $automacao['acoes'] = $this->automacaoAcaoModel
            ->where('automacao_id', $automacaoId)
            ->orderBy('ordem', 'ASC')
            ->findAll();

        return $automacao;
    }

    public function alternarAtivo(string $automacaoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, bool $ativo): array
    {
        $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        // Reativar manualmente limpa a marca de "pausada por falhas".
        ModulosComAutomacao::esquecer($moduloId);
        $this->automacaoModel->update($automacaoId, $ativo ? ['ativo' => true, 'pausada_por_falhas_em' => null] : ['ativo' => false]);

        $automacao = $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        AtividadeService::registrar($ativo ? 'automacao_ligada' : 'automacao_desligada', ($ativo ? 'Ligou' : 'Desligou') . " a automação “{$automacao['nome']}”", $moduloId);

        return $automacao;
    }

    public function excluirAutomacao(string $automacaoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $automacao = $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        ModulosComAutomacao::esquecer($moduloId);
        $this->automacaoModel->delete($automacaoId);
        AtividadeService::registrar('automacao_excluida', "Excluiu a automação “{$automacao['nome']}”", $moduloId);
    }

    /**
     * Execuções mais recentes primeiro, paginadas por cursor (`antes_de` = data
     * da última execução da página anterior).
     */
    public function listarExecucoes(string $automacaoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, ?string $antesDe, int $limite): array
    {
        $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'visualizar');

        $limite = max(1, min($limite, 100));
        $query  = $this->automacaoLogModel
            ->select('id, registro_id, status, detalhes, gatilho, tentativa, duracao_ms, passos, executado_em')
            ->where('automacao_id', $automacaoId);

        if ($antesDe) {
            $query->where('executado_em <', $antesDe);
        }

        // Busca um a mais para saber se existe próxima página sem um COUNT.
        $linhas    = $query->orderBy('executado_em', 'DESC')->orderBy('id', 'DESC')->limit($limite + 1)->findAll();
        $temMais   = count($linhas) > $limite;
        $execucoes = array_slice($linhas, 0, $limite);
        $ultima    = end($execucoes);

        return [
            'execucoes' => $execucoes,
            'proximo'   => $temMais && $ultima ? $ultima['executado_em'] : null,
        ];
    }

    /**
     * Mostra o que a automação faria, sem enviar nada. Aceita a definição ainda
     * não salva (formulário) e um registro real do módulo, dados avulsos, ou —
     * sem nenhum dos dois — o registro mais recente.
     */
    public function simular(string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal, array $entrada): array
    {
        $this->confirmarModuloDaEmpresa($moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        // O nome não importa no teste (e pode nem ter sido preenchido ainda).
        $definicao = $this->validarDefinicao($moduloId, $empresaId, ['nome' => 'Teste'] + ($entrada['automacao'] ?? []));

        if ($this->tipoDoModulo($moduloId) === 'recrutamento') {
            $dados = $this->candidatoDeExemplo($moduloId);

            return ['registro_id' => null, 'dados' => $dados]
                + (new AutomacaoExecutor())->simular(['modulo_id' => $moduloId] + $definicao['campos'], $definicao['acoes'], $dados, []);
        }

        $registro = null;
        if (! empty($entrada['registro_id'])) {
            $registro = $this->registroModel->where('id', $entrada['registro_id'])->where('modulo_id', $moduloId)->first();
            if (! $registro) {
                throw new NaoEncontradoException('Item não encontrado nesta tabela.');
            }
        } elseif (! isset($entrada['dados'])) {
            $registro = $this->registroModel->where('modulo_id', $moduloId)->orderBy('criado_em', 'DESC')->first();
        }

        $dados     = $registro['dados'] ?? (is_array($entrada['dados'] ?? null) ? $entrada['dados'] : []);
        $automacao = ['modulo_id' => $moduloId] + $definicao['campos'];

        // Condições de mudança precisam do valor anterior. Sem ele, o teste
        // considera que o campo estava vazio antes.
        $anteriores = is_array($entrada['dados_anteriores'] ?? null) ? $entrada['dados_anteriores'] : [];

        return [
            'registro_id' => $registro['id'] ?? null,
            'dados'       => $dados,
        ] + (new AutomacaoExecutor())->simular($automacao, $definicao['acoes'], $dados, $anteriores);
    }

    /** Coloca de novo na fila uma execução que falhou, com os mesmos dados. */
    public function reexecutar(string $execucaoId, string $automacaoId, string $moduloId, string $empresaId, string $cargoId, bool $acessoTotal): void
    {
        $automacao = $this->buscarAutomacao($automacaoId, $moduloId, $empresaId);
        $this->autorizacaoModuloService->exigirNivel($acessoTotal, $cargoId, $moduloId, 'gerenciar');

        $execucao = $this->automacaoLogModel->where('id', $execucaoId)->where('automacao_id', $automacaoId)->first();
        if (! $execucao) {
            throw new NaoEncontradoException('Execução não encontrada.');
        }
        if ($execucao['status'] !== 'erro') {
            throw new \DomainException('Só execuções com erro podem ser reexecutadas.');
        }
        if (! $automacao['ativo']) {
            throw new \DomainException('Ative a automação antes de reexecutar.');
        }

        service('queue')->push('automacoes', 'processar-automacoes', [
            'modulo_id'        => $moduloId,
            'gatilho'          => $execucao['gatilho'] ?? $automacao['gatilho'],
            'registro_id'      => $execucao['registro_id'],
            'dados_registro'   => $execucao['dados'] ?? [],
            'automacao_id'     => $automacaoId,
            'a_partir_da_acao' => 0,
            'tentativa'        => 1,
        ]);
    }

    /** Candidato mais recente da vaga, no formato do motor (ou campos vazios). */
    private function candidatoDeExemplo(string $moduloId): array
    {
        $db        = db_connect();
        $candidato = $db->table('candidato')->where('modulo_id', $moduloId)->orderBy('criado_em', 'DESC')->limit(1)->get()->getRowArray();
        if (! $candidato) {
            return CamposCandidato::dados([], null);
        }

        $fase = $db->table('fase_recrutamento')->select('nome')->where('id', $candidato['fase_atual_id'])->get()->getRowArray();

        return CamposCandidato::dados($candidato, $fase['nome'] ?? null);
    }

    private function confirmarModuloDaEmpresa(string $moduloId, string $empresaId): void
    {
        if (! $this->moduloModel->where('id', $moduloId)->where('empresa_id', $empresaId)->first()) {
            throw new NaoEncontradoException('Tabela não encontrada.');
        }
    }
}