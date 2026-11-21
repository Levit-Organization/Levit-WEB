---
title: "[Front] Landing page refeita (movimento, produto como protagonista, prova de valor)"
labels: ["frontend", "landing", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
A landing parecia "cartunizada", com pouca animação e sem explicar o produto.

## O que foi feito
- Hero com título revelado palavra a palavra e miniatura viva do produto (item criado → status muda → automação avisa).
- Faixa de exemplos que acelera com o scroll; tour fixo no scroll em seção escura com 4 capítulos; fluxo "Quando → Se → Então" desenhado pelo scroll.
- Comparação "Planilha vs Levit", números reais do produto, dúvidas frequentes e chamada final.
- Textos simples para leigos com a premissa "tudo num lugar só". Tudo respeita "reduzir movimento".

## Arquivos principais
- `client-frontend/src/pages/Landing.jsx`
- `client-frontend/src/pages/Landing.css`
- `client-frontend/src/components/landing/`

## Como testar
- [ ] Abrir `/` deslogado em desktop e celular.
- [ ] Ativar "reduzir movimento" no sistema: a página fica parada no estado final.

## Atenção
- Sem depoimentos ou logos de clientes (não havia dados reais).

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
