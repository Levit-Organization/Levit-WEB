<?php

namespace App\Services;

use App\Exceptions\NaoEncontradoException;
use App\Models\ArquivoModel;
use App\Models\ModuloModel;
use App\Models\RegistroModel;
use CodeIgniter\HTTP\Files\UploadedFile;

class ArquivoService
{
    private const EXTENSOES_PERMITIDAS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'csv'];
    private const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

    protected ModuloModel $moduloModel;
    protected RegistroModel $registroModel;
    protected ArquivoModel $arquivoModel;

    public function __construct()
    {
        $this->moduloModel   = new ModuloModel();
        $this->registroModel = new RegistroModel();
        $this->arquivoModel  = new ArquivoModel();
    }

    /**
     * Faz upload de um arquivo, criando o registro e o arquivo
     * vinculado numa única transação.
     */
    public function enviarArquivo(string $moduloId, string $empresaId, string $usuarioId, UploadedFile $arquivo): array
    {
        $modulo = $this->moduloModel
            ->where('id', $moduloId)
            ->where('empresa_id', $empresaId)
            ->where('tipo', 'arquivo')
            ->first();

        if (! $modulo) {
            throw new NaoEncontradoException('Módulo de arquivo não encontrado.');
        }

        if (! $arquivo->isValid()) {
            throw new \DomainException('O arquivo enviado é inválido ou não chegou corretamente.');
        }

        $extensao = strtolower($arquivo->guessExtension());

        if (! in_array($extensao, self::EXTENSOES_PERMITIDAS, true)) {
            throw new \DomainException('Tipo de arquivo não permitido.');
        }

        if ($arquivo->getSize() > self::TAMANHO_MAXIMO_BYTES) {
            throw new \DomainException('O arquivo excede o tamanho máximo permitido (10MB).');
        }

        $chave = service('storage')->salvar($arquivo->getTempName(), $extensao);

        $db = db_connect();
        $db->transStart();

        $registroId = $this->registroModel->insert([
            'modulo_id'  => $moduloId,
            'dados'      => [],
            'criado_por' => $usuarioId,
        ]);

        $this->arquivoModel->insert([
            'registro_id'         => $registroId,
            'nome_original'       => $arquivo->getClientName(),
            'chave_armazenamento' => $chave,
            'tipo_mime'           => $arquivo->getMimeType(),
            'tamanho_bytes'       => $arquivo->getSize(),
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            service('storage')->excluir($chave);
            throw new \RuntimeException('Não foi possível concluir o upload. Tente novamente.');
        }

        return $this->buscarArquivo($registroId, $moduloId, $empresaId);
    }

    public function buscarArquivo(string $registroId, string $moduloId, string $empresaId): array
    {
        $arquivo = $this->arquivoModel
            ->select('arquivo.*')
            ->join('registro', 'registro.id = arquivo.registro_id')
            ->join('modulo', 'modulo.id = registro.modulo_id')
            ->where('arquivo.registro_id', $registroId)
            ->where('registro.modulo_id', $moduloId)
            ->where('modulo.empresa_id', $empresaId)
            ->first();

        if (! $arquivo) {
            throw new NaoEncontradoException('Arquivo não encontrado.');
        }

        return $arquivo;
    }

    /**
     * Devolve os bytes do arquivo, já com o metadado necessário pra
     * montar a resposta HTTP de download.
     */
    public function baixarArquivo(string $registroId, string $moduloId, string $empresaId): array
    {
        $arquivo  = $this->buscarArquivo($registroId, $moduloId, $empresaId);
        $conteudo = service('storage')->obter($arquivo['chave_armazenamento']);

        return [
            'conteudo'      => $conteudo,
            'nome_original' => $arquivo['nome_original'],
            'tipo_mime'     => $arquivo['tipo_mime'],
        ];
    }

    public function excluirArquivo(string $registroId, string $moduloId, string $empresaId): void
    {
        $arquivo = $this->buscarArquivo($registroId, $moduloId, $empresaId);

        service('storage')->excluir($arquivo['chave_armazenamento']);

        // Excluir o registro apaga o `arquivo` em cascata (constraint do banco)
        $this->registroModel->delete($registroId);
    }
}