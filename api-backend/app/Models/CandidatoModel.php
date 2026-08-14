<?php

namespace App\Models;

class CandidatoModel extends BaseModel
{
    protected $table      = 'candidato';
    protected $primaryKey = 'id';

    protected $returnType = 'array';

    protected $allowedFields = [
        'empresa_id',
        'nome',
        'email',
        'telefone',
        'cargo_desejado',
        'mensagem',
        'fase_atual',
    ];

    protected $useTimestamps = false;
}