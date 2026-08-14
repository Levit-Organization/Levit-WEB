<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// Handle all CORS preflight OPTIONS requests
$routes->options('(:any)', static function () {
    return service('response')
        ->setStatusCode(204)
        ->setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
        ->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->setHeader('Access-Control-Allow-Credentials', 'true')
        ->setHeader('Access-Control-Max-Age', '7200');
});

$routes->group('api/v1', function ($routes) {
    $routes->post('auth/registrar', 'AuthController::registrar');
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/logout', 'AuthController::logout', ['filter' => 'auth']);

    $routes->get('modulos', 'ModuloController::listar', ['filter' => 'auth']);
    $routes->get('modulos/(:segment)', 'ModuloController::buscar/$1', ['filter' => 'auth']);
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

    $routes->post('publico/candidatura/(:segment)', 'CandidatoController::candidatar/$1', ['filter' => 'ratelimit']);
    $routes->get('recrutamento/kanban', 'CandidatoController::kanban', ['filter' => 'auth']);
    $routes->get('recrutamento/candidatos/(:segment)', 'CandidatoController::detalhes/$1', ['filter' => 'auth']);
    $routes->put('recrutamento/candidatos/(:segment)/fase', 'CandidatoController::moverFase/$1', ['filter' => 'auth']);
    $routes->delete('recrutamento/candidatos/(:segment)', 'CandidatoController::excluir/$1', ['filter' => 'auth:gerenciar_recrutamento']);
});