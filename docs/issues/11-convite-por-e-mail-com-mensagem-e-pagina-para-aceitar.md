---
title: "[Equipe] Convite por e-mail com mensagem e página para aceitar"
labels: ["backend", "frontend", "equipe", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
O convite gerava token mas não mandava e-mail (e devolvia o token para quem convidava); não havia página de aceite.

## O que foi feito
- E-mail estilizado com quem convidou, mensagem opcional, cargo, validade e botão "Aceitar convite".
- Página `/convite/:token`: mostra o convite, a pessoa escolhe nome e senha e entra já logada.
- Convites pendentes na tela de equipe com Reenviar e Cancelar; convidar de novo reaproveita o convite.
- Token não sai mais na API (só no e-mail; banco guarda hash). Limite de tentativas próprio para a página do convite.
- Modo de e-mail simulado (`EMAIL_PROVIDER=log`) grava em `writable/logs/emails-simulados.log` e `ultimo-email.html`.

## Arquivos principais
- `api-backend/app/Services/EquipeService.php`
- `api-backend/app/Services/Email/ModeloConvite.php`
- `api-backend/app/Services/Email/LogEmailService.php`
- `api-backend/app/Database/Migrations/2026-10-11-090000_AddMensagemToConviteTable.php`
- `api-backend/app/Filters/RateLimitFilter.php`
- `client-frontend/src/pages/AceitarConvite.jsx`
- `client-frontend/src/pages/TeamManagement.jsx`

## Como testar
- [ ] Convidar um e-mail seu, abrir o link e aceitar.
- [ ] Reenviar: o link antigo deixa de funcionar.

## Atenção
- Definir `FRONTEND_URL` no `.env` (link do e-mail).
- Brevo: em produção, cadastrar o IP fixo do servidor e religar o bloqueio por IP.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
