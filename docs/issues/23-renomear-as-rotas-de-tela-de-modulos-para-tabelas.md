---
title: "[Coerência] Renomear as rotas de tela de /modulos para /tabelas"
labels: ["frontend", "pendente", "coerência", "decisão do time"]
---

**Status:** Pendente.

## Contexto
A tela diz "Tabelas" e a URL diz `/modulos`. Foi revertido para não mexer em rotas sem o time.

## O que fazer
- [ ] Decidir com o time.
- [ ] Trocar as rotas de tela (não as da API) e redirecionar os endereços antigos.
- [ ] Atualizar os links gerados pelo backend nas notificações.

## Arquivos principais
- `client-frontend/src/App.jsx`
- `api-backend/app/Services/Automacao/AutomacaoExecutor.php`

## Como testar
- [ ] Links antigos continuam funcionando.
