---
title: "[Automações] Uma automação com vários gatilhos (criar, editar e excluir)"
labels: ["backend", "frontend", "automações", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Para avisar em criação, edição e exclusão era preciso criar três automações iguais.

## O que foi feito
- Coluna `automacao.gatilhos` (lista em JSON); a coluna antiga `gatilho` continua com o primeiro gatilho.
- API aceita `gatilhos` (novo) e `gatilho` (antigo). Formulário com seleção múltipla; lista mostra um selo por gatilho.
- Corrigido bug: `ModuloCampoModel` inexistente fazia falhar todo e-mail com `{{variável}}`.

## Arquivos principais
- `api-backend/app/Database/Migrations/2026-10-10-120000_AddGatilhosToAutomacaoTable.php`
- `api-backend/app/Services/AutomacaoService.php`
- `api-backend/app/Jobs/ProcessarAutomacoes.php`
- `client-frontend/src/pages/AutomacaoForm.jsx`

## Como testar
- [ ] Criar uma automação com os três gatilhos e conferir que dispara nos três casos.

## Atenção
- Depende da migração `120000`.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
