<?php

namespace App\Models;

class AutomacaoModel extends BaseModel
{
    protected $table      = 'automacao';
    protected $primaryKey = 'id';

    protected $returnType = 'array';

    protected $allowedFields = [
        'modulo_id',
        'nome',
        'gatilho',
        'campo_condicao_id',
        'condicao_operador',
        'condicao_valor',
        'ativo',
        'criado_por',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'criado_em';
    protected $updatedField  = 'atualizado_em';
    protected $dateFormat    = 'datetime';
}