# Pedido ao harness: Reviewer com dois nomes nos eventos

- **Projeto:** dashboard-ia
- **Data:** 2026-10-22
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Emitir o agente do Reviewer sempre com o mesmo nome nos eventos (ex.: sempre 'main-harness:reviewer', igual ao agentType do transcript), inclusive em hx review pass/fail.

## Por quê

Na S09 do Dashboard IA o mesmo chat teve os agentes 'reviewer' e 'main-harness:reviewer'; o painel mostrava dois Reviewers e um sem custo (US$ 2,84 do Reviewer ficavam soltos). O Dashboard normaliza hoje (events.ts), mas o contrato deveria ter um nome só.

## Exemplo

—
