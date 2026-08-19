<?php

namespace App\Controllers;

use App\Exceptions\NaoEncontradoException;
use App\Services\CandidatoService;

class CandidatoController extends BaseApiController
{
    protected CandidatoService $candidatoService;

    public function __construct()
    {
        $this->candidatoService = new CandidatoService();
    }

    public function candidatar($moduloId)
    {
        $dados = $this->request->getJSON(true) ?? [];

        $rules = [
            'nome'           => ['required', 'min_length[3]', 'max_length[150]'],
            'email'          => ['required', 'valid_email', 'max_length[150]'],
            'telefone'       => ['permit_empty', 'max_length[20]'],
            'cargo_desejado' => ['permit_empty', 'max_length[100]'],
            'mensagem'       => ['permit_empty'],
        ];

        if (! $this->validateData($dados, $rules)) {
            return $this->respondError('Dados inválidos.', 422, $this->validator->getErrors());
        }

        try {
            $candidato = $this->candidatoService->criarCandidatura($moduloId, $dados);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 409);
        } catch (\RuntimeException $e) {
            return $this->respondError($e->getMessage(), 500);
        }

        return $this->respondSuccess($candidato, 201);
    }

    public function kanbanGlobal()
    {
        $user = service('authenticatedUser');
        $moduloModel = new \App\Models\ModuloModel();
        $registroModel = new \App\Models\RegistroModel();
        $campoModuloModel = new \App\Models\CampoModuloModel();
        
        // Find all modules of type 'recrutamento'
        $modulos = $moduloModel->where('empresa_id', $user->empresaId)
                              ->where('tipo', 'recrutamento')
                              ->findAll();
                              
        $kanban = [
            'triagem'       => ['total' => 0, 'candidatos' => []],
            'entrevista'    => ['total' => 0, 'candidatos' => []],
            'teste tecnico' => ['total' => 0, 'candidatos' => []],
            'aprovado'      => ['total' => 0, 'candidatos' => []]
        ];

        if (empty($modulos)) {
            return $this->respondSuccess($kanban);
        }
        
        $moduloIds = array_column($modulos, 'id');
        $modulosMap = array_column($modulos, 'nome', 'id');
        
        // Map field UUIDs to Human-readable names
        $campos = $campoModuloModel->whereIn('modulo_id', $moduloIds)->findAll();
        $camposMap = array_column($campos, 'nome', 'id');
        
        // Fetch all generic records from these recruitment modules
        $registros = $registroModel->whereIn('modulo_id', $moduloIds)->findAll();
        
        foreach ($registros as $reg) {
            $dados = $reg['dados'] ?? [];
            $fase = $dados['_fase_atual'] ?? 'triagem';
            
            $dadosFormatados = [];
            foreach ($dados as $k => $v) {
                if ($k === '_fase_atual') {
                    $dadosFormatados[$k] = $v;
                } else {
                    $nomeAmigavel = $camposMap[$k] ?? $k;
                    $dadosFormatados[$nomeAmigavel] = $v;
                }
            }
            
            // Reconstruct the item object the UI expects
            $item = [
                'id'            => $reg['id'],
                'vaga'          => $modulosMap[$reg['modulo_id']] ?? 'Vaga',
                'dados'         => $dadosFormatados,
                'criado_em'     => $reg['criado_em'],
                'atualizado_em' => $reg['atualizado_em']
            ];
            
            // Map unmapped phases to triagem
            if (!isset($kanban[$fase])) {
                $fase = 'triagem';
            }
            
            $kanban[$fase]['candidatos'][] = $item;
            $kanban[$fase]['total']++;
        }

        return $this->respondSuccess($kanban, 200);
    }

    public function kanban($moduloId)
    {
        // Now redirects to global since UI expects a global Kanban
        return $this->kanbanGlobal();
    }

    public function detalhes($moduloId, $candidatoId)
    {
        try {
            $candidato = $this->candidatoService->buscarCandidato($candidatoId, $moduloId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function moverFaseGlobal($registroId)
    {
        $dadosInput = $this->request->getJSON(true);
        $novaFase = $dadosInput['fase'] ?? 'triagem';
        
        $registroModel = new \App\Models\RegistroModel();
        $registro = $registroModel->find($registroId);
        
        if (!$registro) {
            return $this->respondError('Registro não encontrado.', 404);
        }
        
        $dados = $registro['dados'] ?? [];
        $dados['_fase_atual'] = $novaFase;
        
        $registroModel->update($registroId, [
            'dados'          => $dados,
            'atualizado_por' => service('authenticatedUser')->id
        ]);
        
        return $this->respondSuccess(['message' => 'Fase atualizada com sucesso']);
    }

    public function moverFase($moduloId, $candidatoId)
    {
        $dados = $this->request->getJSON(true) ?? [];
        $user  = service('authenticatedUser');

        try {
            $candidato = $this->candidatoService->moverFase(
                $candidatoId,
                $moduloId,
                $user->empresaId,
                $dados['fase_id'] ?? '',
                $user->id
            );
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        } catch (\DomainException $e) {
            return $this->respondError($e->getMessage(), 422);
        }

        return $this->respondSuccess($candidato, 200);
    }

    public function excluir($moduloId, $candidatoId)
    {
        try {
            $this->candidatoService->excluirCandidato($candidatoId, $moduloId, service('authenticatedUser')->empresaId);
        } catch (NaoEncontradoException $e) {
            return $this->respondError($e->getMessage(), 404);
        }

        return $this->respondSuccess(null, 200);
    }
}