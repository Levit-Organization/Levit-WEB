<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Libraries\Relogio;
use App\Services\Email\ModeloRelatorio;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Relatórios agendados: num dia da semana ou do mês, gera um PDF com tudo o
 * que foi feito na plataforma no período (e por quem) e manda por e-mail.
 *
 * O PDF é montado a partir do histórico de atividades, então qualquer período
 * pode ser gerado de novo depois (o histórico de envios guarda só o período).
 */
class RelatorioService
{
    public const FREQUENCIAS = ['diario', 'semanal', 'mensal'];

    /**
     * Partes que podem entrar no PDF, na ordem em que aparecem. As quatro
     * primeiras vêm do IndicadoresService (dados das tabelas); as outras, do
     * histórico de atividades.
     */
    public const SECOES = ['resumo', 'recrutamento', 'financeiro', 'prazos', 'atrasados', 'ranking', 'atividades'];

    /** Relatórios novos: tudo menos o ranking por pessoa (que soa como vigilância). */
    public const SECOES_PADRAO = ['resumo', 'recrutamento', 'financeiro', 'prazos', 'atrasados', 'atividades'];

    /** Relatórios criados antes da escolha de seções continuam como eram. */
    private const SECOES_LEGADO = ['atrasados', 'ranking', 'atividades'];

    private const DIAS_SEMANA = [1 => 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];

    /** Teto de linhas no PDF; acima disso o relatório avisa que foi resumido. */
    private const MAX_ATIVIDADES = 3000;

    // ------------------------------------------------------------------
    // Agenda
    // ------------------------------------------------------------------

    public function listar(string $empresaId): array
    {
        $db         = db_connect();
        $relatorios = $db->table('relatorio_agendado')->where('empresa_id', $empresaId)->orderBy('criado_em', 'ASC')->get()->getResultArray();
        if ($relatorios === []) {
            return [];
        }

        $ultimos = [];
        foreach ($db->query(
            'SELECT DISTINCT ON (relatorio_id) relatorio_id, status, enviado_em, total_atividades, erro
               FROM relatorio_envio WHERE relatorio_id IN ? ORDER BY relatorio_id, enviado_em DESC',
            [array_column($relatorios, 'id')]
        )->getResultArray() as $l) {
            $ultimos[$l['relatorio_id']] = $l;
        }

        return array_map(fn ($r) => $this->formatar($r, $ultimos[$r['id']] ?? null), $relatorios);
    }

    public function criar(string $empresaId, string $usuarioId, array $dados): array
    {
        $campos = $this->validar($empresaId, $dados);
        helper('uuid');
        $id = generate_uuid_v7();
        db_connect()->table('relatorio_agendado')->insert($campos + [
            'id'         => $id,
            'empresa_id' => $empresaId,
            'criado_por' => $usuarioId,
        ]);
        $linha = $this->buscar($empresaId, $id);

        AtividadeService::registrar('relatorio_criado', "Agendou o relatório “{$campos['nome']}”");

        return $this->formatar($linha, null);
    }

    public function atualizar(string $empresaId, string $relatorioId, array $dados): array
    {
        $this->buscar($empresaId, $relatorioId);
        $campos = $this->validar($empresaId, $dados);
        db_connect()->table('relatorio_agendado')->where('id', $relatorioId)->update($campos + ['atualizado_em' => gmdate('Y-m-d H:i:s')]);

        AtividadeService::registrar('relatorio_alterado', "Alterou o relatório “{$campos['nome']}”");

        return $this->formatar($this->buscar($empresaId, $relatorioId), null);
    }

    public function excluir(string $empresaId, string $relatorioId): void
    {
        $relatorio = $this->buscar($empresaId, $relatorioId);
        db_connect()->table('relatorio_agendado')->where('id', $relatorioId)->delete();
        AtividadeService::registrar('relatorio_excluido', "Excluiu o relatório “{$relatorio['nome']}”");
    }

    public function envios(string $empresaId, string $relatorioId): array
    {
        $this->buscar($empresaId, $relatorioId);

        return db_connect()->table('relatorio_envio')
            ->select('id, periodo_inicio, periodo_fim, total_atividades, status, erro, enviado_em')
            ->where('relatorio_id', $relatorioId)
            ->orderBy('enviado_em', 'DESC')
            ->limit(24)
            ->get()->getResultArray();
    }

    public function buscar(string $empresaId, string $relatorioId): array
    {
        $r = db_connect()->table('relatorio_agendado')->where('id', $relatorioId)->where('empresa_id', $empresaId)->get()->getRowArray();
        if (! $r) {
            throw new NaoEncontradoException('Relatório não encontrado.');
        }

        return $r;
    }

    private function validar(string $empresaId, array $dados): array
    {
        $nome = trim((string) ($dados['nome'] ?? ''));
        if ($nome === '' || mb_strlen($nome) > 100) {
            throw new \DomainException('Dê um nome ao relatório (até 100 caracteres).');
        }

        $frequencia = $dados['frequencia'] ?? '';
        if (! in_array($frequencia, self::FREQUENCIAS, true)) {
            throw new \DomainException('Escolha se o relatório é diário, semanal ou mensal.');
        }

        $dia = $frequencia === 'diario' ? 1 : (int) ($dados['dia'] ?? 0);
        if ($frequencia === 'semanal' && ($dia < 1 || $dia > 7)) {
            throw new \DomainException('Escolha o dia da semana do envio.');
        }
        if ($frequencia === 'mensal' && ($dia < 1 || $dia > 28)) {
            throw new \DomainException('Escolha um dia do mês entre 1 e 28 (assim todo mês tem esse dia).');
        }

        $destinatarios = array_values(array_unique(array_filter((array) ($dados['destinatarios'] ?? []), 'is_string')));
        if ($destinatarios === []) {
            throw new \DomainException('Escolha quem recebe o relatório.');
        }
        $validos = db_connect()->table('usuario')->select('id')->where('empresa_id', $empresaId)->whereIn('id', array_filter(
            $destinatarios,
            static fn ($id) => preg_match('/^[0-9a-f-]{36}$/i', $id)
        ) ?: ['00000000-0000-0000-0000-000000000000'])->get()->getResultArray();
        if (count($validos) !== count($destinatarios)) {
            throw new \DomainException('Algum destinatário não é da equipe.');
        }

        if (array_key_exists('secoes', $dados) && array_filter((array) $dados['secoes'], static fn ($s) => in_array($s, self::SECOES, true)) === []) {
            throw new \DomainException('Escolha ao menos uma parte para o relatório.');
        }
        $secoes = self::secoesValidas($dados['secoes'] ?? self::SECOES_PADRAO);

        return [
            'nome'          => $nome,
            'frequencia'    => $frequencia,
            'dia'           => $dia,
            'destinatarios' => json_encode($destinatarios),
            'secoes'        => json_encode($secoes),
            'ativo'         => ! array_key_exists('ativo', $dados) || (bool) $dados['ativo'],
        ];
    }

    /** Filtra e ordena as seções pedidas; lista vazia ou inválida vira o padrão. */
    public static function secoesValidas(mixed $secoes): array
    {
        $pedidas = array_filter((array) $secoes, 'is_string');
        $validas = array_values(array_filter(self::SECOES, static fn ($s) => in_array($s, $pedidas, true)));

        return $validas === [] ? self::SECOES_PADRAO : $validas;
    }

    /** Seções gravadas no relatório agendado (nulo = criado antes da escolha de seções). */
    public static function secoesDoRelatorio(array $r): array
    {
        $gravadas = is_string($r['secoes'] ?? null) ? json_decode($r['secoes'], true) : ($r['secoes'] ?? null);

        return is_array($gravadas) && $gravadas !== [] ? self::secoesValidas($gravadas) : self::SECOES_LEGADO;
    }

    private function formatar(array $r, ?array $ultimoEnvio): array
    {
        $r['destinatarios'] = is_string($r['destinatarios']) ? (json_decode($r['destinatarios'], true) ?: []) : ($r['destinatarios'] ?? []);
        $r['ativo']         = in_array($r['ativo'], [true, 1, '1', 't', 'true'], true);
        $r['dia']           = (int) $r['dia'];
        $r['secoes']        = self::secoesDoRelatorio($r);
        $r['descricao_agenda'] = self::descreverAgenda($r['frequencia'], $r['dia']);
        $r['proximo_envio']    = $r['ativo'] ? self::proximaData($r['frequencia'], $r['dia'], Relogio::hoje(), $r['ultimo_envio_em'] ?? null) : null;
        $r['ultimo_envio']     = $ultimoEnvio;

        return $r;
    }

    public static function descreverAgenda(string $frequencia, int $dia): string
    {
        return match ($frequencia) {
            'diario'  => 'Todo dia',
            'semanal' => 'Toda ' . self::DIAS_SEMANA[$dia],
            default   => "Todo dia {$dia} do mês",
        };
    }

    /** Última data agendada que já chegou (hoje incluso). */
    public static function ultimaDataAgendada(string $frequencia, int $dia, string $hoje): string
    {
        $d = new \DateTimeImmutable($hoje);
        if ($frequencia === 'diario') {
            return $hoje;
        }
        if ($frequencia === 'semanal') {
            $diff = ((int) $d->format('N') - $dia + 7) % 7;

            return $d->modify("-{$diff} days")->format('Y-m-d');
        }
        $esteMes = $d->setDate((int) $d->format('Y'), (int) $d->format('m'), $dia);

        return ($esteMes <= $d ? $esteMes : $esteMes->modify('-1 month'))->format('Y-m-d');
    }

    /**
     * Devido quando a data agendada mais recente já chegou e ainda não houve
     * envio desde ela (se o cron falhar um dia, envia no seguinte).
     */
    public static function estaDevido(string $frequencia, int $dia, string $hoje, ?string $ultimoEnvioUtc, string $criadoEmUtc): bool
    {
        $agendada = self::ultimaDataAgendada($frequencia, $dia, $hoje);
        $desde    = $ultimoEnvioUtc ?? $criadoEmUtc;

        return Relogio::local($desde)->format('Y-m-d') < $agendada;
    }

    public static function proximaData(string $frequencia, int $dia, string $hoje, ?string $ultimoEnvioUtc): string
    {
        $ultima = self::ultimaDataAgendada($frequencia, $dia, $hoje);
        $jaFoi  = $ultimoEnvioUtc !== null && Relogio::local($ultimoEnvioUtc)->format('Y-m-d') >= $ultima;
        if ($ultima === $hoje && ! $jaFoi) {
            return $hoje;
        }

        $passo = ['diario' => '+1 day', 'semanal' => '+7 days'][$frequencia] ?? '+1 month';

        return (new \DateTimeImmutable($ultima))->modify($passo)->format('Y-m-d');
    }

    /** Período coberto por um envio na data `$hoje`: o dia, os 7 dias ou o mês anteriores. */
    public static function periodo(string $frequencia, string $hoje): array
    {
        $fim    = new \DateTimeImmutable($hoje . ' 00:00:00', Relogio::fuso());
        $inicio = $fim->modify(['diario' => '-1 day', 'semanal' => '-7 days'][$frequencia] ?? '-1 month');

        return [$inicio, $fim];
    }

    // ------------------------------------------------------------------
    // Envio
    // ------------------------------------------------------------------

    /** Gera e envia um relatório agendado. Registra o envio (com sucesso ou erro). */
    public function enviar(array $relatorio, string $hoje): array
    {
        [$inicio, $fim] = self::periodo($relatorio['frequencia'], $hoje);
        $db             = db_connect();
        $registro       = [
            'relatorio_id'   => $relatorio['id'],
            'periodo_inicio' => $inicio->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'periodo_fim'    => $fim->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
        ];

        try {
            $pdf     = $this->gerarPdf($relatorio['empresa_id'], $inicio, $fim, $relatorio['nome'], self::secoesDoRelatorio($relatorio));
            $ids     = is_string($relatorio['destinatarios']) ? (json_decode($relatorio['destinatarios'], true) ?: []) : $relatorio['destinatarios'];
            $pessoas = $ids === [] ? [] : $db->table('usuario')->select('email')->where('empresa_id', $relatorio['empresa_id'])->whereIn('id', $ids)->get()->getResultArray();
            if ($pessoas === []) {
                throw new \DomainException('Nenhum destinatário continua na equipe.');
            }

            $periodo = self::textoDoPeriodo($inicio, $fim);
            $corpo   = ModeloRelatorio::html([
                'nome_relatorio' => $relatorio['nome'],
                'empresa'        => $pdf['empresa'],
                'periodo'        => $periodo,
                'total'          => $pdf['total'],
                'pessoas'        => $pdf['pessoas'],
                'link'           => rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/relatorios',
            ]);
            $anexo = ['nome' => self::nomeDoArquivo($relatorio['nome'], $fim), 'conteudo' => $pdf['conteudo']];

            foreach ($pessoas as $p) {
                service('email')->enviar($p['email'], ModeloRelatorio::assunto($relatorio['nome'], $periodo), $corpo, [$anexo]);
            }

            $registro += ['status' => 'enviado', 'total_atividades' => $pdf['total']];
        } catch (\Throwable $e) {
            log_message('error', 'Relatório {id} não foi enviado: {erro}', ['id' => $relatorio['id'], 'erro' => $e->getMessage()]);
            $registro += ['status' => 'erro', 'erro' => mb_substr($e->getMessage(), 0, 500), 'total_atividades' => 0];
        }

        $db->table('relatorio_envio')->insert($registro);
        // Mesmo com erro marca o envio: não tenta de novo a cada execução da rotina no mesmo dia.
        $db->table('relatorio_agendado')->where('id', $relatorio['id'])->update(['ultimo_envio_em' => gmdate('Y-m-d H:i:s')]);

        return $registro;
    }

    public static function textoDoPeriodo(\DateTimeImmutable $inicio, \DateTimeImmutable $fim): string
    {
        // O fim é exclusivo (meia-noite do dia do envio): mostra o dia anterior.
        if ($inicio->diff($fim)->days === 1) {
            return $inicio->format('d/m/Y');
        }

        return $inicio->format('d/m/Y') . ' a ' . $fim->modify('-1 day')->format('d/m/Y');
    }

    public static function nomeDoArquivo(string $nome, \DateTimeImmutable $fim): string
    {
        $base = trim(preg_replace('/[^A-Za-z0-9]+/', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $nome) ?: 'relatorio'), '-') ?: 'relatorio';

        return strtolower($base) . '-' . $fim->modify('-1 day')->format('Y-m-d') . '.pdf';
    }

    // ------------------------------------------------------------------
    // PDF
    // ------------------------------------------------------------------

    /**
     * @return array{conteudo: string, total: int, pessoas: int, empresa: string}
     */
    public function gerarPdf(string $empresaId, \DateTimeImmutable $inicio, \DateTimeImmutable $fim, string $titulo, ?array $secoes = null): array
    {
        $secoes = $secoes ?? self::SECOES_PADRAO;
        $db  = db_connect();
        $utc = new \DateTimeZone('UTC');

        $empresa = $db->table('empresa')->select('nome')->where('id', $empresaId)->get()->getRowArray()['nome'] ?? '';

        $atividades = $db->table('atividade')
            ->select('usuario_nome, acao, modulo_nome, descricao, criado_em')
            ->where('empresa_id', $empresaId)
            ->where('criado_em >=', $inicio->setTimezone($utc)->format('Y-m-d H:i:s'))
            ->where('criado_em <', $fim->setTimezone($utc)->format('Y-m-d H:i:s'))
            ->orderBy('criado_em', 'ASC')
            ->orderBy('id', 'ASC')
            ->limit(self::MAX_ATIVIDADES + 1)
            ->get()->getResultArray();

        $cortado = count($atividades) > self::MAX_ATIVIDADES;
        $atividades = array_slice($atividades, 0, self::MAX_ATIVIDADES);

        // Situação dos prazos no momento da geração.
        $prazos  = new PrazoService();
        $modulos = $prazos->modulosDeDados($empresaId);
        $hoje    = Relogio::hoje();
        $abertos = $prazos->comNomesDosResponsaveis(
            $prazos->itensEmAberto($modulos, array_column($modulos, 'id'), $hoje, 0),
            $empresaId
        );

        $html = self::htmlDoRelatorio([
            'titulo'     => $titulo,
            'empresa'    => $empresa,
            'periodo'    => self::textoDoPeriodo($inicio, $fim),
            'gerado_em'  => Relogio::agora()->format('d/m/Y \à\s H:i'),
            'atividades' => $atividades,
            'cortado'    => $cortado,
            'atrasados'  => array_values(array_filter($abertos, static fn ($i) => $i['prazo'] < $hoje)),
            'hoje'       => $hoje,
            'secoes'     => $secoes,
            'indicadores' => array_intersect($secoes, ['resumo', 'recrutamento', 'financeiro', 'prazos']) === []
                ? null
                : (new IndicadoresService())->painel($empresaId, $inicio, $fim),
        ]);

        $conteudo = self::renderizar($html);

        return [
            'conteudo' => $conteudo,
            'total'    => count($atividades),
            'pessoas'  => count(array_unique(array_filter(array_column($atividades, 'usuario_nome')))),
            'empresa'  => $empresa,
        ];
    }

    /** HTML → PDF (A4), com "Página X de Y" no rodapé de todas as páginas. */
    public static function renderizar(string $html): string
    {
        $opcoes = new Options();
        $opcoes->set('defaultFont', 'DejaVu Sans');
        $opcoes->set('isRemoteEnabled', false);
        $opcoes->set('isPhpEnabled', false);
        if (defined('WRITEPATH')) {
            $opcoes->set('tempDir', WRITEPATH . 'cache');
            $opcoes->set('fontCache', WRITEPATH . 'cache');
        }

        $dompdf = new Dompdf($opcoes);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        $canvas = $dompdf->getCanvas();
        $fonte  = $dompdf->getFontMetrics()->getFont('DejaVu Sans');
        $canvas->page_text($canvas->get_width() - 105, $canvas->get_height() - 34, 'Página {PAGE_NUM} de {PAGE_COUNT}', $fonte, 7, [0.54, 0.53, 0.61]);

        return (string) $dompdf->output();
    }

    /** HTML do PDF (público para testar sem gerar o arquivo). */
    public static function htmlDoRelatorio(array $d): string
    {
        $e = static fn ($t) => htmlspecialchars((string) $t, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $porPessoa = [];
        $porTabela = [];
        $porDia    = [];
        foreach ($d['atividades'] as $a) {
            $quem = $a['usuario_nome'] ?: 'Sistema';
            $porPessoa[$quem] = ($porPessoa[$quem] ?? 0) + 1;
            if ($a['modulo_nome']) {
                $porTabela[$a['modulo_nome']] = ($porTabela[$a['modulo_nome']] ?? 0) + 1;
            }
            $local = Relogio::local($a['criado_em']);
            $porDia[$local->format('Y-m-d')][] = $a + ['hora' => $local->format('H:i')];
        }
        arsort($porPessoa);
        arsort($porTabela);

        $total   = count($d['atividades']);
        $pessoas = count(array_filter(array_keys($porPessoa), static fn ($p) => ! in_array($p, ['Sistema', 'Automação', 'Formulário de candidatura'], true)));

        $ranking = static function (array $contagem, string $vazio, ?callable $formato = null) use ($e): string {
            if ($contagem === []) {
                return '<p class="muted">' . $e($vazio) . '</p>';
            }
            $max    = max($contagem) ?: 1;
            $linhas = '';
            foreach (array_slice($contagem, 0, 8, true) as $nome => $n) {
                $largura = max(4, (int) round($n / $max * 100));
                $linhas .= '<tr><td class="rank-nome">' . $e($nome) . '</td><td class="rank-barra"><div style="width:' . $largura . '%"></div></td><td class="rank-n">' . $e($formato ? $formato($n) : $n) . '</td></tr>';
            }

            return '<table class="rank">' . $linhas . '</table>';
        };

        $diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        $secoesDias = '';
        foreach ($porDia as $data => $itens) {
            $dt = new \DateTimeImmutable($data);
            $linhas = '';
            foreach ($itens as $a) {
                $linhas .= '<tr><td class="hora">' . $e($a['hora']) . '</td><td class="quem">' . $e($a['usuario_nome'] ?: 'Sistema') . '</td><td>'
                    . $e($a['descricao']) . ($a['modulo_nome'] ? '<div class="onde">' . $e($a['modulo_nome']) . '</div>' : '') . '</td></tr>';
            }
            $secoesDias .= '<h3>' . $e(ucfirst($diasSemana[(int) $dt->format('w')]) . ', ' . $dt->format('d/m/Y')) . ' <span class="muted">· ' . count($itens) . '</span></h3>'
                . '<table class="lista"><thead><tr><th class="hora">Hora</th><th class="quem">Quem</th><th>O que foi feito</th></tr></thead><tbody>' . $linhas . '</tbody></table>';
        }
        if ($secoesDias === '') {
            $secoesDias = '<p class="muted">Nenhuma atividade registrada neste período.</p>';
        }

        $atrasados = '';
        foreach (array_slice($d['atrasados'], 0, 20) as $i) {
            $dias = (new \DateTimeImmutable($i['prazo']))->diff(new \DateTimeImmutable($d['hoje']))->days;
            $atrasados .= '<tr><td>' . $e($i['titulo'] ?: 'Item sem título') . '<div class="onde">' . $e($i['modulo_nome']) . '</div></td><td>'
                . $e($i['responsavel_nome'] ?: 'Sem responsável') . '</td><td class="atraso">' . ($dias === 1 ? '1 dia' : "{$dias} dias") . '</td></tr>';
        }
        $blocoPrazos = $d['atrasados'] === []
            ? '<p class="muted">Nenhum item atrasado no momento em que o relatório foi gerado.</p>'
            : '<table class="lista"><thead><tr><th>Item</th><th class="quem">Responsável</th><th class="hora">Atraso</th></tr></thead><tbody>' . $atrasados . '</tbody></table>'
                . (count($d['atrasados']) > 20 ? '<p class="muted">e mais ' . (count($d['atrasados']) - 20) . ' itens atrasados.</p>' : '');

        $aviso = $d['cortado'] ? '<p class="aviso">O período teve mais de ' . self::MAX_ATIVIDADES . ' atividades; o relatório mostra as primeiras.</p>' : '';

        $corpo = '';
        foreach ($d['secoes'] ?? self::SECOES_LEGADO as $secao) {
            $corpo .= match ($secao) {
                'resumo', 'recrutamento', 'financeiro', 'prazos' => isset($d['indicadores']) ? self::htmlDosIndicadores($secao, $d['indicadores'], $ranking) : '',
                'atrasados'  => '<h2>Itens atrasados agora</h2>' . $blocoPrazos,
                'ranking'    => '<table class="colunas"><tr>
  <td><h2>Quem mais fez</h2>' . $ranking($porPessoa, 'Ninguém registrou atividades.') . '</td>
  <td><h2>Onde mais mexeram</h2>' . $ranking($porTabela, 'Nenhuma tabela movimentada.') . '</td>
</tr></table>',
                'atividades' => '<h2>Tudo o que foi feito</h2>' . $aviso . $secoesDias,
                default      => '',
            };
        }

        return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { margin: 22mm 16mm 18mm; }
  body { font-family: "DejaVu Sans", sans-serif; font-size: 9.5pt; color: #24223A; }
  .rodape { position: fixed; bottom: -11mm; left: 0; right: 30mm; font-size: 7.5pt; color: #8A879C; }
  .marca { font-size: 10pt; font-weight: bold; color: #534BAF; letter-spacing: .5px; }
  h1 { font-size: 20pt; margin: 4px 0 2px; color: #15132A; }
  h2 { font-size: 12pt; margin: 22px 0 8px; color: #15132A; border-bottom: 1.5px solid #15132A; padding-bottom: 4px; }
  h3 { font-size: 10pt; margin: 16px 0 6px; color: #15132A; }
  h2, h3 { page-break-after: avoid; }
  .sub { color: #5D5A72; margin: 0; }
  .muted { color: #8A879C; font-weight: normal; }
  .numeros { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 18px -8px 0; }
  .numeros td { background: #F3F2FA; border-radius: 6px; padding: 10px 12px; width: 25%; }
  .numeros .n { font-size: 18pt; font-weight: bold; color: #534BAF; display: block; }
  .numeros .r { font-size: 8pt; color: #5D5A72; }
  .colunas { width: 100%; border-collapse: collapse; }
  .colunas > tbody > tr > td { width: 50%; vertical-align: top; padding-right: 14px; }
  .rank { width: 100%; border-collapse: collapse; }
  .rank td { padding: 3px 0; font-size: 8.5pt; }
  .rank-nome { width: 42%; padding-right: 6px; }
  .rank-barra div { height: 7px; background: #8D86D9; border-radius: 3px; }
  .rank-n { width: 90px; text-align: right; color: #5D5A72; }
  .lista { width: 100%; border-collapse: collapse; }
  .lista th { text-align: left; font-size: 7.5pt; color: #8A879C; font-weight: normal; border-bottom: 1px solid #DDDBEA; padding: 4px 6px 4px 0; }
  .lista td { border-bottom: 1px solid #EEEDF5; padding: 5px 6px 5px 0; vertical-align: top; }
  .lista .hora { width: 38px; color: #5D5A72; }
  .lista .quem { width: 120px; font-weight: bold; }
  .onde { font-size: 7.5pt; color: #8A879C; margin-top: 1px; }
  .atraso { color: #B42318; font-weight: bold; width: 55px; }
  .aviso { background: #FFF6E5; color: #8A5A00; padding: 6px 8px; border-radius: 4px; }
  .lista .num { text-align: right; width: 95px; }
  .bom { color: #067647; font-weight: bold; }
  .ruim { color: #B42318; font-weight: bold; }
</style></head><body>
<div class="rodape">' . $e($d['empresa']) . ' · ' . $e($d['titulo']) . ' · gerado em ' . $e($d['gerado_em']) . '</div>
<div class="marca">LEVIT</div>
<h1>' . $e($d['titulo']) . '</h1>
<p class="sub">' . $e($d['empresa']) . ' · ' . $e($d['periodo']) . '</p>
<table class="numeros"><tr>
  <td><span class="n">' . $total . '</span><span class="r">atividades no período</span></td>
  <td><span class="n">' . $pessoas . '</span><span class="r">' . ($pessoas === 1 ? 'pessoa ativa' : 'pessoas ativas') . '</span></td>
  <td><span class="n">' . count($porTabela) . '</span><span class="r">' . (count($porTabela) === 1 ? 'tabela movimentada' : 'tabelas movimentadas') . '</span></td>
  <td><span class="n">' . count($d['atrasados']) . '</span><span class="r">' . (count($d['atrasados']) === 1 ? 'item atrasado hoje' : 'itens atrasados hoje') . '</span></td>
</tr></table>
' . $corpo . '
</body></html>';
    }

    public static function numero(float|int $n, int $casas = 0): string
    {
        return number_format((float) $n, $casas, ',', '.');
    }

    public static function moeda(float|int $n): string
    {
        return ($n < 0 ? '-' : '') . 'R$ ' . number_format(abs((float) $n), 2, ',', '.');
    }

    /**
     * "+12%" em verde ou vermelho, conforme subir seja bom ou ruim. Sem base de
     * comparação (anterior zero), mostra "novo".
     */
    public static function htmlDaVariacao(array $comparacao, bool $subirEBom = true): string
    {
        $v = $comparacao['variacao'];
        if ($v === null) {
            return '<span class="muted">novo</span>';
        }
        if ((float) $v === 0.0) {
            return '<span class="muted">igual</span>';
        }
        $classe = ($v > 0) === $subirEBom ? 'bom' : 'ruim';

        return '<span class="' . $classe . '">' . ($v > 0 ? '+' : '') . self::numero($v, abs($v) < 10 && floor($v) != $v ? 1 : 0) . '%</span>';
    }

    /** Uma seção de indicadores (dados das tabelas) no PDF. */
    public static function htmlDosIndicadores(string $secao, array $ind, callable $ranking): string
    {
        $e     = static fn ($t) => htmlspecialchars((string) $t, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $linha = static fn (string $rotulo, array $c, bool $bom = true, ?callable $f = null) => '<tr><td>' . $e($rotulo) . '</td><td class="num">'
            . $e($f ? $f($c['atual']) : self::numero($c['atual'])) . '</td><td class="num muted">' . $e($f ? $f($c['anterior']) : self::numero($c['anterior']))
            . '</td><td class="num">' . self::htmlDaVariacao($c, $bom) . '</td></tr>';
        $cabecalho = '<table class="lista"><thead><tr><th></th><th class="num">Neste período</th><th class="num">Anterior</th><th class="num">Variação</th></tr></thead><tbody>';
        $anterior  = (new \DateTimeImmutable($ind['periodo_anterior']['inicio']))->format('d/m/Y') . ' a ' . (new \DateTimeImmutable($ind['periodo_anterior']['fim']))->format('d/m/Y');

        switch ($secao) {
            case 'resumo':
                $r = $ind['resumo'];

                return '<h2>Comparado ao período anterior</h2><p class="muted">Período anterior: ' . $e($anterior) . '</p>' . $cabecalho
                    . $linha('Atividades na plataforma', $r['atividades'])
                    . $linha('Pessoas ativas', $r['pessoas_ativas'])
                    . $linha('Itens criados nas tabelas', $r['itens_criados'])
                    . $linha('Candidatos inscritos', $r['candidatos'])
                    . '</tbody></table>';

            case 'recrutamento':
                if ($ind['recrutamento'] === []) {
                    return '';
                }
                $html = '<h2>Recrutamento</h2>';
                foreach ($ind['recrutamento'] as $vaga) {
                    $max    = max(1, ...array_map(static fn ($f) => (int) ($f['chegaram'] ?? 0), $vaga['fases'] ?: [['chegaram' => 0]]));
                    $linhas = '';
                    foreach ($vaga['fases'] as $f) {
                        $barra = $f['saida'] ? '<span class="muted">saída</span>'
                            : '<div style="width:' . max(2, (int) round(($f['chegaram'] ?? 0) / $max * 100)) . '%"></div>';
                        $linhas .= '<tr><td>' . $e($f['nome']) . '</td><td class="num">' . $f['atual'] . '</td><td class="rank-barra" style="width:30%">' . $barra
                            . '</td><td class="num">' . ($f['saida'] ? '—' : (int) $f['chegaram']) . '</td><td class="num">'
                            . ($f['dias_medios'] === null ? '—' : $e(self::numero($f['dias_medios'], 1) . ' dias')) . '</td></tr>';
                    }
                    $html .= '<h3>' . $e($vaga['nome']) . ' <span class="muted">· ' . $vaga['total'] . ' candidatos no total</span></h3>'
                        . $cabecalho
                        . $linha('Inscritos', $vaga['inscritos'])
                        . $linha('Chegaram à última etapa', $vaga['concluidos'])
                        . $linha('Saíram do processo', $vaga['sairam'], false)
                        . '</tbody></table>'
                        . ($vaga['parados'] > 0 ? '<p class="aviso">' . $vaga['parados'] . ' candidato(s) parado(s) na mesma etapa há mais de ' . IndicadoresService::DIAS_PARADO . ' dias.</p>' : '')
                        . '<table class="lista"><thead><tr><th>Etapa</th><th class="num">Agora</th><th colspan="2">Inscritos no período que chegaram até aqui</th><th class="num">Tempo médio</th></tr></thead><tbody>'
                        . $linhas . '</tbody></table>';
                }

                return $html;

            case 'financeiro':
                if ($ind['financeiro'] === []) {
                    return '';
                }
                $html = '<h2>Financeiro</h2>';
                foreach ($ind['financeiro'] as $fin) {
                    $html .= '<h3>' . $e($fin['nome']) . '</h3>' . $cabecalho
                        . $linha('Entradas', $fin['entradas'], true, [self::class, 'moeda'])
                        . $linha('Saídas', $fin['saidas'], false, [self::class, 'moeda'])
                        . $linha('Saldo', $fin['saldo'], true, [self::class, 'moeda'])
                        . '</tbody></table>'
                        . '<h3>Saídas por categoria</h3>'
                        . $ranking(array_column($fin['saidas_por_categoria'], 'total', 'categoria'), 'Nenhuma saída no período.', [self::class, 'moeda']);
                }

                return $html;

            case 'prazos':
                $p    = $ind['prazos'];
                $taxa = $p['taxa_conclusao'];

                return '<h2>Prazos</h2>' . $cabecalho
                    . $linha('Prazos que venceram no período', $p['vencendo'])
                    . $linha('Desses, já concluídos', $p['concluidos'])
                    . '</tbody></table>'
                    . '<p>Taxa de conclusão: <b>' . ($taxa['atual'] === null ? '—' : $taxa['atual'] . '%') . '</b>'
                    . ($taxa['anterior'] === null ? '' : ' <span class="muted">(período anterior: ' . $taxa['anterior'] . '%)</span>')
                    . ' · ' . $p['atrasados_agora'] . ' item(ns) atrasado(s) agora.</p>'
                    . '<h3>Atrasados por responsável</h3>'
                    . $ranking(array_column($p['atrasados_por_responsavel'], 'total', 'responsavel'), 'Nenhum item atrasado.');
        }

        return '';
    }
}
