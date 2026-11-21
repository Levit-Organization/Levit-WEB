---
title: "[Infra] Colocar no ar: migrações, worker da fila, cron e variáveis de ambiente"
labels: ["infra", "pendente", "deploy"]
---

**Status:** Pendente.

## Contexto
As mudanças acima dependem de configuração e processo para funcionar em produção.

## O que fazer
- [ ] Revisar e rodar as migrações de `2026-10-10-*` e `2026-10-11-*` (+ as da fila: `php spark migrate --all`).
- [ ] Manter `php spark queue:work automacoes` rodando (supervisor).
- [ ] Agendar `php spark notificacoes:limpar` diariamente.
- [ ] Definir no `.env`: `FRONTEND_URL`, `CI_ENVIRONMENT`, `EMAIL_PROVIDER`.
- [ ] Brevo: IP fixo do servidor autorizado e bloqueio por IP religado.
- [ ] Fazer backup do banco antes de migrar.

## Arquivos principais
- `api-backend/app/Database/Migrations/`
- `api-backend/.env`

## Como testar
- [ ] `php spark migrate:status` sem pendências.

## Atenção
- Já foram rodadas no banco compartilhado (Aiven) durante o desenvolvimento: avisar o time.
