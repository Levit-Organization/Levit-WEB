# Product

## Register

product

Nota: o app (início, tabelas, quadros, equipe, automações) é a superfície primária e segue
registro de produto. A landing page pública (`/`, `src/pages/Landing.jsx`) é uma
exceção deliberada — uma superfície de marketing dentro do mesmo app — e deve
ser tratada com os critérios de página de marca (ver `reference/brand.md`)
sempre que for o alvo do trabalho.

## Users

Times operacionais de pequenas e médias empresas que querem montar seu próprio
sistema (tabelas, formulários, fluxos) sem depender de desenvolvimento sob
demanda. Chegam via a landing pública, geralmente comparando com planilhas ou
ferramentas genéricas, decidindo se vale criar uma conta. Depois de dentro,
usam o produto no dia a dia para organizar tabelas, acompanhar quadros de
etapas (como o de recrutamento), gerenciar a equipe e os acessos, e configurar
automações.

## Product Purpose

**Identidade (decidida em 10/2026): o Levit centraliza o trabalho da equipe num
lugar só.** Tabelas, quadros, avisos, e-mails e acessos da equipe juntos, em vez
de espalhados entre planilhas, mensagens e caixa de entrada. Recrutamento é um
quadro pronto, um dos usos, e não a identidade do produto.

Sucesso = o visitante entende em segundos que pode organizar a empresa inteira
num lugar só, sem código, e converte em cadastro (`/register`).

## Glossário (obrigatório em toda superfície)

Mesmas palavras na landing, no menu, nos títulos, nos estados vazios, nos
e-mails e nas mensagens de erro (inclusive as que vêm da API). Nomes de código,
rotas e tabelas do banco continuam como estão (`modulo`, `registro`, `campo`).

| Conceito (código) | Palavra na tela |
|---|---|
| módulo | **Tabela** |
| campo | **Coluna** |
| registro | **Item** |
| kanban / funil | **Quadro** |
| gatilho / condição / ação | **Quando / Se / Então** |
| nível visualizar / editar / gerenciar | **Só ver / Editar / Tudo** |
| automação | **Automação** |

Português do Brasil em tudo ("senha", nunca "palavra-passe"). Sem termos que
excluam o público (ex.: "e-mail corporativo"). Textos de exemplo e estados
vazios falam da operação inteira (clientes, pedidos, estoque), não só de RH.

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
