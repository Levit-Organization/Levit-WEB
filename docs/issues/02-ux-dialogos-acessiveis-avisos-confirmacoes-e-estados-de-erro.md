---
title: "[Front] UX: diálogos acessíveis, avisos, confirmações e estados de erro"
labels: ["frontend", "ux", "acessibilidade", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Faltavam feedback consistente, confirmações seguras e acessibilidade básica em modais e no menu.

## O que foi feito
- `Modal` e `Drawer` com foco preso, retorno do foco, Esc, trava de rolagem, animação de saída e confirmação ao fechar com alterações não salvas.
- `FeedbackProvider`: avisos (toasts) e confirmações por promessa (`useToast`, `useConfirm`), no lugar de `alert`/`confirm`.
- Menu lateral responsivo (gaveta no celular com `inert`), recolhimento lembrado e link "Pular para o conteúdo".
- Sessão expirada vira aviso e volta ao login sem recarregar; login/logout sincronizam entre abas.
- Paginação e ordenação nas listas, `ErrorBoundary`, página 404, títulos de aba por rota e máscaras de telefone/CPF/CNPJ.
- Ícones decorativos marcados com `aria-hidden` (leitores de tela liam "add Criar conta").

## Arquivos principais
- `client-frontend/src/components/ui/useDialog.js`
- `client-frontend/src/components/ui/Modal.jsx`
- `client-frontend/src/components/ui/Drawer.jsx`
- `client-frontend/src/context/FeedbackProvider.jsx`
- `client-frontend/src/components/Layout.jsx`
- `client-frontend/src/context/AuthContext.jsx`
- `client-frontend/src/components/ErrorBoundary.jsx`
- `client-frontend/src/pages/NotFound.jsx`

## Como testar
- [ ] Abrir um formulário, digitar e apertar Esc: deve pedir confirmação.
- [ ] Navegar só com Tab dentro de um modal: o foco não sai dele.
- [ ] No celular, abrir e fechar o menu.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
