# S01 — Release Report: Consumo enxuto (v0.2.0 e v0.2.1)

- **Projeto:** main-harness
- **Versão do harness:** 0.2.1 (a sprint entregou a v0.2.0; o ajuste pedido por Daniel saiu na v0.2.1)
- **Período (Brasília):** 2026-10-16 00:41 → 01:26 nas tarefas; fechamento às 01:52
- **Plano:** `docs/sprints/S01-plan.md`

## Resumo da entrega

A sprint atacou o consumo, que foi o ponto fraco da S00:

- **Evals mais baratos:** o `hx eval` roda os testes de skill no Sonnet, em uma rodada, e só no que mudou desde a última versão. O custo entra no `hx usage`.
- **Reviewer:** usa o Sonnet e só passa ao Opus quando a tarefa toca em segurança.
- **Writer:** foi removido. O Tech Lead escreve os documentos.

Os três plugins (main-harness, ponytail e security-guidance) agora ficam iguais em todos os projetos: o `hx release` atualiza cada um, e o `hx doctor` avisa quando falta algum ou quando está desatualizado. No Dashboard IA, o `hx doctor` passou 18/18 na v0.2.1.

A pedido de Daniel, a lista de tarefas ganhou uma linha de **Total**, com planejado, início, fim e duração.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | `hx eval <skill>/--changed` (B006): runner de evals com `claude -p --model sonnet --output-format json`, 1 rodada, paralelismo máx. 3, sandbox temporário; escopo pela mudança desde a última tag; grava `trigger-results.json`/`results.json`; emite eventos `usage`; gate de release ajustado | tech-lead (clone A) | 1 h | 00:41 | 00:55 | 14 min |
| ✅ | T02 | Enxugar `trigger.json` de 16 para 8 consultas (4 acionam, 4 não; as mais discriminantes) | clone B | 15 min | 00:41 | 00:55 | 14 min |
| ✅ | T03 | Reviewer no Sonnet; override Opus em segurança; limite de 2 reprovações; revisão por onda, re-revisão continuando o mesmo Reviewer, sem repetir lint/testes; critério do pre-bash (acidente, não ataque); **remover o Writer** (apagar o agente e passar as escritas ao Tech Lead em agentes, comandos, skill e textos) | clone C | 35 min | 00:41 | 00:55 | 14 min |
| ✅ | T04 | Plugins companheiros: `PLUGINS` em `setup.ts`; `hx release` atualiza todos em cada projeto; `hx doctor` avisa faltando ou desatualizado | clone D | 30 min | 00:41 | 00:55 | 14 min |
| ✅ | T05 | B004 (Ponytail): remover duplicações — wrappers de git em 4 lugares (`cli/src/release/git.ts` fica), `runTool` × `runFixed`, `ESLINT_CONFIGS` repetido | tech-lead | 30 min | 00:55 | 01:06 | 11 min |
| ✅ | T06 | B008: saída UTF-8 do `hx` no PowerShell 5.1 | tech-lead | 15 min | 01:03 | 01:07 | 5 min |
| ✅ | T07 | ADR 0009, seção "Como rodar evals" no `CLAUDE.md`, backlog (B006, B004, B008 → planejado (S01); novo B009 plugins companheiros → planejado (S01)) | tech-lead | 15 min | 00:41 | 00:55 | 14 min |
| ✅ | T08 | Validação real do `hx eval` em `adr` e `handoff`, mais os casos de `sprint-plan` (corpo mudou na T03, exigido pelo gate): tempo, número de sessões, custo no `hx usage` | reviewer | 20 min | 00:55 | 01:24 | 28 min |
| ✅ | T09 | Revisão final + release v0.2.0 (`hx release minor`); plugins atualizados no Dashboard IA; `hx doctor` lá sem avisos | tech-lead + reviewer | 20 min | 01:24 | 01:26 | 3 min |
| ✅ | **Total** | 9 tarefas |  | 4 h | 2026-10-16 00:41 | 2026-10-16 01:26 | 45 min |

## Observações por tarefa

- **T01 a T04 e T07:** rodaram em paralelo, em clones, das 00:41 às 00:55. Por isso a soma das durações (1 h 58 min) é bem maior que o tempo corrido da sprint (45 min).
- **T05:** o commit levou junto, por engano, a mudança de pasta das fixtures da `sprint-plan`, que era da T08. Não causou dano; está registrado na mensagem da T08.
- **T06 (B008):** fechada só com documentação. Nenhuma correção de código era possível pelo `hx.cmd`, porque o PowerShell 5.1 fixa a codificação ao abrir.
- **T08:** a única que passou do planejado (+8 min). Foi reprovada 2 vezes:
  - na primeira, o runner não deixava o caso rodar `hx` e faltavam fixtures;
  - na segunda, a skill parava para fazer perguntas em vez de escrever o plano.
  No limite de 2 reprovações, o Tech Lead decidiu pôr as decisões dentro dos prompts dos casos. Com isso, a `sprint-plan` passou 3/3.
- **Incidente:** um comando do Tech Lead rodou com uma variável vazia e criou `C:\.claude`, `C:\.hh` e `C:\docs`. Isso quebrou 3 testes. Daniel apagou as pastas, e o pedido de proteção está abaixo.

## Indicadores

Gerado por `hx sprint close S01`. O custo é uma estimativa: a assinatura não cobra por token. O "Real" é a soma das tarefas; com o paralelismo, o tempo corrido foi de 45 min (linha Total da Execução).

### Indicadores — S01

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 1 h | 14 min | −46 min | — |
| T02 | 15 min | 14 min | −1 min | — |
| T03 | 35 min | 14 min | −21 min | — |
| T04 | 30 min | 14 min | −16 min | — |
| T05 | 30 min | 11 min | −19 min | — |
| T06 | 15 min | 5 min | −11 min | — |
| T07 | 15 min | 14 min | −1 min | — |
| T08 | 20 min | 28 min | +8 min | — |
| T09 | 20 min | 3 min | −17 min | — |
| **Total** | 4 h | 1 h 58 min | | US$ 16.32 |

| Indicador | Valor |
|---|---|
| Tarefas feitas | 9/9 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 121.505 / 172.526 / 1.720.291 / 30.511.167 |
| Custo total | US$ 16.32 |
| Custo por agente | tech-lead US$ 7.55 · main-harness:tech-lead US$ 1.73 · main-harness:reviewer US$ 2.68 · eval US$ 4.36 |
| Retrabalho (ajustes pedidos por Daniel) | 1 |
| Reprovações do Reviewer | 3 |
| Alertas de contexto | 1 |
| Handoffs | 1 |

O custo por tarefa aparece como "—" (sem dado por tarefa). Desta vez, as sessões de eval entram na conta (`eval`, US$ 4.36).

## Revisão

- **Reviewer:** 3 reprovações (2 na T08 e 1 numa tarefa da primeira onda). Todas as tarefas terminaram aprovadas, e a revisão final da T09 passou sem bloqueio.
- **Critérios de aceite (12):**
  - Atendidos: 1 a 7 e 9 a 12.
  - Critério 8 (acentos): atendido com documentação. A saída direta já sai certa; só quebra ao passar por `|`.
  - Critério 1: uma rodada de casos usa 3 sessões mais 1 de juiz, como registrado no ADR 0009.
- **Lint e tipos:** zero erros e zero avisos (`npm run check`, 262 testes).

## Retorno de Daniel

- **Durante a execução:** pediu que a lista de tarefas fosse republicada no chat a cada início e fim de tarefa. Passou a ser feito.
- **Ajuste 1 (conta como retrabalho):** pediu uma linha de Total na lista de tarefas e no Release Report, com planejado, data e hora de início, data e hora de fim, para acompanhar o tempo de cada sprint.
  - Saiu na v0.2.1, com a correção da coluna "Planejado", que mostrava 0 min.
- **Teste no Dashboard IA:** `hx doctor` passou 18/18 na v0.2.1. Daniel notou que o Bash não abre `/c/Dashboard IA`, o que virou pedido abaixo.

## Retrospectiva

**Comparação com a S00**

| Indicador | S00 | S01 |
|---|---|---|
| Tarefas | 16 | 9 |
| Planejado | 8 h 15 min | 4 h |
| Real (soma das tarefas) | 20 h 27 min | 1 h 58 min |
| Tempo corrido | 12 h 53 min (com 3 estouros de limite) | 45 min |
| Custo | US$ 42.15 (sem evals) | US$ 16.32 (com evals: US$ 4.36) |
| Retrabalho (ajustes de Daniel) | 4 | 1 |
| Reprovações do Reviewer | 3 | 3 |
| Alertas de contexto | 2 | 1 |
| Handoffs | 2 | 1 |

**O que funcionou**
- O custo caiu para menos da metade, mesmo contando os evals que a S00 deixava de fora.
- Nenhum estouro de limite.
- Os clones fizeram 5 tarefas em 14 minutos.
- Uma rodada real de casos de uma skill custou US$ 0,44 e levou cerca de 50 s.

**O que não funcionou**
- A T08 foi reprovada 2 vezes por prompts de caso ambíguos.
- O incidente da variável vazia gravou pastas fora do repo.
- O Bash do Claude Code não abre pastas com espaço no nome (Main Harness e Dashboard IA).
- O "Real" do `hx metrics` soma tarefas paralelas e confunde a comparação.

**Melhorias do harness** (pedidos criados com `hx request`, em `inbox/`):
- Alta: [recusar HARNESS_HOME relativo ou na raiz do disco](../../inbox/2026-10-16-main-harness-recusar-harness-home-relativo-ou-na-raiz-do-disco.md).
- Média: [tempo corrido no total do hx metrics](../../inbox/2026-10-16-main-harness-tempo-corrido-no-total-do-hx-metrics.md).
- Média: [Bash do Claude Code em pasta com espaço](../../inbox/2026-10-16-main-harness-bash-do-claude-code-em-pasta-com-espaco.md).
- Baixa: [casos de eval com decisões no prompt](../../inbox/2026-10-16-main-harness-casos-de-eval-com-decisoes-no-prompt.md).

**Backlog:**
- Feitos na S01: B004, B006, B008 e B009.
- Novo: B010, casos de eval de `adr` e `handoff` sem fixtures.

## CHANGELOG

Atualizado pelos `hx release` da v0.2.0 e da v0.2.1. Nada a mudar neste relatório.
