# Product

## Register

product

Nota: o app (dashboard, módulos, kanban, equipe) é a superfície primária e segue
registro de produto. A landing page pública (`/`, `src/pages/Landing.jsx`) é uma
exceção deliberada — uma superfície de marketing dentro do mesmo app — e deve
ser tratada com os critérios de página de marca (ver `reference/brand.md`)
sempre que for o alvo do trabalho.

## Users

Times operacionais de pequenas e médias empresas que querem montar seu próprio
sistema (tabelas, formulários, fluxos) sem depender de desenvolvimento sob
demanda. Chegam via a landing pública, geralmente comparando com planilhas ou
ferramentas genéricas, decidindo se vale criar uma conta. Depois de dentro,
usam o produto no dia a dia para cadastrar módulos, gerenciar candidatos em um
Kanban de recrutamento, gerenciar equipe/permissões e configurar automações.

## Product Purpose

O Levit é uma plataforma para montar sistemas internos sob medida: módulos
customizáveis (tabelas/formulários com campos definidos pelo usuário),
recrutamento em Kanban, gestão de equipe com permissões por módulo, e
automações. Sucesso = o visitante entende em segundos que pode construir o
próprio sistema sem código, e converte em cadastro (`/register`).

## Brand Personality

Direto e prático — frases curtas, foco em benefício concreto, sem jargão
"visionário" nem tom casual demais. Referência de energia de movimento (não de
paleta): landonorris.com (estúdio OFF+BRAND) — animações "speed-inspired"
ligadas ao scroll, transições cinemáticas entre seções, hover states com troca
de estado. A landing deve ter esse tipo de motion language aplicado às seções
(não ao herói principal), sem replicar a peça central de capacete 3D do site
de referência — aqui, quem ocupa esse lugar de destaque é a miniatura animada
do próprio produto.

## Anti-references

- O capacete 3D como peça central hero do site do Lando Norris — a ideia de
  "objeto 3D girando como centerpiece" não deve ser replicada aqui.
- Visual genérico de SaaS: cards idênticos em grade, eyebrow em caixa alta
  acima de cada seção, texto com gradiente, glassmorphism decorativo.

## Design Principles

1. **Movimento com propósito, não decoração.** Cada animação existe para
   guiar atenção ou comunicar hierarquia (reveal no scroll, hover states),
   nunca só para "parecer moderno".
2. **O produto é o herói.** A miniatura animada do app real carrega o peso
   visual que, no site de referência, é do capacete — não precisa de um
   elemento 3D à parte.
3. **Direto, sem enrolação.** Cada seção existe uma vez; CTAs de conversão
   ("Criar conta grátis"/"Entrar") aparecem o mínimo de vezes necessário para
   converter, não em toda dobra da página.
4. **Consistência com o produto logado.** Paleta (`--color-primary` #534BAF e
   tokens vizinhos em `index.css`) e componentes (Material Icons, Tailwind)
   compartilhados com o app — a landing pode respirar mais (tipografia maior,
   mais movimento), mas não pode parecer um produto diferente.

## Accessibility & Inclusion

Boas práticas padrão: contraste AA, foco visível em todos os elementos
interativos, e alternativa via `prefers-reduced-motion` para toda animação
(crossfade/instantâneo no lugar de movimento). Sem requisito formal de WCAG
além disso.
