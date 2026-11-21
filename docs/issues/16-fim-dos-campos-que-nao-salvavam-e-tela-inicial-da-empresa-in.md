---
title: "[Coerência] Fim dos campos que não salvavam e tela inicial da empresa inteira"
labels: ["frontend", "coerência", "ux", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Havia campos que não salvavam e a tela inicial era um painel de recrutamento.

## O que foi feito
- Removidos "Descrição" e "Frequência máxima" (automação) e "Status" (pessoa). Coluna "Status" da equipe virou "Na equipe desde".
- Tela inicial: números da empresa (tabelas, automações, equipe, atenção), "Suas tabelas" primeiro, "Precisa da sua atenção" e resumos de recrutamento e equipe.
- Quadro de recrutamento com o mesmo cartão e seletor de etapa do quadro das tabelas.
- "Webhook" virou "Avisar outro sistema" para o usuário.

## Arquivos principais
- `client-frontend/src/pages/Dashboard.jsx`
- `client-frontend/src/components/kanban/KanbanCard.jsx`
- `client-frontend/src/pages/TeamManagement.jsx`
- `client-frontend/src/pages/AutomacaoForm.jsx`
- `client-frontend/src/utils/automacaoConstants.js`

## Como testar
- [ ] Entrar e conferir a tela inicial com e sem tabelas.
- [ ] No celular, mover um candidato pelo seletor do cartão.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
