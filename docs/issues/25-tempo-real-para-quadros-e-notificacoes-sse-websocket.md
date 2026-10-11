---
title: "[Back] Tempo real para quadros e notificações (SSE/WebSocket)"
labels: ["backend", "frontend", "pendente"]
---

**Status:** Pendente.

## Contexto
Hoje quadro e notificações atualizam por consulta periódica (15 s e 30 s).

## O que fazer
- [ ] Escolher tecnologia (SSE, Mercure, Pusher/Ably).
- [ ] No frontend, cada evento só chama `invalidateQueries` (o contrato já está pronto).

## Arquivos principais
- `client-frontend/src/hooks/queries.js`
- `client-frontend/src/hooks/useNotificacoes.js`

## Como testar
- [ ] Mudança feita por um colega aparece na hora.
