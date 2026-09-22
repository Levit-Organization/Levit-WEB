<?php

namespace App\Libraries;

class AuthenticatedUser
{
    public ?string $id = null;
    public ?string $empresaId = null;
    public ?string $cargoId = null;
    public ?string $jti = null;
    public ?int $expiraEm = null;
    public array $permissoes = [];
    public bool $acessoTotal = false;

    public function autenticado(): bool
    {
        return $this->id !== null;
    }

    public function preencher(string $id, string $empresaId, string $cargoId, string $jti, int $expiraEm, array $permissoes, bool $acessoTotal): void
    {
        $this->id          = $id;
        $this->empresaId   = $empresaId;
        $this->cargoId     = $cargoId;
        $this->jti         = $jti;
        $this->expiraEm    = $expiraEm;
        $this->permissoes  = $permissoes;
        $this->acessoTotal = $acessoTotal;
    }

    public function temPermissao(string $codigo): bool
    {
        return $this->acessoTotal || in_array($codigo, $this->permissoes, true);
    }
}