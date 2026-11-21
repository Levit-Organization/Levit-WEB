---
title: "[Coerência] Identidade única e glossário em todas as telas"
labels: ["frontend", "backend", "coerência", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
O produto se apresentava de quatro jeitos (organizador geral, "Recrutamento e equipe", "plataforma de RH"...) e cada tela usava palavras diferentes.

## O que foi feito
- Identidade: "centralizar o trabalho da equipe num lugar só", registrada no `PRODUCT.md` e no `DESIGN.md`.
- Glossário: módulo → tabela, campo → coluna, registro → item, kanban/funil → quadro, Seleção Única → lista de opções; senha (não "palavra-passe"); sem "e-mail corporativo".
- Também nas mensagens de erro do backend (~50 frases).
- Menu: Organizar (Tabelas, Recrutamento, Automações) · Pessoas (Equipe). Textos de RH viraram textos da operação inteira.
- Login, cadastro, senha e convite com o visual da landing (sem o fundo de cidade).

## Arquivos principais
- `PRODUCT.md`
- `DESIGN.md`
- `client-frontend/src/pages/AuthLayout.jsx`
- `client-frontend/src/components/Layout.jsx`
- `api-backend/app/Services/*.php (mensagens)`

## Como testar
- [ ] Percorrer todas as telas procurando "módulo", "registro", "campo" ou "funil".

## Atenção
- As rotas continuam `/modulos/...` (decisão consciente).

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
