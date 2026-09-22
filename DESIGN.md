# Design

Sistema visual do Levit. A fonte da verdade é `client-frontend/src/index.css`
(tokens) e `client-frontend/src/components/ui/` (componentes). Este documento
explica as decisões; o código executa.

## Direção

Plataforma de RH acolhedora, com pessoas em primeiro plano. Referência de
categoria: Gupy, BambooHR. O oposto do que se busca: um CRUD genérico de
tabelas, que é o que a interface parecia antes.

O que carrega a leitura de "RH":

1. **Pessoa é o objeto principal.** Avatar com cor própria em toda lista de
   gente, nome como chave visual, e-mail e cargo como apoio.
2. **Funil tem semântica.** A cor da etapa vem da posição no pipeline e cresce
   em intensidade até fechar em verde na última. Tempo parado na etapa aparece
   no cartão, porque é isso que faz alguém agir.
3. **Estado tem vocabulário.** Ativo, pendente, inativo, parado, acesso total:
   cada um com cor própria. Nada de tudo verde.

A temperatura vem de raio, espaçamento, avatar e cor. Não de fonte arredondada
nem de ilustração.

## Cor

Âncora travada da marca: **`#534BAF` = `oklch(47.63% 0.154 282.4)`**. Veio do
Figma, é a identidade, não muda.

Neutros levam 0.004–0.014 de chroma na direção do roxo. Cinza puro é o que
fazia a interface parecer sistema genérico.

Três camadas de superfície, do chrome ao conteúdo:

| Token | Uso |
|---|---|
| `sidebar` | Navegação, chrome do app |
| `background` | Canvas da página |
| `surface` | Card, modal, drawer, campo |

Texto, do mais forte ao mais fraco: `ink` (título) → `ink-soft` (corpo) →
`light-text` (secundário) → `faint`.

> **`faint` é só decorativo ou desabilitado.** Ele dá 3.0:1 na sidebar e 3.37:1
> no branco, ou seja, reprova em AA para texto normal. Se a pessoa precisa ler,
> use `light-text` (4.6–5.5:1 em todas as superfícies).

Estado: `success`, `warning`, `danger`, `info`, cada um com par `-bg`.
Funil: `stage-1` a `stage-5` com par `-bg`.
Pessoas: `people-1` a `people-6` com par `-bg`, sorteados por hash do nome, de
forma que a mesma pessoa tem a mesma cor em qualquer tela.

Todo texto do sistema foi conferido numericamente contra as superfícies
`surface`, `background`, `sidebar` e `primary-100`. O menor valor aceito é
4.5:1 para texto normal e 3:1 para texto grande.

## Tipografia

**Archivo**, uma família só, já carregada no `index.html`. Antes ela era baixada
e nunca aplicada: o app rodava na fonte de sistema.

Escala fixa em rem (produto, não landing: o usuário lê em DPI constante),
razão ~1.2 entre passos: `2xs` 11 · `xs` 12 · `sm` 14 (corpo padrão) · `base` 16
· `lg` 18 · `xl` 22 · `2xl` 26 (título de página) · `3xl` 32 · `4xl` 40.

`text-wrap: balance` em h1–h4, `pretty` em parágrafo. `.tabular` para número em
tabela e kanban.

## Forma e profundidade

Raio: `md` 10px (controle) · `lg` 14px (card, campo) · `xl` 18px (painel, modal)
· `2xl` 24px.

Sombra tintada no roxo, nunca preto puro: `xs` a `lg`, mais `drawer`. Card em
repouso usa `shadow-xs`; elevação só em hover de item clicável.

## Movimento

150–250ms, `ease-out-quart` ou `ease-out-expo`. Movimento comunica estado
(hover, drag, entrada de modal, troca de página) e nada além disso.
`prefers-reduced-motion: reduce` derruba tudo para ~0ms, globalmente.

## Componentes

Tudo em `client-frontend/src/components/ui/`, exportado pelo barrel `index.js`.

Primitivos: `Button` (variantes primary/secondary/danger/ghost/subtle, com
estados hover/active/disabled/loading), `Input`, `Textarea`, `Select` (os três
compartilham `fieldClasses` e `FieldShell`, e aceitam `icon`), `Toggle`,
`Badge` (7 variantes, com `dot`), `Alert` (error/success/warning/info),
`Spinner`, `Modal`, `Drawer`.

Compostos: `Card`, `Skeleton`, `EmptyState`, `StatCard`, `Avatar`, `PageHeader`.

Utilitários de domínio em `funil.js`: `coresDaFase(indice, total)`,
`tempoRelativo(data)`, `estaParado(data, limiteDias)`.

Regras de uso:

- Loading é `Skeleton` com a forma do conteúdo, não spinner no meio da tela.
- Estado vazio ensina o próximo passo. "Nenhum X encontrado" sozinho não basta:
  diga o que aquilo faz e ofereça a saída.
- Classe de cor montada em runtime não funciona (o JIT do Tailwind não lê nome
  de classe dinâmico). As paletas de pessoa e de funil estão escritas por
  extenso em `Avatar.jsx` e `funil.js` por isso.

## Proibido

- Faixa lateral colorida (`border-left` grosso) como indicador de ativo ou de
  destaque. Era assim que a navegação marcava a página atual; virou item
  preenchido com raio.
- Texto com gradiente, glassmorphism decorativo, card dentro de card.
- Cor crua do Tailwind (`gray-*`, `slate-*`, `emerald-*`, `amber-*`) em código
  novo. Se falta um tom, o lugar de resolver é o `@theme`, não a classe.
- Cinza claro "por elegância" em texto que precisa ser lido.
