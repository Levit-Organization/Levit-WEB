<?php

namespace App\Models;

class CandidatoModel extends BaseModel
{
    protected $table      = 'candidato';
    protected $primaryKey = 'id';

    protected $returnType = 'array';

    protected $allowedFields = [
        'modulo_id',
        'fase_atual_id',
        'nome',
        'email',
        'telefone',
        'cargo_desejado',
        'mensagem',
    ];

    protected $useTimestamps = false;
}