<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

$routes->addPlaceholder('uuid', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
$routes->set404Override('App\Controllers\Home::naoEncontrado');

$routes->group('api/v1', function ($routes) {

    $routes->post('auth/registrar', 'AuthController::registrar');
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/logout', 'AuthController::logout', ['filter' => 'auth']);

    $routes->get('modulos', 'ModuloController::listar', ['filter' => 'auth']);
    $routes->get('modulos/(:segment)', 'ModuloController::detalhes/$1', ['filter' => 'auth']);
    $routes->post('modulos', 'ModuloController::criar', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put('modulos/(:segment)', 'ModuloController::atualizar/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->delete('modulos/(:segment)', 'ModuloController::excluir/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->post('modulos/(:segment)/campos', 'ModuloController::adicionarCampo/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put('modulos/(:segment)/campos/reordenar', 'ModuloController::reordenarCampos/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put('modulos/(:segment)/campos/(:segment)', 'ModuloController::atualizarCampo/$1/$2', ['filter' => 'auth:gerenciar_modulos']);
    $routes->delete('modulos/(:segment)/campos/(:segment)', 'ModuloController::excluirCampo/$1/$2', ['filter' => 'auth:gerenciar_modulos']);

    $routes->get('modulos/(:segment)/registros', 'RegistroController::listar/$1', ['filter' => 'auth']);
    $routes->post('modulos/(:segment)/registros', 'RegistroController::criar/$1', ['filter' => 'auth']);
    $routes->put('modulos/(:segment)/registros/(:segment)', 'RegistroController::atualizar/$1/$2', ['filter' => 'auth']);
    $routes->delete('modulos/(:segment)/registros/(:segment)', 'RegistroController::excluir/$1/$2', ['filter' => 'auth']);

    $routes->post('modulos/(:segment)/arquivos', 'ArquivoController::enviar/$1', ['filter' => 'auth']);
    $routes->get('modulos/(:segment)/arquivos/(:segment)', 'ArquivoController::baixar/$1/$2', ['filter' => 'auth']);
    $routes->delete('modulos/(:segment)/arquivos/(:segment)', 'ArquivoController::excluir/$1/$2', ['filter' => 'auth']);

    $routes->get('recrutamento/kanban', 'CandidatoController::kanbanGlobal', ['filter' => 'auth']);
    $routes->put('recrutamento/candidatos/(:segment)/fase', 'CandidatoController::moverFaseGlobal/$1', ['filter' => 'auth']);

    $routes->post('publico/candidatura/(:segment)', 'CandidatoController::candidatar/$1', ['filter' => 'ratelimit']);
    $routes->get('modulos/(:segment)/kanban', 'CandidatoController::kanban/$1', ['filter' => 'auth']);
    $routes->get('modulos/(:segment)/candidatos/(:segment)', 'CandidatoController::detalhes/$1/$2', ['filter' => 'auth']);
    $routes->put('modulos/(:segment)/candidatos/(:segment)/fase', 'CandidatoController::moverFase/$1/$2', ['filter' => 'auth']);
    $routes->delete('modulos/(:segment)/candidatos/(:segment)', 'CandidatoController::excluir/$1/$2', ['filter' => 'auth:gerenciar_recrutamento']);
    $routes->post('modulos/(:segment)/fases', 'ModuloController::adicionarFase/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put('modulos/(:segment)/fases/reordenar', 'ModuloController::reordenarFases/$1', ['filter' => 'auth:gerenciar_modulos']);
    $routes->put('modulos/(:segment)/fases/(:segment)', 'ModuloController::atualizarFase/$1/$2', ['filter' => 'auth:gerenciar_modulos']);
    $routes->delete('modulos/(:segment)/fases/(:segment)', 'ModuloController::excluirFase/$1/$2', ['filter' => 'auth:gerenciar_modulos']);

    $routes->get('cargos', 'CargoController::listar', ['filter' => 'auth:gerenciar_equipe']);
    $routes->post('cargos', 'CargoController::criar', ['filter' => 'auth:gerenciar_equipe']);

    $routes->post('equipe/convidar', 'EquipeController::convidar', ['filter' => 'auth:gerenciar_equipe']);
    $routes->get('equipe', 'EquipeController::listarMembros', ['filter' => 'auth:gerenciar_equipe']);
    $routes->delete('equipe/(:segment)', 'EquipeController::removerMembro/$1', ['filter' => 'auth:gerenciar_equipe']);
    $routes->post('publico/convite/aceitar', 'EquipeController::aceitarConvite', ['filter' => 'ratelimit']);
});
