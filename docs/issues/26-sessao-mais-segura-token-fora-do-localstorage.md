---
title: "[Front] Sessão mais segura (token fora do localStorage)"
labels: ["frontend", "backend", "segurança", "pendente"]
---

**Status:** Pendente.

## Contexto
O token de sessão fica no `localStorage`, exposto a qualquer XSS.

## O que fazer
- [ ] Cookie httpOnly + refresh token no backend.
- [ ] Ajustar `api.js` e `AuthContext` no frontend.
- [ ] Revogar sessões ao trocar a senha.

## Arquivos principais
- `client-frontend/src/services/api.js`
- `client-frontend/src/context/AuthContext.jsx`
- `api-backend/app/Services/AuthService.php`

## Como testar
- [ ] Sessão continua funcionando após recarregar; token não aparece no localStorage.
