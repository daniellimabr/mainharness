# S11 — Release Report

## Resumo da entrega

**v0.10.0 + v0.10.1: um modelo fixo por papel.** Opus planeja e revisa, Sonnet orquestra a execução, e quem executa cada tarefa (Gemini, Sonnet ou Opus) sai de uma regra escrita no plano (ADR 0013). O gatilho de 90% saiu. Clones e trabalhadores usam a persona enxuta `executor`. O `sprint.metrics` e o `hx metrics` mostram custo e tokens por modelo. O alerta de contexto passou para 120 mil. O handoff da sessão se atualiza sozinho a cada `hx task done/phase`. Os evals usam o `hx` do repo. O harness agora manda pedidos a um projeto (`hx request --to`).

A v0.10.1 é o ajuste pedido por Daniel no teste: o chat abre em Opus, e o `sprint-run` para na primeira resposta se não estiver em Sonnet.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | ADR 0013 e regra de modelo por papel no `tech-lead.md` | tech-lead (opus) | 17 min | 23:08 | 23:10 | 2 min |
| ✅ | T02 | Chat de execução em Sonnet (teste do mecanismo e aplicação) | tech-lead (opus) + Daniel | 17 min | 23:11 | 23:16 | 5 min |
| ✅ | T03 | Persona `executor` + fases (B094) + `hx worker run --agent` | clone (sonnet) | 21 min | 23:33 | 23:49 | 3 min (fila: 9 min, revisão: 5 min) |
| ✅ | T04 | Tirar o gatilho de 90% | clone (sonnet) | 17 min | 23:33 | 23:48 | 6 min (fila: 6 min, revisão: 3 min) |
| ✅ | T05 | Custo e tokens por modelo em `sprint.metrics` e `hx metrics` | clone (sonnet) | 17 min | 23:08 | 23:34 | 11 min (fila: 7 min, revisão: 7 min) |
| ✅ | T06 | Alerta de contexto em 120 mil | gemini | 8 min | 23:08 | 23:32 | 11 min (fila: 7 min, revisão: 5 min) |
| ✅ | T07 | Handoff atualizado em `task done/phase` (B101) | gemini | 17 min | 23:48 | 00:17 | 24 min (fila: 3 min, revisão: 2 min) |
| ✅ | T08 | `hx eval` com o `hx` do repo (B102) | gemini | 17 min | 23:27 | 23:44 | 7 min (fila: 1 min, revisão: 9 min) |
| ✅ | T09 | `hx request --to <projeto>` + aviso no `session-start` | clone (sonnet) | 21 min | 23:08 | 23:32 | 11 min (fila: 8 min, revisão: 5 min) |
| ✅ | T10 | Backlog, CHANGELOG, roadmap e release v0.10.0 | gemini (docs) + tech-lead (`hx release minor`) | 13 min | 23:51 | 00:43 | 51 min |
| ✅ | Ajuste 1 | 1 ajuste(s) |  |  | 00:33 | 00:43 | 10 min |
| ✅ | **Total** | 10 tarefas |  | 1 h 12 min | 2026-10-27 23:08 | 2026-10-28 00:43 | 1 h 34 min |

## Observações por tarefa

| Tarefa | Quem fez de fato | Passou de primeira? | Nota |
|---|---|---|---|
| T01 | Tech Lead (Opus) | sim | |
| T02 | Tech Lead (Opus) | sim | Teste com `claude -p`: o `model:` do agente vence o `"model": "opus"` do settings, e o `--model` explícito vence o agente. Daniel inverteu o padrão no teste (ajuste 1). |
| T03 | clone Sonnet | sim | Eval da `handoff`: 8/8 e 3/3. |
| T04 | clone Sonnet | não (1 reprovação) | Frase antiga sobre o 90% no `docs/omniroute.md`. O eval da `worker` falhou num caso (o modelo perguntou em vez de passar a um clone) e passou depois de um ajuste no texto. |
| T05 | clone Sonnet | não (1 reprovação) | Faltava a linha "Tokens por modelo" na saída (critério 5). Corrigida pelo Tech Lead. |
| T06 | Gemini + Tech Lead | sim | O OmniRoute caiu com o código já escrito. O trabalhador morreu sem relatório, e o Tech Lead terminou (2 testes antigos esperavam 250000). |
| T07 | Gemini | sim | Cerca de 25 min, com vários 429 do plano grátis. O Tech Lead fez 2 ajustes pequenos (`$` na troca de texto e uma duplicação), e o Reviewer acrescentou 2 testes. |
| T08 | clone Sonnet (no lugar do Gemini) | sim | O OmniRoute estava fora do ar na hora. |
| T09 | clone Sonnet | sim | Uma sugestão aceita do Reviewer: comparar o caminho sem diferenciar maiúsculas no Windows. |
| T10 | Tech Lead | — | O Gemini estava ocupado com a T07. A duração (51 min) inclui a espera pela release e pelo teste de Daniel, porque o `done` só foi marcado no fechamento. |

## Indicadores

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 17 min | 2 min | −15 min | — |
| T02 | 17 min | 5 min | −12 min | — |
| T03 | 21 min | 3 min (fila: 9 min, revisão: 5 min) | −18 min | — |
| T04 | 17 min | 6 min (fila: 6 min, revisão: 3 min) | −11 min | — |
| T05 | 17 min | 11 min (fila: 7 min, revisão: 7 min) | −6 min | — |
| T06 | 8 min | 11 min (fila: 7 min, revisão: 5 min) | +3 min | — |
| T07 | 17 min | 24 min (fila: 3 min, revisão: 2 min) | +7 min | — |
| T08 | 17 min | 7 min (fila: 1 min, revisão: 9 min) | −10 min | — |
| T09 | 21 min | 11 min (fila: 8 min, revisão: 5 min) | −10 min | — |
| T10 | 13 min | 52 min | +39 min | — |
| **Total** | 2 h 45 min | 2 h 12 min (soma) | | US$ 11.77 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 1 h 12 min · 1 h 34 min |
| Espera por Daniel · trabalho | 46 min · 49 min |
| Tarefas feitas | 10/10 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 789.048 / 170.548 / 1.191.886 / 28.990.569 |
| Custo total (estimado: a assinatura não cobra por token) | US$ 11.77 |
| Custo por agente | tech-lead US$ 5.98 · clones US$ 1.71 · reviewer US$ 1.79 · eval US$ 2.30 |
| **Custo por modelo** | Opus US$ 7.77 · Sonnet US$ 3.99 · Haiku US$ 0.02 · Gemini US$ 0.00 |
| Tokens por modelo (entrada / saída / escrita / leitura de cache) | Opus 352 / 77.293 / 365.019 / 19.137.309 · Sonnet 290 / 58.283 / 790.805 / 5.492.525 · Gemini 728.431 / 27.046 / 0 / 4.194.106 · Haiku 59.975 / 7.926 / 36.062 / 166.629 |
| Retrabalho (ajustes de Daniel) · rodadas | 1 · 1 (10 min, US$ 0.90) |
| Reprovações do Reviewer | 2 (T04, T05) |
| Alertas de contexto · handoffs | 1 · 1 |

## Revisão

O Reviewer rodou em Opus nas 3 ondas, com a mesma sessão continuada por SendMessage.
- **Onda 1 (T05, T06, T09):** T05 reprovada (faltava a linha de tokens); T06 e T09 aprovadas.
- **Onda 2 (T08):** aprovada.
- **Onda 3 (T03, T04, T07):** T04 reprovada (texto antigo); T03 e T07 aprovadas.

Nenhum achado de segurança alto ou médio. A T09 (entrada externa e hook) teve revisão de segurança dedicada.

## Retorno de Daniel

1. **Ajuste 1:** o chat deve abrir em Opus, e Daniel escolhe Sonnet ao abrir o `sprint-run`. Pediu também que o `sprint-run` **pare**, em vez de só avisar, se não estiver em Sonnet. Parar antes de gastar qualquer token não é confiável: o VS Code abre o chat sem informar o modelo ao `SessionStart`. Por isso a parada acontece na primeira resposta, sem rodar nada (v0.10.1). Daniel testou e confirmou.
2. **Gemini, chamadas demais:** Daniel viu no OmniRoute dezenas de chamadas com entrada de cerca de 90 mil tokens cada. É o ciclo do agente: uma chamada por passo, reenviando a conversa inteira, com 97% vindo do cache. O "handoff mastigado" fica como está.
3. **Experimento pedido:** a mesma tarefa-desafio dada ao Gemini e a um clone Sonnet, comparando qualidade, tempo, chamadas e consumo da franquia. Está no backlog como B103, para a S12.

## Retrospectiva

### Comparação

| | S09 | S10 | S11 |
|---|---|---|---|
| Custo (US$, estimado) | 15.42 | 26.99 | 11.77 |
| Relógio (previsto · corrido) | 14 min · 59 min | 1 h 45 min · 2 h 44 min | 1 h 12 min · 1 h 34 min |
| Leitura de cache (milhões de tokens) | — | 44,1 | 29,0 |
| Retrabalho | 1 | 0 | 1 |
| Reprovações | 0 | 0 | 2 |

O custo caiu 56% em relação à S10, com 10 tarefas contra 9. O orquestrador ainda rodou em Opus (US$ 5.98, ou 51%): o chat em Sonnet só existe a partir desta sprint. Os evals caíram de US$ 9.14 para US$ 2.30 (o `hx` do repo evitou rodadas perdidas; só uma rodada extra, da `worker`). A S12 é a primeira medida inteira no modelo novo.

### O que funcionou

- Onda 1 com 4 frentes em paralelo (Tech Lead, 2 clones e Gemini). O "fila" medido mostra 6 a 9 min de espera por revisão, e não lentidão de quem executava.
- O custo por modelo já respondeu à pergunta da sprint: Sonnet fez 5 tarefas por US$ 3.99, contra US$ 7.77 do Opus (orquestração e revisão).
- O Reviewer em Opus achou falhas reais (critério 5 incompleto, texto desatualizado), e as 2 reprovações voltaram aprovadas na 1ª re-revisão.

### O que não funcionou

- O OmniRoute caiu no início e o trabalhador morreu sem relatório. Só foi notado 7 min depois, pelo `git status`. Das 3 tarefas planejadas para o Gemini, ele concluiu sozinho só a T07.
- A T07 no Gemini levou cerca de 25 min, contra 3 a 11 min dos clones Sonnet. Foram 728 mil tokens de entrada e 4,2 milhões de leitura de cache, quase tudo contexto fixo do Claude Code (cerca de 87 mil por chamada) e esperas por 429.
- A suíte teve falhas intermitentes no Windows sob carga (timeouts e EPERM), que custaram rodadas extras.
- O `hx release` foi negado 2 vezes pelo modo automático, e Daniel teve de mandar o comando.

### Melhorias do harness

- [hx worker run: trabalhador que morre sem relatório fica invisível](../../inbox/2026-10-28-main-harness-hx-worker-run-trabalhador-que-morre-sem-relatorio-fica-invis.md) (média)
- [Testes instáveis no Windows sob carga (timeout e EPERM)](../../inbox/2026-10-28-main-harness-testes-instaveis-no-windows-sob-carga-timeout-e-eperm.md) (média)
- [hx release é bloqueado pelo modo automático](../../inbox/2026-10-28-main-harness-hx-release-e-bloqueado-pelo-modo-automatico-production-deplo.md) (baixa)
- Já no backlog: B103 (experimento Gemini × Sonnet) e B090 (`hx release` e o `SNN-release.md` da sprint).
