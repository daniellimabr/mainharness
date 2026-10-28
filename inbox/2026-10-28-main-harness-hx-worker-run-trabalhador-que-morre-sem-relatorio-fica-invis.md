# Pedido ao harness: hx worker run: trabalhador que morre sem relatório fica invisível

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Quando o processo do trabalhador termina (ou o OmniRoute cai) sem gravar o relatório, o hx grava um relatório de falha em ~/.harness/worker/<SNN>-<TNN>.md e o hx worker status diz que o último trabalhador falhou.

## Por quê

S11/T06: o OmniRoute caiu no meio; não havia relatório nem lock, e a tarefa ficou 7 min na fila até o Tech Lead notar pelo git status.

## Exemplo

—
