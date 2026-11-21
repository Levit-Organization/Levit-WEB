# Issues do Levit

Tudo o que foi alterado (e o que falta) organizado em issues para o GitHub. Cada arquivo tem
título e labels no topo e o corpo pronto para colar.

- **16 concluídas no código**, ainda **sem commit e sem revisão do time**: servem para revisar, abrir PR e acompanhar.
- **10 pendentes**: o que falta para colocar tudo no ar e o que ficou de fora.

## Concluídas (aguardando revisão)

| # | Issue | Labels |
|---|---|---|
| [01](01-desempenho-divisao-por-rota-cache-de-dados-e-fontes-locais.md) | [Front] Desempenho: divisão por rota, cache de dados e fontes locais | `frontend`, `desempenho`, `concluído` |
| [02](02-ux-dialogos-acessiveis-avisos-confirmacoes-e-estados-de-erro.md) | [Front] UX: diálogos acessíveis, avisos, confirmações e estados de erro | `frontend`, `ux`, `acessibilidade`, `concluído` |
| [03](03-kanban-de-recrutamento-atualizacao-automatica-e-movimento-ot.md) | [Front] Kanban de recrutamento: atualização automática e movimento otimista | `frontend`, `recrutamento`, `concluído` |
| [04](04-testes-automatizados-ci-e-atualizacao-de-dependencias.md) | [Infra] Testes automatizados, CI e atualização de dependências | `infra`, `testes`, `concluído` |
| [05](05-uma-automacao-com-varios-gatilhos-criar-editar-e-excluir.md) | [Automações] Uma automação com vários gatilhos (criar, editar e excluir) | `backend`, `frontend`, `automações`, `concluído` |
| [06](06-historico-testar-antes-de-ligar-retentativas-e-pausa-automat.md) | [Automações] Histórico, testar antes de ligar, retentativas e pausa automática | `backend`, `frontend`, `automações`, `concluído` |
| [07](07-notificacoes-dentro-da-plataforma-e-condicoes-de-mudanca.md) | [Automações] Notificações dentro da plataforma e condições de mudança | `backend`, `frontend`, `automações`, `notificações`, `concluído` |
| [08](08-condicoes-e-ou-acoes-sobre-os-dados-e-gatilhos-do-quadro-de-.md) | [Automações] Condições E/OU, ações sobre os dados e gatilhos do quadro de recrutamento | `backend`, `frontend`, `automações`, `concluído` |
| [09](09-landing-page-refeita-movimento-produto-como-protagonista-pro.md) | [Front] Landing page refeita (movimento, produto como protagonista, prova de valor) | `frontend`, `landing`, `concluído` |
| [10](10-desempenho-menos-idas-ao-banco-conexao-persistente-e-compres.md) | [Back] Desempenho: menos idas ao banco, conexão persistente e compressão | `backend`, `desempenho`, `concluído`, `decisão do time` |
| [11](11-convite-por-e-mail-com-mensagem-e-pagina-para-aceitar.md) | [Equipe] Convite por e-mail com mensagem e página para aceitar | `backend`, `frontend`, `equipe`, `concluído` |
| [12](12-recuperar-senha-por-e-mail.md) | [Auth] Recuperar senha por e-mail | `backend`, `frontend`, `auth`, `concluído` |
| [13](13-identidade-unica-e-glossario-em-todas-as-telas.md) | [Coerência] Identidade única e glossário em todas as telas | `frontend`, `backend`, `coerência`, `concluído` |
| [14](14-ver-qualquer-tabela-como-quadro.md) | [Tabelas] Ver qualquer tabela como quadro | `frontend`, `tabelas`, `concluído` |
| [15](15-modelos-prontos-ao-criar-uma-tabela.md) | [Tabelas] Modelos prontos ao criar uma tabela | `frontend`, `tabelas`, `concluído` |
| [16](16-fim-dos-campos-que-nao-salvavam-e-tela-inicial-da-empresa-in.md) | [Coerência] Fim dos campos que não salvavam e tela inicial da empresa inteira | `frontend`, `coerência`, `ux`, `concluído` |

## Pendentes

| # | Issue | Labels |
|---|---|---|
| [17](17-colocar-no-ar-migracoes-worker-da-fila-cron-e-variaveis-de-a.md) | [Infra] Colocar no ar: migrações, worker da fila, cron e variáveis de ambiente | `infra`, `pendente`, `deploy` |
| [18](18-mensagens-de-validacao-em-portugues.md) | [Back] Mensagens de validação em português | `backend`, `pendente`, `coerência` |
| [19](19-webhooks-bloquear-rede-interna-ssrf-e-assinar-o-envio.md) | [Segurança] Webhooks: bloquear rede interna (SSRF) e assinar o envio | `backend`, `segurança`, `pendente` |
| [20](20-retencao-do-historico-de-automacoes-lgpd.md) | [Back] Retenção do histórico de automações (LGPD) | `backend`, `pendente`, `segurança` |
| [21](21-testes-de-integracao-com-banco.md) | [Back] Testes de integração com banco | `backend`, `testes`, `pendente` |
| [22](22-ambiente-de-desenvolvimento-separado-do-banco-do-time.md) | [Infra] Ambiente de desenvolvimento separado do banco do time | `infra`, `pendente` |
| [23](23-renomear-as-rotas-de-tela-de-modulos-para-tabelas.md) | [Coerência] Renomear as rotas de tela de /modulos para /tabelas | `frontend`, `pendente`, `coerência`, `decisão do time` |
| [24](24-paginacao-no-servidor-para-itens-e-quadros.md) | [Back] Paginação no servidor para itens e quadros | `backend`, `frontend`, `desempenho`, `pendente` |
| [25](25-tempo-real-para-quadros-e-notificacoes-sse-websocket.md) | [Back] Tempo real para quadros e notificações (SSE/WebSocket) | `backend`, `frontend`, `pendente` |
| [26](26-sessao-mais-segura-token-fora-do-localstorage.md) | [Front] Sessão mais segura (token fora do localStorage) | `frontend`, `backend`, `segurança`, `pendente` |

## Como criar no GitHub

**Opção 1: script (cria todas de uma vez)**

1. Instale o GitHub CLI e faça login: `sudo apt install gh` e `gh auth login`.
2. Simule (não cria nada, só mostra): `bash docs/issues/criar-issues.sh`
3. Crie de verdade: `bash docs/issues/criar-issues.sh --criar`

O script cria as labels que faltarem e uma issue por arquivo em `Levit-Organization/Levit-WEB`.

**Opção 2: manual** — abra cada arquivo, copie o título e o corpo (sem o bloco `---` do topo) para
uma issue nova e aplique as labels indicadas.

## Sugestão de ordem para os PRs

1. Infra e correções que destravam o resto: #17 (colocar no ar), #04 (testes/CI).
2. Backend em partes pequenas: #10 (desempenho), #11 e #12 (convite e senha), #05 a #08 (automações e notificações).
3. Frontend: #01 a #03, #13 a #16, #09 (landing).
4. Pendentes por prioridade: #18 (validação em português), #19 (segurança dos webhooks), #21 (testes de integração).
