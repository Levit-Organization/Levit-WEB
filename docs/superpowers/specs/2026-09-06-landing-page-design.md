# Landing page pública do Levit

## Contexto

O Levit hoje não tem nenhuma página pública de apresentação: a rota `/` do
`client-frontend` redireciona direto para `/login`. Não existe forma de um
visitante entender o que o produto faz antes de se cadastrar.

O Levit é uma plataforma para times operacionais montarem seu próprio
sistema: módulos customizáveis (tabelas/formulários com campos definidos
pelo usuário), recrutamento em Kanban, gestão de equipe com permissões por
módulo, e automações. O público-alvo principal desta landing é esse time
operacional que quer "construir seu próprio sistema" — recrutamento e
equipe entram como funcionalidades de apoio, não como carro-chefe.

## Objetivo

Converter visitante em cadastro (`/register`). Página 100% estática, sem
chamadas a API, com tom de voz direto e prático (frases curtas, foco em
benefício concreto — nada de jargão "visionário" nem tom casual demais).

Fora de escopo: pricing (produto ainda não tem modelo de preço definido) e
prova social/depoimentos (produto ainda não tem clientes reais para citar).

## Onde a página vive

- Novo componente `client-frontend/src/pages/Landing.jsx`, roteado em `/`.
- `App.jsx`: a rota `/` deixa de ser `<Navigate to="/login" replace />` fixo.
  Passa a renderizar um componente que checa `useAuth()`:
  - `loading` → nada ainda (evita flash) ou o mesmo spinner que
    `ProtectedRoute` já usa.
  - `autenticado === true` → `<Navigate to="/dashboard" replace />`.
  - `autenticado === false` → renderiza `<Landing />`.
- Nenhuma chamada a serviço/API. Todos os CTAs são links de navegação:
  "Criar conta" → `/register`, "Entrar" → `/login`, "Ver como funciona" →
  scroll suave (`scrollIntoView`) até a seção "Como funciona".

## Estilo visual

Reaproveita os tokens já definidos em `index.css` (`--color-primary:
#534BAF`, `--color-background: #F3F3F3`, `--color-divider: #E5E5E5`) e
Tailwind, mas com tipografia maior/mais expressiva que as telas internas do
produto — é uma página de marketing, pode respirar mais. Sem gradientes
nem elementos que fujam da paleta da marca. Consistente com o restante do
produto (mesma cor primária, mesmos cantos arredondados, mesma sobriedade),
só que em escala maior.

A miniatura animada do Hero (ver abaixo) usa **formas abstratas, sem texto
legível** — barras cinza no lugar de labels de menu e do nome da logo — e
já foi validada visualmente com o usuário via companheiro de brainstorming.

## Estrutura da página

### Navbar
Fixa no topo, fundo branco, `border-b` com `--color-divider`.
- Esquerda: logo Levit (`/Logo.png` + texto "Levit", mesmo padrão do
  `Layout.jsx` do app logado).
- Direita: link de texto "Entrar" (`/login`) + botão sólido roxo "Criar
  conta grátis" (`/register`).

### Hero (seção 1)
Duas colunas (empilha em mobile): texto à esquerda, miniatura animada da
tela cheia à direita.

- **Headline:** "Monte o sistema que sua equipe precisa, sem escrever uma
  linha de código."
- **Subheadline:** "Módulos personalizados, recrutamento, permissões por
  equipe e automações — tudo num só lugar, do jeito que o seu processo já
  funciona."
- **CTA primário:** botão "Criar conta grátis" → `/register`.
- **CTA secundário:** link de texto "Ver como funciona" → scroll até a
  seção "Como funciona".
- **Miniatura animada:** réplica em miniatura do app real dentro de uma
  moldura de "janela de navegador" (barra superior com 3 pontinhos) —
  sidebar abstrata (bloco de logo + 3 itens de nav, um deles marcado como
  ativo com a cor primária) + área de conteúdo mostrando um mini-Kanban de
  3 colunas. Um card se move sozinho da 1ª pra 2ª pra 3ª coluna em loop
  contínuo (`@keyframes`, ~7s), acompanhado por um "cursor fantasma" que
  se desloca junto. Tudo em CSS puro (sem imagem/vídeo), reaproveitando as
  cores da marca. Implementação de referência já validada e disponível em
  `.superpowers/brainstorm/284-1788743010/content/hero-fullscreen-v2.html`
  (usar como base de marcação/CSS, adaptando para componente React).

### Destaques de funcionalidades (seção 2)
Grid de 4 cards (ícone + título + uma frase curta), fundo branco sobre o
`--color-background` da página. Ordem fixa (construtor de módulos primeiro,
por ser o carro-chefe para o público-alvo escolhido):

1. **Construtor de módulos** — "Crie tabelas, formulários e fluxos com os
   campos que seu processo precisa."
2. **Recrutamento em Kanban** — "Acompanhe candidatos fase a fase, do jeito
   que sua equipe de RH já pensa."
3. **Equipe & permissões** — "Defina quem vê e edita cada módulo, cargo por
   cargo."
4. **Automações** — "Deixe tarefas repetitivas rodarem sozinhas quando algo
   muda."

Ícones: usar Material Icons (já carregado globalmente via `index.html`),
mesmo padrão usado no resto do app — não introduzir uma nova biblioteca de
ícones só para esta página.

### Como funciona (seção 3)
3 passos numerados lado a lado (empilha em mobile), cada um com um
mini-ícone/forma abstrata (círculo numerado na cor primária) — sem fotos
nem screenshots reais:

1. **Crie seu módulo** — "Defina os campos que sua equipe precisa
   rastrear."
2. **Convide sua equipe** — "Cada pessoa entra com o nível de acesso
   certo."
3. **Automatize o que for repetitivo** — "O sistema trabalha enquanto
   vocês focam no resto."

### CTA final + Footer
- Faixa de destaque com fundo `--color-primary` sólido, texto branco:
  "Pronto pra montar o seu?" + botão branco "Criar conta grátis" →
  `/register`.
- Footer simples: logo pequena + texto de copyright ("© 2026 Levit") +
  links "Entrar" / "Criar conta". Sem links institucionais, redes sociais
  ou páginas (termos, privacidade, blog) que não existem no produto — não
  inventar links quebrados.

## Responsividade
Mobile-first: Hero empilha (texto acima, miniatura abaixo), grid de
destaques vira 1 coluna, passos "Como funciona" empilham verticalmente.
Navbar mantém logo + botão de CTA visível em mobile (link "Entrar" pode
virar só ícone ou ficar oculto atrás do botão principal, a critério da
implementação).

## Testes / verificação
- `npm run lint` e `npm run build` devem passar sem erros.
- Testar visualmente em desktop e mobile (viewport estreito) no dev
  server, cobrindo: usuário deslogado vê a landing em `/`; usuário logado
  que acessa `/` é redirecionado para `/dashboard`; os três CTAs
  ("Criar conta grátis" no navbar, no hero e na faixa final, e "Entrar")
  navegam para as rotas corretas; a animação do Hero roda em loop sem
  travar o layout.
