# Diagrama de persistência

Modelo do banco de dados (PostgreSQL) do Levit, reconstruído a partir das migrations em
`api-backend/app/Database/Migrations/` (estado após a última, `2026-10-26-120000_AddVinculoEntreTabelas`).

Convenções do esquema:

- Toda chave primária é `uuid` gerada por `uuidv7()` (exceto `rotina_execucao`, de chave composta).
- `criado_em` tem padrão `CURRENT_TIMESTAMP`; `atualizado_em` é preenchido pela aplicação.
- Isolamento por empresa (multi-tenant): toda informação pertence a uma `empresa`, direta ou indiretamente via `modulo`.
- Nos diagramas, linha contínua é chave estrangeira real; **linha tracejada é uma referência lógica sem FK no banco**
  (a coluna guarda o id, mas o banco não garante a integridade).

## Visão geral

```mermaid
erDiagram
    empresa ||--o{ usuario : "tem"
    empresa ||--o{ cargo : "define"
    empresa ||--o{ modulo : "tem"
    empresa ||--o{ convite : "emite"
    empresa ||--o{ categoria_financeira : "define"
    empresa ||--o{ notificacao : "tem"
    empresa ||--o{ atividade : "registra"
    empresa ||--o{ relatorio_agendado : "agenda"
    usuario |o--o| empresa : "administrador principal"
    cargo ||--o{ usuario : "atribuído a"
    usuario ||--o{ token_revogado : "revoga"
    cargo ||--o{ cargo_permissao : "recebe"
    permissao ||--o{ cargo_permissao : "concedida em"
    cargo ||--o{ cargo_modulo_permissao : "acessa"
    modulo ||--o{ cargo_modulo_permissao : "acessado por"
    cargo ||--o{ convite : "oferece"
    modulo ||--o{ campo_modulo : "tem"
    modulo ||--o{ registro : "guarda"
    registro ||--o| arquivo : "anexa"
    modulo ||--o{ fase_recrutamento : "tem"
    modulo ||--o{ candidato : "recebe"
    fase_recrutamento ||--o{ candidato : "fase atual"
    candidato ||--o{ historico_fase : "tem"
    modulo ||--o{ automacao : "tem"
    automacao ||--o{ automacao_acao : "executa"
    automacao ||--o{ automacao_log : "registra"
    modulo ||--o{ lancamento_financeiro : "tem"
    registro ||--o| lancamento_financeiro : "espelha"
    categoria_financeira |o--o{ lancamento_financeiro : "classifica"
    usuario ||--o{ notificacao : "recebe"
    relatorio_agendado ||--o{ relatorio_envio : "gera"
```

`rotina_execucao` não se relaciona com nenhuma tabela: é o controle de idempotência das rotinas agendadas (cron).

## 1. Empresa, usuários e controle de acesso

```mermaid
erDiagram
    empresa {
        uuid id PK
        varchar nome "150"
        varchar cnpj_cpf UK "18"
        varchar setor_atuacao "50, null"
        varchar email_corporativo "150, null"
        varchar logo "255, null"
        uuid administrador_principal_id FK "null"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    usuario {
        uuid id PK
        uuid empresa_id FK
        uuid cargo_id FK
        varchar nome "150"
        varchar email UK "150"
        varchar senha_hash "255"
        varchar reset_hash "255, null"
        timestamp reset_expires_at "null"
        timestamp senha_alterada_em "null"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    cargo {
        uuid id PK
        uuid empresa_id FK "UK com nome"
        varchar nome "50"
        boolean acesso_total "false"
        timestamp criado_em
    }
    permissao {
        uuid id PK
        varchar codigo UK "50"
        varchar descricao "150"
    }
    cargo_permissao {
        uuid id PK
        uuid cargo_id FK "UK com permissao_id"
        uuid permissao_id FK
    }
    cargo_modulo_permissao {
        uuid id PK
        uuid cargo_id FK "UK com modulo_id"
        uuid modulo_id FK
        varchar nivel "20"
        timestamp criado_em
    }
    convite {
        uuid id PK
        uuid empresa_id FK
        uuid cargo_id FK
        uuid convidado_por FK "null"
        varchar email_destinatario "150"
        varchar token_hash UK "64"
        text mensagem "null"
        timestamp expira_em
        timestamp aceito_em "null"
        timestamp criado_em
    }
    token_revogado {
        uuid id PK
        varchar jti UK "36"
        uuid usuario_id FK
        timestamp expira_em
        timestamp criado_em
    }
    modulo {
        uuid id PK
        uuid empresa_id FK
    }

    empresa ||--o{ usuario : "tem"
    usuario |o--o| empresa : "administrador principal"
    empresa ||--o{ cargo : "define"
    cargo ||--o{ usuario : "atribuído a (RESTRICT)"
    cargo ||--o{ cargo_permissao : "recebe"
    permissao ||--o{ cargo_permissao : "concedida em"
    cargo ||--o{ cargo_modulo_permissao : "acessa"
    modulo ||--o{ cargo_modulo_permissao : "acessado por"
    empresa ||--o{ convite : "emite"
    cargo ||--o{ convite : "oferece"
    usuario |o--o{ convite : "convida"
    usuario ||--o{ token_revogado : "revoga"
```

- `permissao` é um catálogo global (permissões da empresa como um todo); o acesso a cada tabela fica em
  `cargo_modulo_permissao.nivel`. Um cargo com `acesso_total` ignora ambos.
- Excluir um cargo com usuários é bloqueado (`ON DELETE RESTRICT`).

## 2. Tabelas dinâmicas (módulos, campos e itens)

```mermaid
erDiagram
    modulo {
        uuid id PK
        uuid empresa_id FK
        varchar nome "100"
        varchar icone "50, null"
        varchar tipo "20, padrão dados"
        uuid criado_por FK "null"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    campo_modulo {
        uuid id PK
        uuid modulo_id FK
        varchar nome "100"
        varchar tipo "20"
        jsonb opcoes "null"
        int ordem "0"
        uuid modulo_vinculado_id FK "null, só tipo vinculo"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    registro {
        uuid id PK
        uuid modulo_id FK
        jsonb dados "valores por campo, índice GIN"
        uuid recorrencia_origem_id "null, sem FK"
        uuid criado_por FK "null"
        uuid atualizado_por FK "null"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    arquivo {
        uuid id PK
        uuid registro_id FK,UK
        varchar nome_original "255"
        varchar chave_armazenamento UK "255"
        varchar tipo_mime "100"
        bigint tamanho_bytes
        timestamp criado_em
    }
    empresa {
        uuid id PK
    }
    usuario {
        uuid id PK
    }

    empresa ||--o{ modulo : "tem"
    usuario |o--o{ modulo : "cria"
    modulo ||--o{ campo_modulo : "define"
    modulo |o--o{ campo_modulo : "é ligada por"
    modulo ||--o{ registro : "guarda"
    registro }o..o{ registro : "ligado a (vinculo)"
    usuario |o--o{ registro : "cria / atualiza"
    registro |o..o{ registro : "recorrência de"
    registro ||--o| arquivo : "anexa"
```

- `modulo.tipo` distingue tabelas comuns (`dados`) das especiais (`recrutamento`, `financeiro`).
- Os valores de cada item ficam em `registro.dados` (jsonb), indexados pelo id do `campo_modulo`;
  por isso não há uma tabela de valores por campo.
- **Tabelas ligadas:** uma coluna do tipo `vinculo` aponta para outra tabela (`campo_modulo.modulo_vinculado_id`,
  FK real) e guarda em `registro.dados` o id do item ligado — ou uma lista de ids quando `opcoes.multiplo` é
  verdadeiro (N:N). A ligação item → item é lógica (sem FK): a aplicação confere que o item existe ao salvar e,
  ao excluir um item, tira o id dele das colunas que apontavam para ele. Excluir uma tabela usada por outra é
  barrado. O índice GIN (`jsonb_path_ops`) em `registro.dados` atende às consultas por conteúdo (`@>`).
- **Pesquisa avançada:** `GET /modulos/{id}/registros?filtros=…` aceita condições em grupos E/OU que
  atravessam ligações nos dois sentidos (ex.: pedidos cujo cliente é de Recife; clientes sem nenhum pedido),
  traduzidas em subconsultas `EXISTS` por `App\Services\Pesquisa\Filtros`.
- **Onde as ligações aparecem:** `GET /modulos/{id}/registros/{item}/ligados` devolve o outro lado (num cliente,
  os pedidos dele); o relatório montado (`GET /relatorios/agrupar`) agrupa pelo item ligado ou por uma coluna da
  tabela ligada (`agrupar_por=ligacao>coluna`) e aceita os mesmos `filtros`; a ação de automação "Criar item"
  pode ligar o novo item ao que disparou (`configuracao.ligar_campo_id`).

## 3. Recrutamento

```mermaid
erDiagram
    fase_recrutamento {
        uuid id PK
        uuid modulo_id FK
        varchar nome "100"
        int ordem "0"
        timestamp criado_em
    }
    candidato {
        uuid id PK
        uuid modulo_id FK "UK com email"
        uuid fase_atual_id FK
        varchar nome "150"
        varchar email "150"
        varchar telefone "20, null"
        varchar cargo_desejado "100, null"
        text mensagem "null"
        varchar curriculo_chave "255, null"
        varchar curriculo_nome "255, null"
        varchar curriculo_mime "100, null"
        bigint curriculo_tamanho "null"
        timestamp criado_em
    }
    historico_fase {
        uuid id PK
        uuid candidato_id FK
        uuid fase_anterior_id FK "null"
        uuid fase_nova_id FK "null"
        uuid alterado_por FK "null"
        timestamp criado_em
    }
    modulo {
        uuid id PK
        varchar tipo "recrutamento"
    }
    usuario {
        uuid id PK
    }

    modulo ||--o{ fase_recrutamento : "colunas do quadro"
    modulo ||--o{ candidato : "vaga"
    fase_recrutamento ||--o{ candidato : "fase atual (RESTRICT)"
    candidato ||--o{ historico_fase : "movimentações"
    fase_recrutamento |o--o{ historico_fase : "de / para"
    usuario |o--o{ historico_fase : "moveu"
```

- Cada módulo do tipo `recrutamento` é uma vaga; um mesmo e-mail só se candidata uma vez por vaga.
- Uma fase com candidatos não pode ser excluída (`ON DELETE RESTRICT`).

## 4. Automações

```mermaid
erDiagram
    automacao {
        uuid id PK
        uuid modulo_id FK
        varchar nome "100"
        varchar gatilho "20, legado"
        text gatilhos "JSON, lista"
        text condicoes "JSON, regras e/ou"
        uuid campo_condicao_id FK "null, legado"
        varchar condicao_operador "20, null, legado"
        varchar condicao_valor "255, null, legado"
        varchar condicao_valor_de "255, null, legado"
        boolean ativo "true"
        timestamp pausada_por_falhas_em "null"
        uuid criado_por FK "null"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    automacao_acao {
        uuid id PK
        uuid automacao_id FK
        varchar tipo "20"
        jsonb configuracao
        int ordem "0"
    }
    automacao_log {
        uuid id PK
        uuid automacao_id FK
        uuid registro_id FK "null"
        varchar status "20"
        varchar gatilho "20, null"
        int tentativa "1"
        int duracao_ms "null"
        text detalhes "null"
        text passos "JSON, null"
        text dados "JSON, null"
        timestamp executado_em
    }
    modulo {
        uuid id PK
    }
    campo_modulo {
        uuid id PK
    }
    registro {
        uuid id PK
    }
    usuario {
        uuid id PK
    }

    modulo ||--o{ automacao : "tem"
    campo_modulo |o--o{ automacao : "condição (legado)"
    usuario |o--o{ automacao : "cria"
    automacao ||--o{ automacao_acao : "executa em ordem"
    automacao ||--o{ automacao_log : "histórico"
    registro |o--o{ automacao_log : "disparada por"
```

- `gatilho` e as colunas `condicao_*` são o formato antigo (um gatilho, uma condição); as migrations de outubro
  copiaram esses dados para `gatilhos` e `condicoes`, que são os campos usados hoje.

## 5. Financeiro

```mermaid
erDiagram
    categoria_financeira {
        uuid id PK
        uuid empresa_id FK "UK com nome"
        varchar nome "50"
        timestamp criado_em
    }
    lancamento_financeiro {
        uuid id PK
        uuid modulo_id FK
        uuid registro_id FK,UK
        uuid categoria_id FK "null"
        varchar descricao "255"
        date data_lancamento
        varchar tipo "10, entrada ou saida"
        decimal valor "12,2"
        boolean conciliado "false"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    empresa {
        uuid id PK
    }
    modulo {
        uuid id PK
        varchar tipo "financeiro"
    }
    registro {
        uuid id PK
    }

    empresa ||--o{ categoria_financeira : "define"
    modulo ||--o{ lancamento_financeiro : "tem"
    registro ||--o| lancamento_financeiro : "espelha 1:1"
    categoria_financeira |o--o{ lancamento_financeiro : "classifica (SET NULL)"
```

## 6. Notificações, atividade e relatórios

```mermaid
erDiagram
    notificacao {
        uuid id PK
        uuid empresa_id FK
        uuid usuario_id FK
        varchar tipo "30"
        varchar titulo "200"
        text mensagem "null"
        varchar link "255, null"
        varchar agrupador "120, null"
        int contador "1"
        timestamp lida_em "null"
        timestamp criado_em
    }
    atividade {
        uuid id PK
        uuid empresa_id FK
        uuid usuario_id "null, sem FK"
        varchar usuario_nome "100, null"
        varchar acao "40"
        uuid modulo_id "null, sem FK"
        varchar modulo_nome "100, null"
        text descricao
        timestamp criado_em
    }
    relatorio_agendado {
        uuid id PK
        uuid empresa_id FK
        varchar nome "100"
        varchar frequencia "10"
        smallint dia
        jsonb destinatarios "padrão []"
        jsonb secoes "null"
        boolean ativo "true"
        uuid criado_por "null, sem FK"
        timestamp ultimo_envio_em "null"
        timestamp criado_em
        timestamp atualizado_em "null"
    }
    relatorio_envio {
        uuid id PK
        uuid relatorio_id FK
        timestamp periodo_inicio
        timestamp periodo_fim
        int total_atividades "0"
        varchar status "10"
        text erro "null"
        timestamp enviado_em
    }
    rotina_execucao {
        varchar rotina PK "60"
        varchar referencia PK "60"
        timestamp executada_em
    }
    empresa {
        uuid id PK
    }
    usuario {
        uuid id PK
    }
    modulo {
        uuid id PK
    }

    empresa ||--o{ notificacao : "tem"
    usuario ||--o{ notificacao : "recebe"
    empresa ||--o{ atividade : "registra"
    usuario |o..o{ atividade : "autor (cópia do nome)"
    modulo |o..o{ atividade : "tabela (cópia do nome)"
    empresa ||--o{ relatorio_agendado : "agenda"
    usuario |o..o{ relatorio_agendado : "cria"
    relatorio_agendado ||--o{ relatorio_envio : "gera"
```

- `atividade` guarda cópias de `usuario_nome` e `modulo_nome` de propósito: o registro continua legível
  depois que o usuário ou a tabela são excluídos, por isso não há FK nessas colunas.
- `notificacao.agrupador` + `contador` juntam notificações repetidas em uma só enquanto não forem lidas.

## Índices além das chaves

| Índice | Tabela (colunas) |
| --- | --- |
| `registro_modulo_criado_idx` | `registro (modulo_id, criado_em DESC)` |
| `registro_criado_por_idx`, `registro_atualizado_por_idx` | `registro (criado_por)`, `registro (atualizado_por)` |
| `registro_recorrencia_origem_idx` | `registro (recorrencia_origem_id)` parcial, não nulos |
| `usuario_email_lower_idx` | `usuario (LOWER(email))` |
| `usuario_cargo_idx` | `usuario (cargo_id)` |
| `candidato_fase_atual_idx` | `candidato (fase_atual_id)` |
| `candidato_modulo_criado_idx` | `candidato (modulo_id, criado_em)` |
| `convite_pendente_email_idx` | `convite (empresa_id, email_destinatario)` parcial, `aceito_em IS NULL` |
| `lancamento_modulo_data_idx` | `lancamento_financeiro (modulo_id, data_lancamento, criado_em)` |
| `automacao_campo_condicao_idx`, `automacao_criado_por_idx` | `automacao (campo_condicao_id)`, `automacao (criado_por)` |
| `automacao_log_automacao_executado_idx` | `automacao_log (automacao_id, executado_em)` |
| `automacao_log_registro_idx` | `automacao_log (registro_id)` |
| `notificacao_usuario_criado_idx` | `notificacao (usuario_id, criado_em DESC)` |
| `notificacao_nao_lidas_idx` | `notificacao (usuario_id, agrupador)` parcial, `lida_em IS NULL` |
| `notificacao_empresa_idx` | `notificacao (empresa_id)` |
| `atividade_empresa_criado_idx` | `atividade (empresa_id, criado_em DESC)` |
| `relatorio_envio_relatorio_idx` | `relatorio_envio (relatorio_id, enviado_em DESC)` |
| `token_revogado_expira_idx` | `token_revogado (expira_em)` |
