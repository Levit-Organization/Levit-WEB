---
title: "[Automações] Notificações dentro da plataforma e condições de mudança"
labels: ["backend", "frontend", "automações", "notificações", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Não existiam notificações internas, e a condição "igual" disparava a cada edição do item.

## O que foi feito
- Tabela `notificacao`, API (listar, contagem, ler, ler todas, excluir), agrupamento ("3 novas candidaturas") e comando `php spark notificacoes:limpar`.
- Ação "Notificação" nas automações (toda a equipe, cargo ou pessoa — só quem tem acesso à tabela recebe).
- Avisos nativos: nova candidatura, convite aceito, automação pausada.
- Sino no menu com contador, painel com filtro e agrupamento por dia, título da aba com "(n)".
- Operadores "mudou", "mudou para" e "mudou de… para…".

## Arquivos principais
- `api-backend/app/Services/NotificacaoService.php`
- `api-backend/app/Controllers/NotificacaoController.php`
- `api-backend/app/Database/Migrations/2026-10-10-140000_CreateNotificacaoTable.php`
- `api-backend/app/Commands/LimparNotificacoes.php`
- `client-frontend/src/components/notificacoes/`
- `client-frontend/src/hooks/useNotificacoes.js`

## Como testar
- [ ] Receber uma candidatura e ver o sino contar.
- [ ] Condição "Status mudou para Fechado": editar outro campo de um item já fechado não dispara.

## Atenção
- Agendar `php spark notificacoes:limpar` no cron (diário).
- O índice parcial da tabela usa sintaxe do PostgreSQL.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
