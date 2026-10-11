---
title: "[Infra] Testes automatizados, CI e atualização de dependências"
labels: ["infra", "testes", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Não havia testes nem CI no frontend.

## O que foi feito
- Vitest + Testing Library (hoje 86 testes no frontend) e PHPUnit com 52 testes unitários no backend, sem banco.
- GitHub Actions do frontend: lint, testes, build e `npm audit` das dependências de produção.
- Dependabot para npm, composer e Actions.
- axios atualizado (havia uma vulnerabilidade alta).

## Arquivos principais
- `.github/workflows/frontend.yml`
- `.github/dependabot.yml`
- `client-frontend/src/test/`
- `client-frontend/vite.config.js`
- `api-backend/tests/unit/`

## Como testar
- [ ] `npm test` em client-frontend.
- [ ] `php vendor/bin/phpunit tests/unit` em api-backend.

## Atenção
- O workflow nunca rodou no GitHub (precisa de push).
- Não há CI do backend nem testes de integração com banco.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
