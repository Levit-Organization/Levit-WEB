# Todas as issues (para leitura)

Gerado a partir dos arquivos desta pasta. Para editar, altere o arquivo da issue.

---

## 01. [Front] Desempenho: divisão por rota, cache de dados e fontes locais

**Labels:** frontend, desempenho, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
O app carregava todas as páginas de uma vez, refazia as mesmas chamadas em cada tela e baixava fontes do Google em tempo de execução.

### O que foi feito
- Páginas carregadas sob demanda (`React.lazy`) com pré-carregamento ao passar o mouse no menu.
- Cache de dados com React Query (30 s de validade, sem repetir erros 4xx) e invalidação automática depois de qualquer escrita (`skipInvalidate` para optar por não invalidar).
- Bibliotecas em pacotes separados (`manualChunks`): React, roteador, React Query e axios ficam em cache entre deploys.
- Fonte Archivo e ícones servidos localmente (`@fontsource/archivo`, `material-icons`, só a variante usada).
- Imagens de fundo convertidas para WebP (de ~600 KB para ~15 KB).
- Removida a dependência `firebase`, que não era usada.
- Busca com debounce e cancelamento da requisição anterior.

### Arquivos principais
- `client-frontend/vite.config.js`
- `client-frontend/src/App.jsx`
- `client-frontend/src/routes/lazyPages.js`
- `client-frontend/src/lib/queryClient.js`
- `client-frontend/src/hooks/queries.js`
- `client-frontend/src/services/api.js`
- `client-frontend/src/main.jsx`
- `client-frontend/src/material-icons.css`
- `client-frontend/package.json`

### Como testar
- [ ] `npm run build`: conferir os chunks `vendor-*` e um arquivo por página.
- [ ] Navegar entre telas: dados já vistos aparecem na hora, sem carregamento.
- [ ] Aba de rede: nenhuma requisição a fonts.googleapis.com.

### Atenção
- As imagens antigas `public/background 2.png` e `background 3.png` ainda estão no repositório e podem ser apagadas.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 02. [Front] UX: diálogos acessíveis, avisos, confirmações e estados de erro

**Labels:** frontend, ux, acessibilidade, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Faltavam feedback consistente, confirmações seguras e acessibilidade básica em modais e no menu.

### O que foi feito
- `Modal` e `Drawer` com foco preso, retorno do foco, Esc, trava de rolagem, animação de saída e confirmação ao fechar com alterações não salvas.
- `FeedbackProvider`: avisos (toasts) e confirmações por promessa (`useToast`, `useConfirm`), no lugar de `alert`/`confirm`.
- Menu lateral responsivo (gaveta no celular com `inert`), recolhimento lembrado e link "Pular para o conteúdo".
- Sessão expirada vira aviso e volta ao login sem recarregar; login/logout sincronizam entre abas.
- Paginação e ordenação nas listas, `ErrorBoundary`, página 404, títulos de aba por rota e máscaras de telefone/CPF/CNPJ.
- Ícones decorativos marcados com `aria-hidden` (leitores de tela liam "add Criar conta").

### Arquivos principais
- `client-frontend/src/components/ui/useDialog.js`
- `client-frontend/src/components/ui/Modal.jsx`
- `client-frontend/src/components/ui/Drawer.jsx`
- `client-frontend/src/context/FeedbackProvider.jsx`
- `client-frontend/src/components/Layout.jsx`
- `client-frontend/src/context/AuthContext.jsx`
- `client-frontend/src/components/ErrorBoundary.jsx`
- `client-frontend/src/pages/NotFound.jsx`

### Como testar
- [ ] Abrir um formulário, digitar e apertar Esc: deve pedir confirmação.
- [ ] Navegar só com Tab dentro de um modal: o foco não sai dele.
- [ ] No celular, abrir e fechar o menu.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 03. [Front] Kanban de recrutamento: atualização automática e movimento otimista

**Labels:** frontend, recrutamento, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
O quadro de recrutamento só mudava depois de ação do próprio usuário; mudanças de colegas não apareciam.

### O que foi feito
- Atualização a cada 15 s (só com a aba visível) e ao voltar para a aba.
- A atualização pausa durante um arraste e enquanto um movimento está sendo gravado (evita o cartão "voltar").
- Movimento otimista com desfazer por cartão se a API falhar; cartões e colunas memoizados; colunas mostram 30 cartões por vez.

### Arquivos principais
- `client-frontend/src/pages/RecrutamentoKanban.jsx`
- `client-frontend/src/components/kanban/`
- `client-frontend/src/utils/kanban.js`

### Como testar
- [ ] Abrir o quadro em duas abas, mover um candidato em uma: a outra atualiza em até 15 s.

### Atenção
- Não é tempo real (WebSocket/SSE); ver a issue de tempo real nas pendências.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 04. [Infra] Testes automatizados, CI e atualização de dependências

**Labels:** infra, testes, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Não havia testes nem CI no frontend.

### O que foi feito
- Vitest + Testing Library (hoje 86 testes no frontend) e PHPUnit com 52 testes unitários no backend, sem banco.
- GitHub Actions do frontend: lint, testes, build e `npm audit` das dependências de produção.
- Dependabot para npm, composer e Actions.
- axios atualizado (havia uma vulnerabilidade alta).

### Arquivos principais
- `.github/workflows/frontend.yml`
- `.github/dependabot.yml`
- `client-frontend/src/test/`
- `client-frontend/vite.config.js`
- `api-backend/tests/unit/`

### Como testar
- [ ] `npm test` em client-frontend.
- [ ] `php vendor/bin/phpunit tests/unit` em api-backend.

### Atenção
- O workflow nunca rodou no GitHub (precisa de push).
- Não há CI do backend nem testes de integração com banco.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 05. [Automações] Uma automação com vários gatilhos (criar, editar e excluir)

**Labels:** backend, frontend, automações, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Para avisar em criação, edição e exclusão era preciso criar três automações iguais.

### O que foi feito
- Coluna `automacao.gatilhos` (lista em JSON); a coluna antiga `gatilho` continua com o primeiro gatilho.
- API aceita `gatilhos` (novo) e `gatilho` (antigo). Formulário com seleção múltipla; lista mostra um selo por gatilho.
- Corrigido bug: `ModuloCampoModel` inexistente fazia falhar todo e-mail com `{{variável}}`.

### Arquivos principais
- `api-backend/app/Database/Migrations/2026-10-10-120000_AddGatilhosToAutomacaoTable.php`
- `api-backend/app/Services/AutomacaoService.php`
- `api-backend/app/Jobs/ProcessarAutomacoes.php`
- `client-frontend/src/pages/AutomacaoForm.jsx`

### Como testar
- [ ] Criar uma automação com os três gatilhos e conferir que dispara nos três casos.

### Atenção
- Depende da migração `120000`.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 06. [Automações] Histórico, testar antes de ligar, retentativas e pausa automática

**Labels:** backend, frontend, automações, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Falhas aconteciam em silêncio, não havia como testar uma automação e editar criava uma nova e apagava a antiga.

### O que foi feito
- Histórico por execução: passos, duração, tentativa e cópia dos dados (`GET .../execucoes`, paginado por cursor); botão Reexecutar.
- Simulação sem enviar nada (`POST .../automacoes/simular`), também com a definição ainda não salva.
- Retry: até 3 tentativas (1 min, 5 min) continuando da ação que falhou; erros definitivos (4xx, e-mail inválido) não repetem.
- Pausa automática depois de 5 falhas seguidas, com aviso a quem criou.
- Atualização real (`PUT .../automacoes/{id}`) mantendo id e histórico; estatísticas de 7 dias na lista numa consulta só.

### Arquivos principais
- `api-backend/app/Services/Automacao/AutomacaoExecutor.php`
- `api-backend/app/Exceptions/FalhaPermanenteException.php`
- `api-backend/app/Database/Migrations/2026-10-10-130000_AddExecucaoDetalhesToAutomacao.php`
- `client-frontend/src/components/automacoes/HistoricoExecucoes.jsx`
- `client-frontend/src/components/automacoes/SimulacaoModal.jsx`

### Como testar
- [ ] Webhook apontando para um endpoint que responde 500: ver 3 linhas no histórico com 1 e 5 minutos de intervalo.
- [ ] Repetir até 5 falhas: a automação pausa e o autor recebe notificação.

### Atenção
- O worker da fila precisa estar rodando: `php spark queue:work automacoes`.
- `automacao_log.dados` guarda dados dos itens: definir retenção (LGPD).

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 07. [Automações] Notificações dentro da plataforma e condições de mudança

**Labels:** backend, frontend, automações, notificações, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Não existiam notificações internas, e a condição "igual" disparava a cada edição do item.

### O que foi feito
- Tabela `notificacao`, API (listar, contagem, ler, ler todas, excluir), agrupamento ("3 novas candidaturas") e comando `php spark notificacoes:limpar`.
- Ação "Notificação" nas automações (toda a equipe, cargo ou pessoa — só quem tem acesso à tabela recebe).
- Avisos nativos: nova candidatura, convite aceito, automação pausada.
- Sino no menu com contador, painel com filtro e agrupamento por dia, título da aba com "(n)".
- Operadores "mudou", "mudou para" e "mudou de… para…".

### Arquivos principais
- `api-backend/app/Services/NotificacaoService.php`
- `api-backend/app/Controllers/NotificacaoController.php`
- `api-backend/app/Database/Migrations/2026-10-10-140000_CreateNotificacaoTable.php`
- `api-backend/app/Commands/LimparNotificacoes.php`
- `client-frontend/src/components/notificacoes/`
- `client-frontend/src/hooks/useNotificacoes.js`

### Como testar
- [ ] Receber uma candidatura e ver o sino contar.
- [ ] Condição "Status mudou para Fechado": editar outro campo de um item já fechado não dispara.

### Atenção
- Agendar `php spark notificacoes:limpar` no cron (diário).
- O índice parcial da tabela usa sintaxe do PostgreSQL.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 08. [Automações] Condições E/OU, ações sobre os dados e gatilhos do quadro de recrutamento

**Labels:** backend, frontend, automações, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Uma condição só, ações limitadas a avisar e nenhuma automação para candidatos.

### O que foi feito
- Até 10 condições combinadas por E/OU (coluna `condicoes` em JSON) e operadores contém, vazio, maior, menor etc.
- Ações "Atualizar coluna" (no próprio item) e "Criar item" (em outra tabela).
- Gatilhos "Novo candidato" e "Mudou de etapa", com os dados do candidato como variáveis.
- Proteção contra loop: a mesma automação não roda duas vezes na mesma cadeia e a cadeia para em 3 níveis.

### Arquivos principais
- `api-backend/app/Services/Automacao/Condicoes.php`
- `api-backend/app/Services/Automacao/CamposCandidato.php`
- `api-backend/app/Services/RegistroService.php`
- `api-backend/app/Services/CandidatoService.php`
- `api-backend/app/Database/Migrations/2026-10-10-150000_AddCondicoesToAutomacao.php`
- `client-frontend/src/components/automacoes/CondicoesEditor.jsx`
- `client-frontend/src/components/automacoes/AcoesDeDados.jsx`

### Como testar
- [ ] "Atualizar coluna" numa automação de atualização da mesma tabela: roda uma vez e não entra em loop.
- [ ] Mover candidato de etapa dispara a automação com `{{Etapa}}` correto.

### Atenção
- "Atualizar coluna" e "Criar item" não checam a permissão de quem disparou (só de quem configurou): confirmar a regra de negócio.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 09. [Front] Landing page refeita (movimento, produto como protagonista, prova de valor)

**Labels:** frontend, landing, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
A landing parecia "cartunizada", com pouca animação e sem explicar o produto.

### O que foi feito
- Hero com título revelado palavra a palavra e miniatura viva do produto (item criado → status muda → automação avisa).
- Faixa de exemplos que acelera com o scroll; tour fixo no scroll em seção escura com 4 capítulos; fluxo "Quando → Se → Então" desenhado pelo scroll.
- Comparação "Planilha vs Levit", números reais do produto, dúvidas frequentes e chamada final.
- Textos simples para leigos com a premissa "tudo num lugar só". Tudo respeita "reduzir movimento".

### Arquivos principais
- `client-frontend/src/pages/Landing.jsx`
- `client-frontend/src/pages/Landing.css`
- `client-frontend/src/components/landing/`

### Como testar
- [ ] Abrir `/` deslogado em desktop e celular.
- [ ] Ativar "reduzir movimento" no sistema: a página fica parada no estado final.

### Atenção
- Sem depoimentos ou logos de clientes (não havia dados reais).

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 10. [Back] Desempenho: menos idas ao banco, conexão persistente e compressão

**Labels:** backend, desempenho, concluído, decisão do time


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
O banco é remoto: abrir conexão custava ~1,5 s e cada consulta ~200 ms.

### O que foi feito
- `AuthFilter` com 1 consulta (antes 4): revogação, cargo e permissões juntos.
- Conexão persistente (`pConnect`), medida: requisição de ~2,2 s para ~1,0 s.
- Filtro de compressão gzip para respostas JSON acima de 1 KB.
- `GET /automacoes` (todas as automações visíveis numa chamada) e ações carregadas em lote.
- Frontend: pré-carrega os dados de cada tela ao passar o mouse no menu.

### Arquivos principais
- `api-backend/app/Filters/AuthFilter.php`
- `api-backend/app/Services/AuthService.php`
- `api-backend/app/Config/Database.php`
- `api-backend/app/Filters/CompressaoFilter.php`
- `api-backend/app/Config/Filters.php`
- `client-frontend/src/hooks/queries.js`

### Como testar
- [ ] Medir o tempo de uma rota autenticada antes/depois.

### Atenção
- **Decisão do time:** manter `pConnect` (limite de conexões do Aiven) e compressão no código ou mover para o servidor web.
- O ~1 s restante é distância até o banco: aproximar API e banco (mesma região).

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 11. [Equipe] Convite por e-mail com mensagem e página para aceitar

**Labels:** backend, frontend, equipe, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
O convite gerava token mas não mandava e-mail (e devolvia o token para quem convidava); não havia página de aceite.

### O que foi feito
- E-mail estilizado com quem convidou, mensagem opcional, cargo, validade e botão "Aceitar convite".
- Página `/convite/:token`: mostra o convite, a pessoa escolhe nome e senha e entra já logada.
- Convites pendentes na tela de equipe com Reenviar e Cancelar; convidar de novo reaproveita o convite.
- Token não sai mais na API (só no e-mail; banco guarda hash). Limite de tentativas próprio para a página do convite.
- Modo de e-mail simulado (`EMAIL_PROVIDER=log`) grava em `writable/logs/emails-simulados.log` e `ultimo-email.html`.

### Arquivos principais
- `api-backend/app/Services/EquipeService.php`
- `api-backend/app/Services/Email/ModeloConvite.php`
- `api-backend/app/Services/Email/LogEmailService.php`
- `api-backend/app/Database/Migrations/2026-10-11-090000_AddMensagemToConviteTable.php`
- `api-backend/app/Filters/RateLimitFilter.php`
- `client-frontend/src/pages/AceitarConvite.jsx`
- `client-frontend/src/pages/TeamManagement.jsx`

### Como testar
- [ ] Convidar um e-mail seu, abrir o link e aceitar.
- [ ] Reenviar: o link antigo deixa de funcionar.

### Atenção
- Definir `FRONTEND_URL` no `.env` (link do e-mail).
- Brevo: em produção, cadastrar o IP fixo do servidor e religar o bloqueio por IP.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 12. [Auth] Recuperar senha por e-mail

**Labels:** backend, frontend, auth, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
"Esqueceu a senha?" levava a telas que chamavam rotas inexistentes (beco sem saída). As colunas no banco já existiam.

### O que foi feito
- `POST /auth/forgot-password`: resposta igual exista ou não a conta; e-mail com link válido por 60 min, de uso único.
- `POST /auth/reset-password`: troca a senha e invalida o link. Limite de tentativas.
- Textos das duas telas reescritos.

### Arquivos principais
- `api-backend/app/Services/AuthService.php`
- `api-backend/app/Controllers/AuthController.php`
- `api-backend/app/Services/Email/ModeloRedefinicaoSenha.php`
- `api-backend/app/Models/UsuarioModel.php`
- `client-frontend/src/pages/ForgotPassword.jsx`
- `client-frontend/src/pages/ResetPassword.jsx`

### Como testar
- [ ] Pedir recuperação para o seu e-mail, abrir o link, trocar a senha e entrar.
- [ ] Usar o mesmo link de novo: deve recusar.

### Atenção
- As sessões já abertas em outros aparelhos continuam válidas após trocar a senha.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 13. [Coerência] Identidade única e glossário em todas as telas

**Labels:** frontend, backend, coerência, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
O produto se apresentava de quatro jeitos (organizador geral, "Recrutamento e equipe", "plataforma de RH"...) e cada tela usava palavras diferentes.

### O que foi feito
- Identidade: "centralizar o trabalho da equipe num lugar só", registrada no `PRODUCT.md` e no `DESIGN.md`.
- Glossário: módulo → tabela, campo → coluna, registro → item, kanban/funil → quadro, Seleção Única → lista de opções; senha (não "palavra-passe"); sem "e-mail corporativo".
- Também nas mensagens de erro do backend (~50 frases).
- Menu: Organizar (Tabelas, Recrutamento, Automações) · Pessoas (Equipe). Textos de RH viraram textos da operação inteira.
- Login, cadastro, senha e convite com o visual da landing (sem o fundo de cidade).

### Arquivos principais
- `PRODUCT.md`
- `DESIGN.md`
- `client-frontend/src/pages/AuthLayout.jsx`
- `client-frontend/src/components/Layout.jsx`
- `api-backend/app/Services/*.php (mensagens)`

### Como testar
- [ ] Percorrer todas as telas procurando "módulo", "registro", "campo" ou "funil".

### Atenção
- As rotas continuam `/modulos/...` (decisão consciente).

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 14. [Tabelas] Ver qualquer tabela como quadro

**Labels:** frontend, tabelas, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
A landing prometia "quadros de tarefas", mas só o recrutamento tinha quadro.

### O que foi feito
- Alternância Lista | Quadro em tabelas com coluna de lista; cada opção vira uma coluna (mesmas cores do quadro de recrutamento).
- Mover arrastando ou pelo seletor no cartão (funciona no celular e no teclado); otimista com desfazer.
- "Agrupar por" quando há mais de uma lista; coluna "Sem …" para itens sem valor; escolha lembrada por tabela.

### Arquivos principais
- `client-frontend/src/components/quadro/QuadroItens.jsx`
- `client-frontend/src/pages/ModuleRecords.jsx`
- `client-frontend/src/services/registroService.js`

### Como testar
- [ ] Tabela com coluna "Status": alternar para Quadro e mover itens.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 15. [Tabelas] Modelos prontos ao criar uma tabela

**Labels:** frontend, tabelas, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Começar uma tabela do zero era difícil e não ligava a vitrine ao produto.

### O que foi feito
- "Comece por um modelo": Clientes e vendas, Tarefas da equipe, Estoque, Pedidos internos e Vaga de recrutamento.
- Preenche nome, ícone, tipo e colunas (tudo editável); só pede confirmação se a pessoa já editou algo.
- "Tipo de tabela" virou "O que você quer organizar?" com opções descritas pelo uso.

### Arquivos principais
- `client-frontend/src/utils/modelosTabela.js`
- `client-frontend/src/pages/ModuleForm.jsx`

### Como testar
- [ ] Criar uma tabela pelo modelo "Tarefas da equipe" e abrir como quadro.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 16. [Coerência] Fim dos campos que não salvavam e tela inicial da empresa inteira

**Labels:** frontend, coerência, ux, concluído


**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

### Contexto
Havia campos que não salvavam e a tela inicial era um painel de recrutamento.

### O que foi feito
- Removidos "Descrição" e "Frequência máxima" (automação) e "Status" (pessoa). Coluna "Status" da equipe virou "Na equipe desde".
- Tela inicial: números da empresa (tabelas, automações, equipe, atenção), "Suas tabelas" primeiro, "Precisa da sua atenção" e resumos de recrutamento e equipe.
- Quadro de recrutamento com o mesmo cartão e seletor de etapa do quadro das tabelas.
- "Webhook" virou "Avisar outro sistema" para o usuário.

### Arquivos principais
- `client-frontend/src/pages/Dashboard.jsx`
- `client-frontend/src/components/kanban/KanbanCard.jsx`
- `client-frontend/src/pages/TeamManagement.jsx`
- `client-frontend/src/pages/AutomacaoForm.jsx`
- `client-frontend/src/utils/automacaoConstants.js`

### Como testar
- [ ] Entrar e conferir a tela inicial com e sem tabelas.
- [ ] No celular, mover um candidato pelo seletor do cartão.

### Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação

---

## 17. [Infra] Colocar no ar: migrações, worker da fila, cron e variáveis de ambiente

**Labels:** infra, pendente, deploy


**Status:** Pendente.

### Contexto
As mudanças acima dependem de configuração e processo para funcionar em produção.

### O que fazer
- [ ] Revisar e rodar as migrações de `2026-10-10-*` e `2026-10-11-*` (+ as da fila: `php spark migrate --all`).
- [ ] Manter `php spark queue:work automacoes` rodando (supervisor).
- [ ] Agendar `php spark notificacoes:limpar` diariamente.
- [ ] Definir no `.env`: `FRONTEND_URL`, `CI_ENVIRONMENT`, `EMAIL_PROVIDER`.
- [ ] Brevo: IP fixo do servidor autorizado e bloqueio por IP religado.
- [ ] Fazer backup do banco antes de migrar.

### Arquivos principais
- `api-backend/app/Database/Migrations/`
- `api-backend/.env`

### Como testar
- [ ] `php spark migrate:status` sem pendências.

### Atenção
- Já foram rodadas no banco compartilhado (Aiven) durante o desenvolvimento: avisar o time.

---

## 18. [Back] Mensagens de validação em português

**Labels:** backend, pendente, coerência


**Status:** Pendente.

### Contexto
`defaultLocale = 'en'`: erros de validação aparecem em inglês ("The email field must contain...") junto com textos em português.

### O que fazer
- [ ] Trocar `defaultLocale`/`supportedLocales` para `pt-BR`.
- [ ] Adicionar `app/Language/pt-BR/Validation.php` com as mensagens traduzidas.
- [ ] Revisar nomes de campos exibidos nas mensagens (ex.: "cargo_id").

### Arquivos principais
- `api-backend/app/Config/App.php`
- `api-backend/app/Language/`

### Como testar
- [ ] Enviar um e-mail inválido no cadastro e conferir a mensagem.

---

## 19. [Segurança] Webhooks: bloquear rede interna (SSRF) e assinar o envio

**Labels:** backend, segurança, pendente


**Status:** Pendente.

### Contexto
A ação "Avisar outro sistema" aceita qualquer URL, inclusive endereços internos, e não assina o conteúdo.

### O que fazer
- [ ] Resolver o DNS e recusar IPs privados, loopback e link-local.
- [ ] Assinar o corpo com HMAC (`X-Levit-Assinatura`) com segredo por empresa.
- [ ] Limitar tamanho e redirecionamentos.

### Arquivos principais
- `api-backend/app/Services/Automacao/AutomacaoExecutor.php`

### Como testar
- [ ] Webhook para `http://127.0.0.1` deve ser recusado.

---

## 20. [Back] Retenção do histórico de automações (LGPD)

**Labels:** backend, pendente, segurança


**Status:** Pendente.

### Contexto
`automacao_log.dados` guarda uma cópia dos dados do item para permitir reexecutar.

### O que fazer
- [ ] Definir prazo (ex.: 90 dias) e criar comando de limpeza como o das notificações.
- [ ] Considerar guardar só o necessário para reexecutar.

### Arquivos principais
- `api-backend/app/Jobs/ProcessarAutomacoes.php`
- `api-backend/app/Commands/`

### Como testar
- [ ] Rodar o comando e conferir que só registros antigos somem.

---

## 21. [Back] Testes de integração com banco

**Labels:** backend, testes, pendente


**Status:** Pendente.

### Contexto
Só há testes unitários; autenticação, permissões, itens, quadro, financeiro e o job da fila não têm teste.

### O que fazer
- [ ] Banco de teste (PostgreSQL) no `phpunit.dist.xml`.
- [ ] Testes de cadastro, login, convite, recuperação de senha, itens e permissões.
- [ ] Teste do job de automações ponta a ponta.
- [ ] CI do backend no GitHub Actions.

### Arquivos principais
- `api-backend/tests/`
- `api-backend/phpunit.dist.xml`
- `.github/workflows/`

### Como testar
- [ ] `php vendor/bin/phpunit` com o banco de teste.

---

## 22. [Infra] Ambiente de desenvolvimento separado do banco do time

**Labels:** infra, pendente


**Status:** Pendente.

### Contexto
O desenvolvimento acontece direto no banco compartilhado, sem dados de exemplo.

### O que fazer
- [ ] Docker Compose com PostgreSQL 18 local.
- [ ] Seeder com empresa, usuário e tabelas de exemplo.
- [ ] `.env.example` completo e documentação de setup.

### Arquivos principais
- `api-backend/`
- `docs/`

### Como testar
- [ ] Subir o projeto do zero seguindo só a documentação.

---

## 23. [Coerência] Renomear as rotas de tela de /modulos para /tabelas

**Labels:** frontend, pendente, coerência, decisão do time


**Status:** Pendente.

### Contexto
A tela diz "Tabelas" e a URL diz `/modulos`. Foi revertido para não mexer em rotas sem o time.

### O que fazer
- [ ] Decidir com o time.
- [ ] Trocar as rotas de tela (não as da API) e redirecionar os endereços antigos.
- [ ] Atualizar os links gerados pelo backend nas notificações.

### Arquivos principais
- `client-frontend/src/App.jsx`
- `api-backend/app/Services/Automacao/AutomacaoExecutor.php`

### Como testar
- [ ] Links antigos continuam funcionando.

---

## 24. [Back] Paginação no servidor para itens e quadros

**Labels:** backend, frontend, desempenho, pendente


**Status:** Pendente.

### Contexto
Itens e quadros trazem tudo de uma vez; com milhares de itens fica lento.

### O que fazer
- [ ] Paginação por cursor em `GET /modulos/{id}/registros` e no quadro de recrutamento.
- [ ] Frontend com `useInfiniteQuery` (lista e por coluna no quadro).

### Arquivos principais
- `api-backend/app/Services/RegistroService.php`
- `api-backend/app/Services/CandidatoService.php`
- `client-frontend/src/pages/ModuleRecords.jsx`

### Como testar
- [ ] Tabela com 5.000 itens abre rápido.

---

## 25. [Back] Tempo real para quadros e notificações (SSE/WebSocket)

**Labels:** backend, frontend, pendente


**Status:** Pendente.

### Contexto
Hoje quadro e notificações atualizam por consulta periódica (15 s e 30 s).

### O que fazer
- [ ] Escolher tecnologia (SSE, Mercure, Pusher/Ably).
- [ ] No frontend, cada evento só chama `invalidateQueries` (o contrato já está pronto).

### Arquivos principais
- `client-frontend/src/hooks/queries.js`
- `client-frontend/src/hooks/useNotificacoes.js`

### Como testar
- [ ] Mudança feita por um colega aparece na hora.

---

## 26. [Front] Sessão mais segura (token fora do localStorage)

**Labels:** frontend, backend, segurança, pendente


**Status:** Pendente.

### Contexto
O token de sessão fica no `localStorage`, exposto a qualquer XSS.

### O que fazer
- [ ] Cookie httpOnly + refresh token no backend.
- [ ] Ajustar `api.js` e `AuthContext` no frontend.
- [ ] Revogar sessões ao trocar a senha.

### Arquivos principais
- `client-frontend/src/services/api.js`
- `client-frontend/src/context/AuthContext.jsx`
- `api-backend/app/Services/AuthService.php`

### Como testar
- [ ] Sessão continua funcionando após recarregar; token não aparece no localStorage.

