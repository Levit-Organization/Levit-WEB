<?php

namespace App\Controllers;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Services\CandidatoService;

class CandidatoController extends BaseApiController
{
    protected CandidatoService $candidatoService;

    private const REGRAS_CANDIDATO = [
        'nome'     => ['required', 'min_length[3]', 'max_length[150]'],
        'email'    => ['required', 'valid_email', 'max_length[150]'],
        'telefone' => ['permit_empty', 'max_length[20]'],
        'mensagem' => ['permit_empty', 'max_length[5000]'],
    ];

    public function __construct()
    {
        $this->candidatoService = new CandidatoService();
    }

    /** Com currículo o envio é multipart; sem ele, ainda aceita JSON. */
    private function dadosDoCandidato(): array
    {
        $dados = str_contains($this->request->getHeaderLine('Content-Type'), 'multipart/form-data')
            ? $this->request->getPost()
            : ($this->request->getJSON(true) ?? []);

        return array_intersect_key(array_map(static fn ($v) => is_string($v) ? trim($v) : $v, $dados), self::REGRAS_CANDIDATO);
    }

    public function vagaPublica($moduloId)
    {
        try {
            return $this->respondSuccess($this->candidatoService->vagaPublica($moduloId), 200);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }
    }

    public function candidatar($moduloId)
    {
        $dados = $this->dadosDoCandidato();

        if (! $this->validateData($dados, self::REGRAS_CANDIDATO)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $candidato = $this->candidatoService->criarCandidatura($moduloId, $dados, $this->request->getFile('curriculo'));
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        } catch (\RuntimeException $e) {
            return $this->respondFalha($e, 500);
        }

        return $this->respondSuccess($candidato, 201);
    }

    public function adicionar($moduloId)
    {
        $dados = $this->dadosDoCandidato();
        $user  = service('authenticatedUser');

        if (! $this->validateData($dados, self::REGRAS_CANDIDATO)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $candidato = $this->candidatoService->adicionarCandidato(
                $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $dados, $this->request->getFile('curriculo')
            );
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        } catch (\RuntimeException $e) {
            return $this->respondFalha($e, 500);
        }

        return $this->respondSuccess($candidato, 201);
    }

    public function curriculo($moduloId, $candidatoId)
    {
        $user = service('authenticatedUser');

        try {
            $arquivo = $this->candidatoService->baixarCurriculo($candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->response
            ->setContentType($arquivo['tipo_mime'])
            ->setHeader('Content-Disposition', $this->cabecalhoDeAnexo($arquivo['nome_original']))
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setBody($arquivo['conteudo']);
    }

    public function kanban($moduloId)
    {
        $user = service('authenticatedUser');

        try {
            $kanban = $this->candidatoService->listarKanban($moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($kanban, 200);
    }

    public function kanbanGlobal()
    {
        $user   = service('authenticatedUser');
        $kanban = $this->candidatoService->listarKanbanGlobal($user->empresaId, $user->cargoId, $user->acessoTotal);

        return $this->respondSuccess($kanban, 200);
    }

    public function detalhes($moduloId, $candidatoId)
    {
        $user = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->buscarCandidatoComPermissao($candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function moverFase($moduloId, $candidatoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->moverFase(
                $candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal, $dados['fase_id'] ?? '', $user->id
            );
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function moverFaseGlobal($candidatoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->moverFaseGlobalPorNome(
                $candidatoId, $user->empresaId, $user->cargoId, $user->acessoTotal, $dados['fase'] ?? '', $user->id
            );
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function excluir($moduloId, $candidatoId)
    {
        $user = service('authenticatedUser');

        try {
            $this->candidatoService->excluirCandidato($candidatoId, $moduloId, $user->empresaId, $user->cargoId, $user->acessoTotal);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (AcessoNegadoException $e) {
            return $this->respondError($e->getMessage(), 403);
        }

        return $this->respondSuccess(null, 200);
    }
}