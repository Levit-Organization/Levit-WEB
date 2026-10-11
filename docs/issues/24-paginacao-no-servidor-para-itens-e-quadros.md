---
title: "[Back] Paginação no servidor para itens e quadros"
labels: ["backend", "frontend", "desempenho", "pendente"]
---

**Status:** Pendente.

## Contexto
Itens e quadros trazem tudo de uma vez; com milhares de itens fica lento.

## O que fazer
- [ ] Paginação por cursor em `GET /modulos/{id}/registros` e no quadro de recrutamento.
- [ ] Frontend com `useInfiniteQuery` (lista e por coluna no quadro).

## Arquivos principais
- `api-backend/app/Services/RegistroService.php`
- `api-backend/app/Services/CandidatoService.php`
- `client-frontend/src/pages/ModuleRecords.jsx`

## Como testar
- [ ] Tabela com 5.000 itens abre rápido.
