---
title: "[Front] Desempenho: divisão por rota, cache de dados e fontes locais"
labels: ["frontend", "desempenho", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
O app carregava todas as páginas de uma vez, refazia as mesmas chamadas em cada tela e baixava fontes do Google em tempo de execução.

## O que foi feito
- Páginas carregadas sob demanda (`React.lazy`) com pré-carregamento ao passar o mouse no menu.
- Cache de dados com React Query (30 s de validade, sem repetir erros 4xx) e invalidação automática depois de qualquer escrita (`skipInvalidate` para optar por não invalidar).
- Bibliotecas em pacotes separados (`manualChunks`): React, roteador, React Query e axios ficam em cache entre deploys.
- Fonte Archivo e ícones servidos localmente (`@fontsource/archivo`, `material-icons`, só a variante usada).
- Imagens de fundo convertidas para WebP (de ~600 KB para ~15 KB).
- Removida a dependência `firebase`, que não era usada.
- Busca com debounce e cancelamento da requisição anterior.

## Arquivos principais
- `client-frontend/vite.config.js`
- `client-frontend/src/App.jsx`
- `client-frontend/src/routes/lazyPages.js`
- `client-frontend/src/lib/queryClient.js`
- `client-frontend/src/hooks/queries.js`
- `client-frontend/src/services/api.js`
- `client-frontend/src/main.jsx`
- `client-frontend/src/material-icons.css`
- `client-frontend/package.json`

## Como testar
- [ ] `npm run build`: conferir os chunks `vendor-*` e um arquivo por página.
- [ ] Navegar entre telas: dados já vistos aparecem na hora, sem carregamento.
- [ ] Aba de rede: nenhuma requisição a fonts.googleapis.com.

## Atenção
- As imagens antigas `public/background 2.png` e `background 3.png` ainda estão no repositório e podem ser apagadas.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
