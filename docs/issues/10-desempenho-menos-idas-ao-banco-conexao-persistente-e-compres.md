---
title: "[Back] Desempenho: menos idas ao banco, conexão persistente e compressão"
labels: ["backend", "desempenho", "concluído", "decisão do time"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
O banco é remoto: abrir conexão custava ~1,5 s e cada consulta ~200 ms.

## O que foi feito
- `AuthFilter` com 1 consulta (antes 4): revogação, cargo e permissões juntos.
- Conexão persistente (`pConnect`), medida: requisição de ~2,2 s para ~1,0 s.
- Filtro de compressão gzip para respostas JSON acima de 1 KB.
- `GET /automacoes` (todas as automações visíveis numa chamada) e ações carregadas em lote.
- Frontend: pré-carrega os dados de cada tela ao passar o mouse no menu.

## Arquivos principais
- `api-backend/app/Filters/AuthFilter.php`
- `api-backend/app/Services/AuthService.php`
- `api-backend/app/Config/Database.php`
- `api-backend/app/Filters/CompressaoFilter.php`
- `api-backend/app/Config/Filters.php`
- `client-frontend/src/hooks/queries.js`

## Como testar
- [ ] Medir o tempo de uma rota autenticada antes/depois.

## Atenção
- **Decisão do time:** manter `pConnect` (limite de conexões do Aiven) e compressão no código ou mover para o servidor web.
- O ~1 s restante é distância até o banco: aproximar API e banco (mesma região).

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
