---
title: "[Back] Mensagens de validação em português"
labels: ["backend", "pendente", "coerência"]
---

**Status:** Pendente.

## Contexto
`defaultLocale = 'en'`: erros de validação aparecem em inglês ("The email field must contain...") junto com textos em português.

## O que fazer
- [ ] Trocar `defaultLocale`/`supportedLocales` para `pt-BR`.
- [ ] Adicionar `app/Language/pt-BR/Validation.php` com as mensagens traduzidas.
- [ ] Revisar nomes de campos exibidos nas mensagens (ex.: "cargo_id").

## Arquivos principais
- `api-backend/app/Config/App.php`
- `api-backend/app/Language/`

## Como testar
- [ ] Enviar um e-mail inválido no cadastro e conferir a mensagem.
