---
title: "[Tabelas] Modelos prontos ao criar uma tabela"
labels: ["frontend", "tabelas", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Começar uma tabela do zero era difícil e não ligava a vitrine ao produto.

## O que foi feito
- "Comece por um modelo": Clientes e vendas, Tarefas da equipe, Estoque, Pedidos internos e Vaga de recrutamento.
- Preenche nome, ícone, tipo e colunas (tudo editável); só pede confirmação se a pessoa já editou algo.
- "Tipo de tabela" virou "O que você quer organizar?" com opções descritas pelo uso.

## Arquivos principais
- `client-frontend/src/utils/modelosTabela.js`
- `client-frontend/src/pages/ModuleForm.jsx`

## Como testar
- [ ] Criar uma tabela pelo modelo "Tarefas da equipe" e abrir como quadro.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
