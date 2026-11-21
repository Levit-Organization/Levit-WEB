---
title: "[Front] Kanban de recrutamento: atualização automática e movimento otimista"
labels: ["frontend", "recrutamento", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
O quadro de recrutamento só mudava depois de ação do próprio usuário; mudanças de colegas não apareciam.

## O que foi feito
- Atualização a cada 15 s (só com a aba visível) e ao voltar para a aba.
- A atualização pausa durante um arraste e enquanto um movimento está sendo gravado (evita o cartão "voltar").
- Movimento otimista com desfazer por cartão se a API falhar; cartões e colunas memoizados; colunas mostram 30 cartões por vez.

## Arquivos principais
- `client-frontend/src/pages/RecrutamentoKanban.jsx`
- `client-frontend/src/components/kanban/`
- `client-frontend/src/utils/kanban.js`

## Como testar
- [ ] Abrir o quadro em duas abas, mover um candidato em uma: a outra atualiza em até 15 s.

## Atenção
- Não é tempo real (WebSocket/SSE); ver a issue de tempo real nas pendências.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
