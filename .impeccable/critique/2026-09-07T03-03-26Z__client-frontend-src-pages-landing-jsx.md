---
target: landing page (client-frontend/src/pages/Landing.jsx)
total_score: 28
p0_count: 0
p1_count: 3
timestamp: 2026-09-07T03-03-26Z
slug: client-frontend-src-pages-landing-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Navbar reage ao scroll, botões têm estados; sem indicador de seção ativa no scroll |
| 2 | Match System / Real World | 4 | Copy direta, termos do domínio do próprio público (Kanban, módulos) |
| 3 | User Control and Freedom | 3 | n/a em boa parte — página estática sem fluxos a escapar |
| 4 | Consistency and Standards | 3 | "Começar agora" (CTA final) vs "Criar conta grátis" (resto) para o mesmo destino |
| 5 | Error Prevention | 3 | n/a — sem formulário/ação destrutiva nesta página |
| 6 | Recognition Rather Than Recall | 4 | Poucos links, CTAs repetidos nos pontos certos, ícones com texto |
| 7 | Flexibility and Efficiency | 2 | Esperado para landing page — nenhum atalho além da âncora |
| 8 | Aesthetic and Minimalist Design | 2 | Camada decorativa (6+ loops infinitos, cortes diagonais duplos, blob) compete com o conteúdo |
| 9 | Error Recovery | 3 | n/a — sem erros possíveis nesta página |
| 10 | Help and Documentation | 1 | Zero FAQ, preço, prova social ou contato |
| **Total** | | **28/40** | **Bom, no limite inferior da faixa** |

## Anti-Patterns Verdict

**Avaliação do design (LLM)**: A página evita com sucesso os clichês clássicos de IA da lista de banimento — sem gradiente em texto, sem glassmorphism, sem grade de cards idênticos (optou por linhas alternadas com miniatura viva), sem eyebrow em caixa alta, sem gradiente roxo-azul. Isso foi intencional (há comentários no próprio CSS confirmando).

Onde a crítica muda de figura: a combinação **mockup em "frame de navegador" com pontinhos + leve rotação + sombra colorida** é, ironicamente, um dos clichês mais reconhecíveis de landing page gerada por template/gerador de IA de 2023-2025 — trocar a cor não resolve o formato. Some a isso o **blob decorativo de canto** na faixa de CTA (quadrado rotacionado, cor sólida) e os **cortes diagonais duplos** entre seções — cada um desses é clichê de geração anterior de templates (Bootstrap/Wix-era e depois AI-landing-era). Veredito: evitou a lista óbvia de banimentos e caiu no "kit de peças genérico" da categoria seguinte — menos óbvio, mas reconhecível pra quem olha com atenção.

**Scan determinístico**: `detect.mjs` rodado contra `Landing.jsx` e `index.html` — **0 achados, saída limpa (exit 0)**. O scanner automático não capta os padrões de composição (frame+tilt, blob, diagonais) citados acima — são julgamento de design, não regex.

**Evidência visual em navegador**: não disponível nesta sessão — a extensão Claude in Chrome não conectou em nenhuma tentativa (múltiplas ao longo da conversa). A crítica acima é 100% baseada em leitura de código e cálculo de CSS (breakpoints, clip-path, dimensões fixas), não em captura de tela real. Isso é uma limitação real, não uma formalidade — recomendo verificação visual antes de tratar os pontos de layout (P2 abaixo) como definitivos.

## Overall Impression

O conteúdo e a estrutura de informação são genuinamente bons — copy direta, hierarquia correta, zero jargão, decisão certa de fugir do grid de cards. O problema não é o que a página diz, é a quantidade de decoração simultânea por cima disso: seis animações em loop infinito rodando em períodos não sincronizados fazem a página nunca "descansar" visualmente, e a maior oportunidade é reduzir a camada decorativa em vez de adicionar mais — o oposto da direção "mais chamativa" pedida antes, mas é o que a leitura honesta do código mostra.

## What's Working

1. **Navegação real, não teatro de UI** — todos os CTAs são links reais do React Router, o link "Ver como funciona" funciona por âncora nativa mesmo sem JS, hierarquia de heading correta (h1 único, h2 por seção).
2. **`prefers-reduced-motion` implementado de verdade em 6+ blocos diferentes**, um por sistema de animação — e o componente `Reveal` é defensivo por design (começa visível, só se esconde se confirmar que vai poder reaparecer). É engenharia de acessibilidade real, não caixa marcada.
3. **A fuga do grid de cards idênticos foi a decisão certa** — linhas alternadas com miniatura funcional em vez de ícone+título+texto repetido 4x.

## Priority Issues

**[P1] Link "Entrar" desaparece completamente abaixo de 640px.**
- Why it matters: `hidden sm:block` no link de login (linha ~288) — qualquer visitante mobile com conta existente não tem como fazer login a partir desta página.
- Fix: nunca esconder a ação de login inteiramente; usar um rótulo menor ou botão outline ao lado do CTA primário.
- Suggested command: `/impeccable adapt`

**[P1] Seis animações em loop infinito, quatro períodos não sincronizados — a página nunca assenta visualmente.**
- Why it matters: `heroScene1/2/3` (12s), `heroRowIn` (3s escalonado), `heroMoveAcross`+`heroCursorMove` (4s), `ctaDrift` (16s) — nenhum é múltiplo do outro, então o olho é puxado por movimento residual o tempo todo. Contradiz o próprio princípio "movimento com propósito" do `PRODUCT.md`. Bônus: o card do Kanban continua se movendo dentro da seção de features também, não só no hero (só as linhas de lista foram zeradas lá, não o card+cursor do Kanban).
- Fix: um ritmo dominante por área (o ciclo de 12s do hero), aposentar ou sincronizar as animações internas concorrentes.
- Suggested command: `/impeccable quieter`

**[P1] Zero sinal de confiança pra quem decide entre isso e uma planilha.**
- Why it matters: sem preço, FAQ, logo de cliente, depoimento ou número — exatamente o que o público descrito no `PRODUCT.md` ("comparando com planilhas... decidindo se vale criar uma conta") precisaria antes de se comprometer. Heurística 10 (1/4) capta isso.
- Fix: pelo menos uma seção de prova social ou clareza sobre o plano gratuito antes do CTA final.
- Suggested command: `/impeccable shape` (decidir o que entra) seguido de `/impeccable craft`

**[P2] Mockup do herói tem geometria fixa em pixels sem nenhuma media query — risco real de ficar ilegível no mobile.**
- Why it matters: `.hero-app-sidebar` (130px fixos) + `.hero-app-shell` (320px de altura fixa) sem nenhum ajuste por breakpoint. Numa coluna mobile de ~300-330px, quase 40% da largura vira sidebar falsa. É o elemento "herói" do design (`PRODUCT.md` princípio 2) correndo risco de virar mancha ilegível na tela onde mais gente vê primeiro. **Inferência de CSS, não captura real — vale confirmar visualmente.**
- Fix: breakpoints reduzindo sidebar/altura proporcionalmente abaixo de 640px, ou trocar por barra superior compacta em telas estreitas.
- Suggested command: `/impeccable adapt`

**[P3] Em dash na copy visível quebra a regra explícita "sem em dash" do próprio skill.**
- Why it matters: linha do subtítulo do hero usa "—" — trivial, mas é uma regra sendo violada num texto que, fora isso, respeita bem as diretrizes.
- Fix: trocar por ponto, dois-pontos ou parênteses.
- Suggested command: `/impeccable clarify`

## Persona Red Flags

**Jordan (primeiro acesso, confuso)**: O mockup animado é só formas abstratas sem texto (confirmado no próprio comentário do código) — Jordan vê retângulos trocando de posição e não sabe que aquilo é um Kanban de recrutamento até chegar na seção de features, mais abaixo. O elemento mais chamativo da página comunica quase nada sozinho. E Jordan, que "procura ajuda constantemente" por definição, não tem pra onde ir — zero FAQ/contato (mesmo buraco do P1 de confiança).

**Riley (testador metódico)**: `color-mix()` (usado no destaque atrás de "sistema") é um recurso CSS relativamente recente — em navegador sem suporte, o destaque provavelmente some silenciosamente (degradação não-catastrófica, mas é o tipo de coisa que Riley documentaria). **Não testado em navegador real.** Em contrapartida, o fallback de `prefers-reduced-motion` é consistente o bastante que Riley provavelmente não consegue quebrar essa parte.

**Casey (mobile, distraído)**: O CTA fixo fica no topo (`sticky top-0`) — justamente a região mais difícil de alcançar com o polegar em uso de uma mão só; não há CTA fixo na parte inferior como alternativa. Mesmo problema de geometria fixa do P2 se aplica direto aqui. Ponto positivo real: zero imagens pesadas ou libs de animação JS, tudo é CSS — boa notícia numa conexão lenta. "Entrar" some no mobile (P1) afeta Casey com conta existente diretamente.

## Minor Observations

- `tracking-[-0.03em]` no `<h1>` é redundante — `.landing-display` já define o mesmo `letter-spacing` no CSS.
- `.landing-display` redeclara `font-family: 'Archivo'` que `.landing-page` (container raiz) já herda pra toda a árvore.
- "Começar agora" vs "Criar conta grátis" pro mesmo destino (mesmo ponto da heurística 4).
- Nenhum estilo customizado de `:focus-visible` — provavelmente cai no anel azul padrão do navegador, destoando da paleta roxa.
- Copyright do footer em `text-xs` (12px) — menor texto da página inteira, num arquivo que no resto usa tipografia generosa.
- A grade sutil de fundo do herói (`.landing-hero-bg::before`, opacidade baixa, mascarada radialmente) é o tipo de decoração que funciona — contraste direto com o blob do CTA, que não tem essa mesma contenção.

## Questions to Consider

1. Se o mockup do herói é "o herói" do design, por que ele gira por três cenas sozinho enquanto três outras animações internas competem por atenção ao mesmo tempo? E se a troca de cena virasse algo que o visitante controla ao passar o mouse pelos itens de nav, em vez de rodar pra sempre sozinho?
2. A faixa de CTA final tenta ser o momento mais confiante da página e é, ao mesmo tempo, o trecho com mais efeitos simultâneos. Uma versão mais confiante seria mais decorada, ou mais quieta?
3. Um time de PME comparando isso com planilha não vê nenhum nome de cliente, número ou preço. Foi decisão deliberada de manter a página curta, ou um vazio que ninguém preencheu ainda?
4. Se os dois cortes diagonais e o blob de canto saíssem agora, a página perderia informação, ou só ficaria mais fácil de descansar o olho nela?
