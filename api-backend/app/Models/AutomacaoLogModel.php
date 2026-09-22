<?php

namespace App\Models;

class AutomacaoLogModel extends BaseModel
{
    protected $table      = 'automacao_log';
    protected $primaryKey = 'id';

    protected $returnType = 'array';

    protected $allowedFields = [
        'automacao_id',
        'registro_id',
        'status',
        'detalhes',
    ];

    protected $useTimestamps = false;
}