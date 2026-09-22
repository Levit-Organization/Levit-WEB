<?php

namespace App\Controllers;

use App\Models\EmpresaModel;
use App\Models\CategoriaFinanceiraModel;

class SeedController extends BaseController
{
    public function seedCategorias()
    {
        $empresaModel = new EmpresaModel();
        $categoriaModel = new CategoriaFinanceiraModel();

        $empresas = $empresaModel->findAll();
        if (empty($empresas)) {
            return $this->response->setJSON(['error' => 'Nenhuma empresa encontrada no banco.']);
        }

        $categoriasIniciais = ['Fixo', 'Receita', 'Variável', 'Investimento'];
        $resultados = [];

        foreach ($empresas as $empresa) {
            $empresaId = $empresa['id'];
            foreach ($categoriasIniciais as $nome) {
                $existe = $categoriaModel->where('empresa_id', $empresaId)->where('nome', $nome)->first();
                if (!$existe) {
                    $categoriaModel->insert([
                        'empresa_id' => $empresaId,
                        'nome' => $nome
                    ]);
                    $resultados[] = "Categoria '$nome' criada para empresa " . $empresa['nome'];
                }
            }
        }
        return $this->response->setJSON(['status' => 'ok', 'resultados' => $resultados]);
    }
}
