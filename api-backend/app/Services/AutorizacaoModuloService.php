<?php

namespace App\Services;

use App\Exceptions\AcessoNegadoException;
use App\Exceptions\NaoEncontradoException;
use App\Models\CargoModuloPermissaoModel;
use App\Models\CargoModel;
use App\Models\ModuloModel;

class AutorizacaoModuloService
{
    private const NIVEIS = ['visualizar' => 1, 'editar' => 2, 'gerenciar' => 3];

    protected CargoModuloPermissaoModel $cargoModuloPermissaoModel;
    protected CargoModel $cargoModel;
    protected ModuloModel $moduloModel;

    public function __construct()
    {
        $this->cargoModuloPermissaoModel = new CargoModuloPermissaoModel();
        $this->cargoModel                = new CargoModel();
        $this->moduloModel               = new ModuloModel();
    }

    public function nivelDeAcesso(string $cargoId, string $moduloId): ?string
    {
        $linha = $this->cargoModuloPermissaoModel
            ->where('cargo_id', $cargoId)
            ->where('modulo_id', $moduloId)
            ->first();

        return $linha['nivel'] ?? null;
    }

    /**
     * @throws NaoEncontradoException se não houver nenhum nível concedido (módulo "invisível")
     * @throws AcessoNegadoException se houver nível, mas insuficiente pra ação
     */
    public function exigirNivel(bool $acessoTotal, string $cargoId, string $moduloId, string $nivelMinimo): void
    {
        if ($acessoTotal) {
            return;
        }

        $nivelAtual = $this->nivelDeAcesso($cargoId, $moduloId);

        if ($nivelAtual === null) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        if (self::NIVEIS[$nivelAtual] < self::NIVEIS[$nivelMinimo]) {
            throw new AcessoNegadoException('Você não tem nível de acesso suficiente neste módulo.');
        }
    }

    /**
     * Usado ao criar um módulo — garante que quem criou já enxerga
     * o que acabou de criar, mesmo sem acesso_total.
     */
    public function concederGerenciar(string $cargoId, string $moduloId): void
    {
        $jaExiste = $this->cargoModuloPermissaoModel
            ->where('cargo_id', $cargoId)
            ->where('modulo_id', $moduloId)
            ->first();

        if ($jaExiste) {
            $this->cargoModuloPermissaoModel->update($jaExiste['id'], ['nivel' => 'gerenciar']);
            return;
        }

        $this->cargoModuloPermissaoModel->insert([
            'cargo_id'  => $cargoId,
            'modulo_id' => $moduloId,
            'nivel'     => 'gerenciar',
        ]);
    }

    /**
     * @throws NaoEncontradoException se o cargo não existir/pertencer à empresa
     */
    private function confirmarCargoDaEmpresa(string $cargoId, string $empresaId): void
    {
        if (! $this->cargoModel->where('id', $cargoId)->where('empresa_id', $empresaId)->first()) {
            throw new NaoEncontradoException('Cargo não encontrado.');
        }
    }

    public function listarNiveisDoCargo(string $empresaId, string $cargoId): array
    {
        $this->confirmarCargoDaEmpresa($cargoId, $empresaId);

        return $this->cargoModuloPermissaoModel
            ->select('cargo_modulo_permissao.modulo_id, cargo_modulo_permissao.nivel, modulo.nome as modulo_nome')
            ->join('modulo', 'modulo.id = cargo_modulo_permissao.modulo_id')
            ->where('cargo_modulo_permissao.cargo_id', $cargoId)
            ->findAll();
    }

    /**
     * @throws NaoEncontradoException se cargo ou módulo não existirem/pertencerem à empresa
     * @throws \DomainException se o nível informado for inválido
     */
    public function definirNivel(string $empresaId, string $cargoId, string $moduloId, string $nivel): array
    {
        if (! isset(self::NIVEIS[$nivel])) {
            throw new \DomainException("Nível inválido: '{$nivel}'.");
        }

        $this->confirmarCargoDaEmpresa($cargoId, $empresaId);

        if (! $this->moduloModel->where('id', $moduloId)->where('empresa_id', $empresaId)->first()) {
            throw new NaoEncontradoException('Módulo não encontrado.');
        }

        $existente = $this->cargoModuloPermissaoModel
            ->where('cargo_id', $cargoId)
            ->where('modulo_id', $moduloId)
            ->first();

        if ($existente) {
            $this->cargoModuloPermissaoModel->update($existente['id'], ['nivel' => $nivel]);
        } else {
            $this->cargoModuloPermissaoModel->insert([
                'cargo_id'  => $cargoId,
                'modulo_id' => $moduloId,
                'nivel'     => $nivel,
            ]);
        }

        return $this->listarNiveisDoCargo($empresaId, $cargoId);
    }

    public function removerNivel(string $empresaId, string $cargoId, string $moduloId): void
    {
        $this->confirmarCargoDaEmpresa($cargoId, $empresaId);

        $this->cargoModuloPermissaoModel
            ->where('cargo_id', $cargoId)
            ->where('modulo_id', $moduloId)
            ->delete();
    }

    /**
     * Filtra uma lista de IDs de módulo, devolvendo só os que o cargo
     * tem nível suficiente — usado quando uma operação abrange vários
     * módulos de uma vez (ex: Kanban global de recrutamento).
     */
    public function filtrarModulosComNivel(array $moduloIds, bool $acessoTotal, string $cargoId, string $nivelMinimo): array
    {
        if ($acessoTotal) {
            return $moduloIds;
        }

        if (empty($moduloIds)) {
            return [];
        }

        $niveis = $this->cargoModuloPermissaoModel
            ->where('cargo_id', $cargoId)
            ->whereIn('modulo_id', $moduloIds)
            ->findAll();

        $permitidos = [];
        foreach ($niveis as $linha) {
            if (self::NIVEIS[$linha['nivel']] >= self::NIVEIS[$nivelMinimo]) {
                $permitidos[] = $linha['modulo_id'];
            }
        }

        return $permitidos;
    }
}