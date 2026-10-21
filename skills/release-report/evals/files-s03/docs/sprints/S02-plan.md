# S02 — Pedidos: exportação, paginação e busca

## Objetivo

Entregar as tarefas abaixo no app de pedidos.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Estimativa | Depende de |
|---|---|---|---|---|---|
| T01 | Exportar pedidos em CSV | Tech Lead | src/api/export.ts | 40 min | — |
| T02 | Paginação da lista | Clone | src/web/OrdersPage.tsx | 30 min | — |
| T03 | Busca por cliente | Tech Lead | src/api/orders.ts | 30 min | T02 |
| T04 | Detalhe do pedido | Clone | src/web/OrderDetail.tsx | 45 min | T02 |

## Critérios de aceite

- Cada tarefa com teste automatizado passando.
- Lint e tipos: zero erros e zero avisos.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-16 08:30:00 (horário de Brasília) — UTC 2026-10-16T11:30:00Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `ba416b08641057f9abe18723a58b30982681efba5ae8813b2cee99b6a4b13427`
- **Versão do harness:** 0.1.3
