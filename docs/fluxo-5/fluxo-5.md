# Fluxo 5 — Convite da equipe, Financeiro e Relatórios

Último fluxo do Levit: como a empresa traz novas pessoas para a equipe, controla entradas e saídas
e acompanha os resultados por relatórios. Diagrama de persistência do fluxo:
`fluxo-5-persistencia.png` (fonte em `fluxo-5-persistencia.puml`).

## 5.1 Convite da equipe

**Quem faz:** quem tem a permissão `gerenciar_equipe` convida; a pessoa convidada aceita sem estar logada.

1. Na tela **Equipe**, o administrador informa o e-mail, escolhe o cargo e, se quiser, escreve uma mensagem.
2. O sistema gera um token aleatório, guarda **só o hash SHA-256** em `convite.token_hash` e envia o link por e-mail.
   O convite vale **7 dias**.
3. A pessoa abre o link, vê a empresa, o cargo e quem convidou, informa nome e senha e aceita.
4. Em uma única transação o sistema cria o `usuario` (com o cargo do convite) e preenche `convite.aceito_em`.
5. Quem convidou recebe uma notificação ("Fulano entrou na equipe") e a ação fica registrada em `atividade`.

**Regras:**
- Não convida e-mail que já tem conta no sistema.
- Convidar de novo o mesmo e-mail pendente reaproveita o convite: gera token e prazo novos e o link antigo para de funcionar.
- Se o e-mail não puder ser enviado, o convite novo é desfeito.
- O convite pendente pode ser **reenviado** ou **cancelado**; o aceite recusa convite expirado ou já usado.
- O token nunca volta pela API; as rotas públicas de convite têm limite de tentativas.

**Tabelas:** `convite` (nova), `usuario`, `cargo`, `empresa`, `notificacao`, `atividade`.

## 5.2 Financeiro

**Quem faz:** quem tem nível **editar** na tabela financeira cadastra lançamentos e categorias; **ver** só consulta.

1. A empresa cria uma tabela do tipo **financeiro** (um `modulo` com `tipo = 'financeiro'`).
2. Na primeira abertura o sistema cria as **categorias** padrão (Fixo, Variável, Investimento e Receita),
   únicas por empresa e compartilhadas entre as tabelas financeiras.
3. Lança **entradas e saídas**: descrição, data, tipo, valor, categoria e se já foi conciliado.
   Campos extras da tabela também podem ser preenchidos.
4. A tela lista os lançamentos por data com **saldo acumulado**, totais de entradas e saídas e o saldo do período,
   com filtro por categoria.

**Regras:**
- Cada lançamento cria junto um `registro` da tabela (relação 1:1), na mesma transação. Assim ele reaproveita
  campos extras, permissões, automações e histórico das tabelas comuns.
- Excluir o lançamento exclui o registro (FK em cascata).
- Valor maior que zero; tipo `entrada` ou `saida`; data no formato AAAA-MM-DD.
- Excluir uma categoria não apaga os lançamentos: eles ficam sem categoria (`SET NULL`).

**Tabelas:** `categoria_financeira` e `lancamento_financeiro` (novas), `modulo`, `registro`.

## 5.3 Relatórios

**Quem faz:** só cargos com **acesso total**.

1. **Painel de indicadores:** para um período escolhido mostra resumo, recrutamento (funil por etapa),
   financeiro (entradas, saídas e saldo por mês e categoria) e prazos, sempre comparando com o período anterior.
2. **Montar relatório:** escolhe uma tabela comum (não vale para recrutamento nem financeiro), agrupa os itens
   por uma coluna e calcula contagem, soma ou média.
3. **Relatório em PDF:** escolhe período e seções e baixa o PDF na hora.
4. **Relatório agendado:** define nome, frequência (diário, semanal com dia da semana, mensal com dia de 1 a 28),
   destinatários da equipe e seções:
   resumo, recrutamento, financeiro, prazos, atrasados, ranking por pessoa e atividades.
5. A **rotina diária** (comando `php spark rotinas:diarias`, rodado pelo cron) procura os relatórios ativos que estão no dia,
   gera o PDF do período e envia por e-mail. Também é possível **enviar agora**.
6. Cada envio fica registrado em `relatorio_envio` com período, total de atividades e status (`enviado` ou `erro`).

**Regras:**
- Os destinatários precisam ser da equipe; o envio falha se nenhum continuar na empresa.
- Mesmo com erro o envio é marcado, para não repetir a cada execução do mesmo dia.
- `rotina_execucao` impede que a mesma rotina rode duas vezes na mesma data.
- As seções de atividade vêm da tabela `atividade`, que guarda cópia do nome da pessoa e da tabela para o
  histórico continuar legível depois de exclusões.

**Tabelas:** `relatorio_agendado`, `relatorio_envio`, `rotina_execucao` e `atividade` (novas);
lê `candidato`, `historico_fase`, `lancamento_financeiro`, `categoria_financeira` e `registro` para os indicadores.

## Rotas da API

| Parte | Método e rota |
| --- | --- |
| Convite | `POST /equipe/convidar` · `GET /equipe/convites` · `POST /equipe/convites/{id}/reenviar` · `DELETE /equipe/convites/{id}` |
| Convite (público) | `GET /publico/convite/{token}` · `POST /publico/convite/aceitar` |
| Financeiro | `GET`/`POST /modulos/{id}/lancamentos` · `PUT`/`DELETE /modulos/{id}/lancamentos/{id}` |
| Categorias | `GET`/`POST /financeiro/categorias` · `DELETE /financeiro/categorias/{id}` |
| Relatórios | `GET /relatorios/indicadores` · `GET /relatorios/pdf` · `GET`/`POST /relatorios` · `PUT`/`DELETE /relatorios/{id}` · `GET /relatorios/{id}/envios` · `POST /relatorios/{id}/enviar-agora` |
