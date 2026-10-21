# Pedido ao harness: Tarefa reaberta perde a duração da primeira passada

- **Projeto:** dashboard-ia
- **Data:** 2026-10-21
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Ao reabrir uma tarefa com hx task start (depois de hx sprint feedback), somar as passadas na duração da tarefa e na tabela da sprint, em vez de trocar o início pela reabertura.

## Por quê

Na S04 do Dashboard IA, a T03 levou 6 min (07:34–07:40) e mais 4 min de ajuste, mas hx metrics e a tabela mostram só 4 min. Isso distorce o real × planejado usado para calibrar as próximas sprints.

## Exemplo

T03: início 07:53, fim 07:56, 4 min (deveria ser ~10 min)
