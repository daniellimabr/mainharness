# S13 — Release Report

## Resumo da entrega

**v0.11.0: Gemini removido, métricas mais confiáveis e processo mais leve.** O trabalhador Gemini saiu do código (comando, skill, config e guia). Os eventos `usage` não são mais gravados em duplicata, e o `hx metrics` passou a mostrar custo por tarefa e por executor. Entraram `hx task drop/defer`, os eventos `attention` e `error`, a tarefa (TNN) no `agent.start`, o evento `context` a cada `Stop` e o `session-start` que, depois de compactar, traz a tarefa em andamento. No processo: regra de ouro, `docs/decisoes-daniel.md`, handoff melhor e um formato único de ondas no template.

**Ressalva:** a coluna de custo por tarefa ficou vazia nesta sprint. A S13 rodou com os ganchos da 0.10.2, porque a 0.11.0 só foi publicada no fim. Os 444 registros de consumo ficaram sem tarefa. A conferência foi para a S14 (B126); a S13 não será recalculada, por decisão de Daniel.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Remover o trabalhador Gemini (B115, B125) | clone (opus) | 24 min | 23:27 | 00:22 | 43 min (fila: 7 min, revisão: 5 min) |
| ✅ | T02 | `usage` sem duplicata na gravação (B124) | clone (sonnet) | 16 min | 23:27 | 00:22 | 34 min (fila: 17 min, revisão: 5 min) |
| ✅ | T03 | `task done/phase` em tarefa já feita (B118) | clone (sonnet) | 12 min | 23:27 | 00:22 | 42 min (fila: 9 min, revisão: 5 min) |
| ✅ | T04 | `hx task drop/defer` (B117) | clone (opus) | 32 min | 00:35 | 00:47 | 7 min (fila: 1 min, revisão: 4 min) |
| ✅ | T05 | `index.md` sem linhas obsoletas (B119) | clone (opus) | 16 min | 23:27 | 00:22 | 42 min (fila: 9 min, revisão: 5 min) |
| ✅ | T06 | Eventos: TNN no `agent.start`, `agent_id` no `alert.context`, `context` a cada `Stop` (B120, B121, B108) | clone (opus) | 28 min | 00:22 | 00:35 | 7 min (fila: 1 min, revisão: 4 min) |
| ✅ | T07 | Eventos `attention` e `error` (B107) | clone (opus) | 32 min | 00:35 | 00:47 | 8 min (fila: 0 min, revisão: 4 min) |
| ✅ | T08 | Custo por tarefa e por executor; `roundStats` sem duplicata (B116, B124) | clone (sonnet) | 20 min | 23:27 | 00:35 | 46 min (fila: 17 min, revisão: 4 min) |
| ✅ | T09 | Regra de ouro, perfil de decisão, handoff melhor, ondas no template (B113, B112, B114, B122) | clone (sonnet) | 24 min | 23:27 | 00:22 | 28 min (fila: 23 min, revisão: 5 min) |
| ✅ | T10 | `session-start` após compactar traz tarefa e estado (B114) | clone (opus) | 20 min | 23:27 | 00:22 | 34 min (fila: 17 min, revisão: 5 min) |
| ✅ | T11 | Revisão final, backlog, CHANGELOG, roadmap e release v0.11.0 | tech-lead (sonnet) + reviewer (opus) | 16 min | 00:47 | 00:52 | 1 min (revisão: 5 min) |
| ✅ | **Total** | 11 tarefas |  | 1 h 40 min | 2026-10-28 23:27 | 2026-10-29 00:52 | 1 h 26 min |

## Observações por tarefa

| Tarefa | Quem fez de fato | Passou de primeira? | Nota |
|---|---|---|---|
| T01, T05, T10 | clone Opus | sim | Onda 1, 7 clones em paralelo. A fila (7 a 17 min) explica boa parte do estouro. |
| T02, T03, T09 | clone Sonnet | sim | Rotina. A T09 esperou 23 min na fila. |
| T08 | clone Sonnet | não (1 reprovação) | Voltou uma vez na onda 1 e foi aprovada na re-revisão (onda 2). |
| T04, T06, T07 | clone Opus | sim | Ondas 2 e 3, sem fila: de 7 a 8 min cada, contra 28 a 32 previstos. |
| T11 | Tech Lead (Sonnet) + Reviewer Opus | sim | Revisão final e release v0.11.0. |

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 1 h 40 min · 1 h 26 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 0 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 8 h 13 min · 23 min |
| Soma das tarefas (planejada · real) | 4 h · 4 h 52 min |
| Tarefas feitas | 11/11 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 86.394 / 237.113 / 2.683.025 / 30.085.780 |
| Custo total | US$ 19.67 |
| Custo por agente | tech-lead US$ 3.06 · main-harness:executor US$ 9.64 · eval US$ 3.75 · main-harness:reviewer US$ 3.21 |
| Custo por executor | Sonnet US$ 9.05 · Opus US$ 10.61 · Haiku US$ 0.01 |
| Custo por tarefa | não medido (ganchos 0.10.2 durante a sprint; 444 chamadas "sem-tarefa") |
| Custo por modelo | claude-sonnet-5-5 US$ 9.05 · claude-opus-5-5 US$ 10.61 · claude-haiku-5-5 US$ 0.01 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 0 |
| Handoffs | 2 (na verdade 1: o mesmo arquivo `20261029-014833.md` foi registrado duas vezes) |

## Revisão

Reviewer Opus em todas as ondas, porque todas tocavam ganchos ou o contrato do `hx`. Na onda 1, T01, T02, T03, T05, T09 e T10 foram aprovadas e a T08 reprovada. Na onda 2, a T08 foi aprovada na re-revisão, junto com T06 e T04. Na onda 3 passou a T07 e, na revisão final, a T11. Nenhum achado de segurança.

## Retorno de Daniel

Sem ajustes pedidos (0 rodadas). Depois da entrega, ele perguntou por que faltava o custo por tarefa. A investigação mostrou que a causa foram os ganchos antigos, não um bug. Daniel escolheu conferir isso na S14 (B126), sem recalcular a S13, e confirmou o fechamento.

## Retrospectiva

### Comparação

| | S11 | S12 | S13 |
|---|---|---|---|
| Custo (US$, estimado) | 11.77 | 14.48 | 19.67 |
| Relógio (previsto · corrido) | 1 h 12 min · 1 h 34 min | 2 h 48 min · 2 h 41 min | 1 h 40 min · 1 h 26 min |
| Retrabalho | 1 | 0 | 0 |
| Reprovações | 2 | 1 | 1 |

O corrido ficou 14% abaixo do previsto, e o trabalho de verdade foi de 23 min. O custo subiu US$ 5: entram US$ 3.75 de evals (skill `handoff`) e o Reviewer em Opus em todas as ondas. Na S12 o tech-lead custou US$ 6.03; na S13, US$ 3.06, porque quase tudo foi para os clones.

### O que funcionou

- Ondas pequenas, sem fila, foram muito rápidas: T04, T06 e T07 saíram em 7 a 8 min cada (previsto: 28 a 32).
- Zero retrabalho pela segunda sprint seguida.
- O Tech Lead orquestrando em Sonnet custou metade da S12.

### O que não funcionou

- A onda 1, com 7 clones, criou fila de 7 a 23 min por tarefa, e a soma real ficou 22% acima da planejada (4 h 52 min contra 4 h).
- O custo por tarefa, objetivo da T08, não pôde ser visto na própria sprint, porque o recurso só passa a valer depois do release.
- O contador de handoffs dobrou: um único handoff de compactação foi gravado duas vezes.

### Oportunidades no harness

- Evento `handoff` gravado em duplicata na compactação (2 eventos, 1 arquivo) → `hx request`.
- O consumo do Tech Lead com várias tarefas em paralelo cai em "sem-tarefa" (onda 1: 7 tarefas ao mesmo tempo) → `hx request`.
- Conferir o custo por tarefa na S14: já está no backlog (B126).
