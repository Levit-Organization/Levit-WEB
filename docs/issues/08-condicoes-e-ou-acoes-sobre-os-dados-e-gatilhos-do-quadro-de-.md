---
title: "[Automações] Condições E/OU, ações sobre os dados e gatilhos do quadro de recrutamento"
labels: ["backend", "frontend", "automações", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Uma condição só, ações limitadas a avisar e nenhuma automação para candidatos.

## O que foi feito
- Até 10 condições combinadas por E/OU (coluna `condicoes` em JSON) e operadores contém, vazio, maior, menor etc.
- Ações "Atualizar coluna" (no próprio item) e "Criar item" (em outra tabela).
- Gatilhos "Novo candidato" e "Mudou de etapa", com os dados do candidato como variáveis.
- Proteção contra loop: a mesma automação não roda duas vezes na mesma cadeia e a cadeia para em 3 níveis.

## Arquivos principais
- `api-backend/app/Services/Automacao/Condicoes.php`
- `api-backend/app/Services/Automacao/CamposCandidato.php`
- `api-backend/app/Services/RegistroService.php`
- `api-backend/app/Services/CandidatoService.php`
- `api-backend/app/Database/Migrations/2026-10-10-150000_AddCondicoesToAutomacao.php`
- `client-frontend/src/components/automacoes/CondicoesEditor.jsx`
- `client-frontend/src/components/automacoes/AcoesDeDados.jsx`

## Como testar
- [ ] "Atualizar coluna" numa automação de atualização da mesma tabela: roda uma vez e não entra em loop.
- [ ] Mover candidato de etapa dispara a automação com `{{Etapa}}` correto.

## Atenção
- "Atualizar coluna" e "Criar item" não checam a permissão de quem disparou (só de quem configurou): confirmar a regra de negócio.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
