---
title: "[Automações] Histórico, testar antes de ligar, retentativas e pausa automática"
labels: ["backend", "frontend", "automações", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
Falhas aconteciam em silêncio, não havia como testar uma automação e editar criava uma nova e apagava a antiga.

## O que foi feito
- Histórico por execução: passos, duração, tentativa e cópia dos dados (`GET .../execucoes`, paginado por cursor); botão Reexecutar.
- Simulação sem enviar nada (`POST .../automacoes/simular`), também com a definição ainda não salva.
- Retry: até 3 tentativas (1 min, 5 min) continuando da ação que falhou; erros definitivos (4xx, e-mail inválido) não repetem.
- Pausa automática depois de 5 falhas seguidas, com aviso a quem criou.
- Atualização real (`PUT .../automacoes/{id}`) mantendo id e histórico; estatísticas de 7 dias na lista numa consulta só.

## Arquivos principais
- `api-backend/app/Services/Automacao/AutomacaoExecutor.php`
- `api-backend/app/Exceptions/FalhaPermanenteException.php`
- `api-backend/app/Database/Migrations/2026-10-10-130000_AddExecucaoDetalhesToAutomacao.php`
- `client-frontend/src/components/automacoes/HistoricoExecucoes.jsx`
- `client-frontend/src/components/automacoes/SimulacaoModal.jsx`

## Como testar
- [ ] Webhook apontando para um endpoint que responde 500: ver 3 linhas no histórico com 1 e 5 minutos de intervalo.
- [ ] Repetir até 5 falhas: a automação pausa e o autor recebe notificação.

## Atenção
- O worker da fila precisa estar rodando: `php spark queue:work automacoes`.
- `automacao_log.dados` guarda dados dos itens: definir retenção (LGPD).

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
