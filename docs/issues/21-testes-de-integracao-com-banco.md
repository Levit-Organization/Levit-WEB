---
title: "[Back] Testes de integração com banco"
labels: ["backend", "testes", "pendente"]
---

**Status:** Pendente.

## Contexto
Só há testes unitários; autenticação, permissões, itens, quadro, financeiro e o job da fila não têm teste.

## O que fazer
- [ ] Banco de teste (PostgreSQL) no `phpunit.dist.xml`.
- [ ] Testes de cadastro, login, convite, recuperação de senha, itens e permissões.
- [ ] Teste do job de automações ponta a ponta.
- [ ] CI do backend no GitHub Actions.

## Arquivos principais
- `api-backend/tests/`
- `api-backend/phpunit.dist.xml`
- `.github/workflows/`

## Como testar
- [ ] `php vendor/bin/phpunit` com o banco de teste.
