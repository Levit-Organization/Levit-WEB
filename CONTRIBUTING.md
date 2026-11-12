# Contribuindo com o Levit

## Fluxo

1. Crie uma branch a partir de `main` (`dev-<nome>` ou `feat/<assunto>`).
2. Faça commits pequenos, um assunto por commit.
3. Antes de abrir o PR, rode as verificações locais (abaixo). O CI roda as mesmas.

## Mensagens de commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```text
<tipo>(<escopo>): <resumo no imperativo>

<corpo opcional: o porquê da mudança>
```

| Tipo | Quando usar |
|---|---|
| `feat` | Funcionalidade nova |
| `fix` | Correção de bug |
| `refactor` | Mudança interna sem alterar comportamento |
| `test` | Só testes |
| `docs` | Só documentação |
| `ci` | Workflows e automação |
| `chore` | Dependências, configuração, limpeza |
| `perf` | Desempenho |

Exemplos: `fix(auth): derruba sessões ao redefinir senha`, `refactor(relatorios): separa montagem do PDF`.

Mensagens como "Fixes" ou "Commit para gravação" não dizem o que mudou; evite.
Para ter o modelo no editor ao commitar:

```bash
git config commit.template .gitmessage
```

## Verificações locais

Backend (`api-backend/`):

```bash
composer validate --no-check-publish
vendor/bin/phpstan analyse --memory-limit=1G
vendor/bin/phpunit --no-coverage
composer audit --no-dev
```

Frontend (`client-frontend/`):

```bash
npm run lint
npm test
npm run build
```

## Segredos

Nunca versione `.env`. Use os `.env.example` como referência. Se um segredo
for commitado por engano, **troque-o imediatamente** — apagar o arquivo não
o remove do histórico do git.
