# S17 — Release Report

> Sprint em andamento. A tabela de execução abaixo é atualizada pelo `hx` a cada tarefa; o Tech Lead completa o restante no fechamento (skill release-report), mantendo esta tabela.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Ajuste vira tarefa: `feedback` cria o TNN no plano; `task` e `review` aceitam TNN de ajuste e "Ajuste N" (B140, B142, B146) | clone (sonnet) | 15 min | 18:29 | 18:59 | 22 min (fila: 3 min, revisão: 4 min) |
| ✅ | T02 | Agente do clone e do Reviewer nos eventos de tarefa; `agent.start` com o TNN (B144, B088) | clone (sonnet) | 11 min | 19:00 | 19:14 | 7 min (fila: 5 min, revisão: 3 min) |
| ✅ | T03 | `approve` valida o plano e cita `--force`; `sprint.open` com as tarefas; data `+Nd` na tabela (B143, B147, B149, B139, B081) | clone (sonnet) | 15 min | 19:00 | 19:14 | 11 min (fila: 0 min, revisão: 3 min) |
| ✅ | T04 | `hx metrics`: razão por agente, espera por Daniel fora da tarefa, revisão da final sem sobreposição (B079, B129, B141 parte) | clone (sonnet) | 15 min | 19:14 | 19:25 | 4 min (fila: 0 min, revisão: 6 min) |
| ✅ | T05 | `sprint-plan` e template: minutos de agente e fator padrão sem histórico (B141, B093) | clone (sonnet) | 11 min | 18:29 | 18:59 | 3 min (fila: 25 min, revisão: 1 min) |
| ✅ | T06 | `pre-bash` com regras locais do projeto (B148) | clone (sonnet) | 13 min | 18:29 | 18:59 | 20 min (fila: 9 min, revisão: 1 min) |
| ✅ | T07 | `attach` preserva regras do harness legado e reorganiza os documentos (B145) | clone (sonnet) | 30 min | 19:00 | 19:14 | 5 min (fila: 7 min, revisão: 3 min) |
| ✅ | T08 | `hx shot`: print com Chrome headless, claro/escuro (B096, B078, B123) | clone (sonnet) | 15 min | 18:29 | 18:59 | 11 min (fila: 18 min, revisão: 1 min) |
| ✅ | T09 | Texto dos agentes: `[TNN]` nas mensagens do clone e do Reviewer; Reviewer usa `hx shot` em tela (B144, B096) | clone (haiku) | 5 min | 19:14 | 19:25 | 1 min (fila: 4 min, revisão: 6 min) |
| ✅ | T10 | `release` ignora `SNN-release.md`; `setup` e `doctor` calados no que já está ok (B090, B091) | clone (sonnet) | 10 min | 18:29 | 18:59 | 18 min (fila: 11 min, revisão: 1 min) |
| ✅ | T11 | `hx eval`: caso que falha roda de novo e vale 2 de 3 (B077) | clone (sonnet) | 11 min | 18:29 | 18:59 | 20 min (fila: 9 min, revisão: 1 min) |
| ✅ | T12 | Toast no Windows em permissão/espera e `async` nos hooks de observação (B109) | clone (sonnet) | 13 min | 18:29 | 18:59 | 7 min (fila: 21 min, revisão: 1 min) |
| 🔄 revisão | T13 | Revisão final, evals (`hx eval --changed`), CHANGELOG, roadmap, backlog e release v0.16.0 (Daniel roda o `hx release`) | tech-lead + reviewer | 23 min | 19:25 |  |  |
| 🔄 | **Total** | 13 tarefas |  | 1 h 8 min | 2026-11-07 18:29 | ~19:37 (previsto) |  |
