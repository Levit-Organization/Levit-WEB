---
title: "[Tabelas] Ver qualquer tabela como quadro"
labels: ["frontend", "tabelas", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
A landing prometia "quadros de tarefas", mas só o recrutamento tinha quadro.

## O que foi feito
- Alternância Lista | Quadro em tabelas com coluna de lista; cada opção vira uma coluna (mesmas cores do quadro de recrutamento).
- Mover arrastando ou pelo seletor no cartão (funciona no celular e no teclado); otimista com desfazer.
- "Agrupar por" quando há mais de uma lista; coluna "Sem …" para itens sem valor; escolha lembrada por tabela.

## Arquivos principais
- `client-frontend/src/components/quadro/QuadroItens.jsx`
- `client-frontend/src/pages/ModuleRecords.jsx`
- `client-frontend/src/services/registroService.js`

## Como testar
- [ ] Tabela com coluna "Status": alternar para Quadro e mover itens.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
