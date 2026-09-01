<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

$routes->addPlaceholder('uuid', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
$routes->set404Override('App\Controllers\Home::naoEncontrado');

$routes->group('api/v1', function ($routes) {
    $uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    $routes->post('auth/registrar', 'AuthController::registrar');
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/logout', 'AuthController::logout', ['filter' => 'auth']);

    $routes->get('modulos', 'ModuloController::listar', ['filter' => 'auth']);
    $routes->post('modulos', 'ModuloController::criar', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put("modulos/({$uuid})", 'ModuloController::atualizar/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->delete("modulos/({$uuid})", 'ModuloController::excluir/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->get("modulos/({$uuid})", 'ModuloController::detalhes/$1', ['filter' => 'auth']);
    $routes->post("modulos/({$uuid})/campos", 'ModuloController::adicionarCampo/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put("modulos/({$uuid})/campos/reordenar", 'ModuloController::reordenarCampos/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put("modulos/({$uuid})/campos/({$uuid})", 'ModuloController::atualizarCampo/$1/$2', ['filter' => 'auth:gerenciar_modulos']);
    $routes->delete("modulos/({$uuid})/campos/({$uuid})", 'ModuloController::excluirCampo/$1/$2', ['filter' => 'auth:gerenciar_modulos']);

    $routes->get("modulos/({$uuid})/registros", 'RegistroController::listar/$1', ['filter' => 'auth']);
    $routes->post("modulos/({$uuid})/registros", 'RegistroController::criar/$1', ['filter' => 'auth']);
    $routes->put("modulos/({$uuid})/registros/({$uuid})", 'RegistroController::atualizar/$1/$2', ['filter' => 'auth']);
    $routes->delete("modulos/({$uuid})/registros/({$uuid})", 'RegistroController::excluir/$1/$2', ['filter' => 'auth']);

    $routes->post("modulos/({$uuid})/arquivos", 'ArquivoController::enviar/$1', ['filter' => 'auth']);
    $routes->get("modulos/({$uuid})/arquivos/({$uuid})", 'ArquivoController::baixar/$1/$2', ['filter' => 'auth']);
    $routes->delete("modulos/({$uuid})/arquivos/({$uuid})", 'ArquivoController::excluir/$1/$2', ['filter' => 'auth']);

    $routes->post("publico/candidatura/({$uuid})", 'CandidatoController::candidatar/$1', ['filter' => 'ratelimit']);
    $routes->get("modulos/({$uuid})/kanban", 'CandidatoController::kanban/$1', ['filter' => 'auth']);
    $routes->get("modulos/({$uuid})/candidatos/({$uuid})", 'CandidatoController::detalhes/$1/$2', ['filter' => 'auth']);
    $routes->put("modulos/({$uuid})/candidatos/({$uuid})/fase", 'CandidatoController::moverFase/$1/$2', ['filter' => 'auth']);
    $routes->get('recrutamento/kanban', 'CandidatoController::kanbanGlobal', ['filter' => 'auth']);
    $routes->put("recrutamento/candidatos/({$uuid})/fase", 'CandidatoController::moverFaseGlobal/$1', ['filter' => 'auth']);
    $routes->delete("modulos/({$uuid})/candidatos/({$uuid})", 'CandidatoController::excluir/$1/$2', ['filter' => 'auth:gerenciar_recrutamento']);
    $routes->post("modulos/({$uuid})/fases", 'ModuloController::adicionarFase/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put("modulos/({$uuid})/fases/reordenar", 'ModuloController::reordenarFases/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put("modulos/({$uuid})/fases/({$uuid})", 'ModuloController::atualizarFase/$1/$2', ['filter' => 'auth:gerenciar_modulos']);
    $routes->delete("modulos/({$uuid})/fases/({$uuid})", 'ModuloController::excluirFase/$1/$2', ['filter' => 'auth:gerenciar_modulos']);

    $routes->get('cargos', 'CargoController::listar', ['filter' => 'auth:gerenciar_equipe']);
    $routes->post('cargos', 'CargoController::criar', ['filter' => 'auth:gerenciar_equipe']);

    $routes->post('equipe/convidar', 'EquipeController::convidar', ['filter' => 'auth:gerenciar_equipe']);
    $routes->get('equipe', 'EquipeController::listarMembros', ['filter' => 'auth:gerenciar_equipe']);
    $routes->delete("equipe/({$uuid})", 'EquipeController::removerMembro/$1', ['filter' => 'auth:gerenciar_equipe']);
    $routes->post('publico/convite/aceitar', 'EquipeController::aceitarConvite', ['filter' => 'ratelimit']);

    $routes->post("modulos/({$uuid})/automacoes", 'AutomacaoController::criar/$1', ['filter' => 'auth:gerenciar_automacoes']);
    $routes->get("modulos/({$uuid})/automacoes", 'AutomacaoController::listar/$1', ['filter' => 'auth:gerenciar_automacoes']);
    $routes->put("modulos/({$uuid})/automacoes/({$uuid})/ativo", 'AutomacaoController::alternarAtivo/$1/$2', ['filter' => 'auth:gerenciar_automacoes']);
    $routes->delete("modulos/({$uuid})/automacoes/({$uuid})", 'AutomacaoController::excluir/$1/$2', ['filter' => 'auth:gerenciar_automacoes']);

    $routes->get('backup/json', 'BackupController::exportarJson', ['filter' => 'auth:gerenciar_dados']);
    $routes->get("modulos/({$uuid})/exportar-csv", 'BackupController::exportarCsv/$1', ['filter' => 'auth:gerenciar_dados']);
    $routes->post('backup/resetar', 'BackupController::resetarFabrica', ['filter' => 'auth:gerenciar_dados']);
});