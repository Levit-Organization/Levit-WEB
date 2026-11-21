---
title: "[Segurança] Webhooks: bloquear rede interna (SSRF) e assinar o envio"
labels: ["backend", "segurança", "pendente"]
---

**Status:** Pendente.

## Contexto
A ação "Avisar outro sistema" aceita qualquer URL, inclusive endereços internos, e não assina o conteúdo.

## O que fazer
- [ ] Resolver o DNS e recusar IPs privados, loopback e link-local.
- [ ] Assinar o corpo com HMAC (`X-Levit-Assinatura`) com segredo por empresa.
- [ ] Limitar tamanho e redirecionamentos.

## Arquivos principais
- `api-backend/app/Services/Automacao/AutomacaoExecutor.php`

## Como testar
- [ ] Webhook para `http://127.0.0.1` deve ser recusado.
