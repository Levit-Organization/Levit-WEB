<?php

namespace App\Models;

class UsuarioModel extends BaseModel
{
    protected $table      = 'usuario';
    protected $primaryKey = 'id';

    protected $returnType = 'array';

    protected $allowedFields = [
        'empresa_id',
        'cargo_id',
        'nome',
        'email',
        'senha_hash',
        'reset_hash',
        'reset_expires_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'criado_em';
    protected $updatedField  = 'atualizado_em';
    protected $dateFormat    = 'datetime';
}

?>