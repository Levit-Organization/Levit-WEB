---
title: "[Back] Retenção do histórico de automações (LGPD)"
labels: ["backend", "pendente", "segurança"]
---

**Status:** Pendente.

## Contexto
`automacao_log.dados` guarda uma cópia dos dados do item para permitir reexecutar.

## O que fazer
- [ ] Definir prazo (ex.: 90 dias) e criar comando de limpeza como o das notificações.
- [ ] Considerar guardar só o necessário para reexecutar.

## Arquivos principais
- `api-backend/app/Jobs/ProcessarAutomacoes.php`
- `api-backend/app/Commands/`

## Como testar
- [ ] Rodar o comando e conferir que só registros antigos somem.
