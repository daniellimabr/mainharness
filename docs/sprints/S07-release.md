# S07 — Release Report

## Resumo da entrega

A sprint publicou a v0.8.0. O harness passa a gravar o % de uso do Claude Code (sessão de 5 h e semanal) em qualquer interface, inclusive na extensão do VS Code, pelo endpoint interno do `/usage` (exceção registrada no ADR 0010). Quando a vez do agente termina por limite, o hook `StopFailure` (`rate_limit`) agenda no Agendador do Windows a retomada do chat 2 min após o reinício (ADR 0011). A status line saiu. A tabela de tarefas separa fila e revisão, o handoff de clone pede o `tsc` e a `sprint-plan` calibra o fator só com sprints que têm a fase `revisão`.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B064: % de uso pelo endpoint, evento `usage.limits`, Stop e `hx usage`; ADR e roadmap | clone A | 13 min | 17:53 | 18:16 | 11 min (revisão: 11 min) |
| ✅ | T02 | B065 + B063: remove a status line; `safeText` em `core/text.ts` | clone B | 7 min | 17:53 | 18:16 | 9 min (revisão: 14 min) |
| ✅ | T03 | B066 + B067: `tsc` no handoff e fator da soma pela régua nova; evals | clone C | 11 min | 17:53 | 18:16 | 20 min (revisão: 2 min) |
| ✅ | T04 | B068: fila e revisão separadas no tempo da tarefa | clone D | 9 min | 17:53 | 18:16 | 9 min (revisão: 13 min) |
| ✅ | T05 | B005: retomada automática após o limite (`hx resume`, agendamento no Stop, setup e doctor); ADR | clone A | 18 min | 18:16 | 18:32 | 11 min (revisão: 5 min) |
| ✅ | T06 | Revisão final, backlog (B005, B063–B068), CHANGELOG e release v0.8.0 (`hx release minor`) | tech-lead + reviewer | 5 min | 18:32 | 18:45 | 12 min |
| ✅ | **Total** | 6 tarefas |  | 36 min | 2026-10-21 17:53 | 2026-10-21 18:45 | 52 min |

## Observações por tarefa

- **Onda 1 (T01–T04):** a T02 apagou o `statusline.ts` antes de o roteador ser ajustado. O build do `globalSetup` quebrou, e os clones da T01, T02 e T04 testaram com configs próprias sem ele. O Tech Lead ajustou o roteador e rodou a suíte inteira antes dos commits.
- **T01:** o formato da resposta do endpoint veio de fontes da comunidade, sem chamada real. O Tech Lead pôs `HARNESS_NO_LIMITS=1` no `vitest.config.mts` para nenhum teste chamar a API de verdade.
- **T03:** os evals da `sprint-plan` deram 0/5 na primeira rodada por "sem veredito do juiz", com respostas certas; passaram com `--failed` (5/5). Handoff: 2/3, depois 3/3, depois de juntar o `tsc` na mesma linha do lint para caber em 40 linhas. A T03 foi a mais longa (20 min contra 11) por causa dos evals.
- **T04:** a fase `fila` ficava em `commands/task.ts` e o `queue_min_by_task` precisava entrar no schema, fora dos arquivos do clone; o Tech Lead completou os dois. O teste veio depois do código; o Reviewer aceitou porque confere o critério com valores exatos.
- **T05:** o sinal de parada por limite é oficial: hook `StopFailure` com matcher `rate_limit`. O clone usou `schtasks /create /xml` em vez de `/sc once /sd`, porque o `/sd` depende do formato de data regional. A fase `fila` não existia no `hx` estável durante a sprint, então a T05 marcou `revisão`.
- **T06:** o modo auto negou o `hx release minor` como "Production Deploy"; Daniel pediu e o Tech Lead rodou. Quatro commits de tarefa saíram sem prefixo `feat`/`fix` e caíram em "Outros" no CHANGELOG; a correção entrou num commit depois da tag v0.8.0.

## Indicadores

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 13 min | 11 min (revisão: 12 min) | −2 min | — |
| T02 | 7 min | 9 min (revisão: 14 min) | +2 min | — |
| T03 | 11 min | 20 min (revisão: 2 min) | +9 min | — |
| T04 | 9 min | 9 min (revisão: 14 min) | +0 min | — |
| T05 | 18 min | 12 min (revisão: 5 min) | −7 min | — |
| T06 | 5 min | 12 min | +7 min | — |
| **Total** | 1 h 3 min | 1 h 13 min (soma) | | US$ 11.44 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 36 min · 52 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 0 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 37 min · 19 min |
| Soma das tarefas (planejada · real) | 1 h 3 min · 1 h 13 min |
| Tarefas feitas | 6/6 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 92.575 / 154.782 / 1.084.372 / 21.411.711 |
| Custo total (estimado: a assinatura não cobra por token) | US$ 11.44 |
| Custo por agente | tech-lead US$ 2.54 · main-harness:tech-lead US$ 4.90 · eval US$ 2.78 · main-harness:reviewer US$ 1.22 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 3 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

O custo por tarefa saiu "—" porque os clones rodaram em paralelo. A "revisão" da onda 1 (11 a 14 min) ainda inclui a fila: a fase `fila` (B068) só passa a valer a partir da v0.8.0.

## Revisão

Uma revisão por onda, no Opus (token, `settings.json` e comando agendado). Três reprovações, uma por tarefa, todas corrigidas pelo Tech Lead e aprovadas na re-revisão:

- **T01:** a linha do limite no `hx usage` saía uma letra por linha (string espalhada no array). O Reviewer criou o teste que pegou o bug.
- **T02:** o evento `statusline` não estava marcado como obsoleto no contrato, e o `index.md` ainda listava os arquivos apagados.
- **T05:** um novo estouro durante a retomada apagava o agendamento novo. Agora o `hx resume` só apaga a tarefa se o horário pendente não mudou; teste novo cobre o caso.

Critérios de aceite:

1. `usage.limits` com os dois percentuais e reinícios, intervalo de 5 min, nada gravado sem credencial, com erro de rede, resposta inválida ou demora: atendido (`limits.test.ts`, 11 casos).
2. Token só no cabeçalho para `api.anthropic.com`, ausente de eventos e arquivos: atendido (varredura do `HARNESS_HOME` no teste; `redirect: "error"`).
3. `hx usage` mostra "Limite: 5 h X% · semana Y%": atendido depois da correção.
4. Reinício às 15:00 agenda às 15:02, segundo estouro substitui, parada normal não agenda, entrada malformada recusada: atendido (`resume.test.ts`).
5. `hx resume` roda `claude --resume`, grava evento e apaga a tarefa: atendido.
6. `hx statusline` removido; `setup` tira só a `statusLine` do harness; `doctor` sem aviso: atendido.
7. `safeText` em `core/text.ts`, nenhum comando importa de `hooks/`: atendido.
8. `tsc` no handoff de clone e fator só das sprints com `revisão`; evals passando (handoff 3/3, sprint-plan 5/5): atendido.
9. "4 min (fila: 14 min, revisão: 3 min)": atendido.
10. Lint e tipos: zero erros e zero avisos (`npm run check`: 445 testes).

Fica para o teste de ponta a ponta: o formato real da resposta do endpoint, se o `/create /f` sobre uma retomada em execução a derruba, e se aparece janela de console durante a retomada.

## Retorno de Daniel

- Perguntou como o limite é detectado se o modelo não pode mais rodar código. Resposta: quem dispara é o Claude Code, pelo hook `StopFailure` (`rate_limit`), que roda o `hx` como programa comum, sem o modelo.
- Pediu que o Tech Lead rodasse o `hx release minor`, que o modo auto tinha negado.
- "Tudo parece ok por enquanto": sem ajustes (retrabalho 0). O teste real fica para o uso diário e o próximo estouro do limite.

## Retrospectiva

### Comparação

| Indicador | S05 | S06 | S07 |
|---|---|---|---|
| Relógio (previsto · corrido) | 1 h 12 min · 53 min | 1 h 2 min · 27 min | 36 min · 52 min |
| Soma (planejada · real) | 3 h 10 min · 1 h 38 min | 2 h 23 min · 51 min | 1 h 3 min · 1 h 13 min |
| Custo | US$ 17.40 | US$ 10.27 | US$ 11.44 |
| Retrabalho | 0 | 0 | 0 |
| Reprovações | 1 | 0 | 3 |
| Alertas de contexto | 0 | 0 | 0 |

Pela primeira vez desde a S04 a sprint passou do previsto: relógio em 144% e soma em 116%. O fator de 0,44 da soma (S05 e S06) ficou otimista. Pesaram a T03 (evals com juiz falhando, +9 min) e a T06 (release negada pelo modo auto, +7 min). O trabalho efetivo foi de 19 min; o resto do corrido foi espera por clones, pelo Reviewer e por Daniel. O custo ficou perto do da S06. As 3 reprovações eram bugs reais (um deles derrubava a retomada no caso mais provável), o que mostra a revisão em Opus pagando o custo.

### O que funcionou

- Quatro clones em paralelo na onda 1, e o clone da T01 reaproveitado na T05 com o contexto do `limits.ts`.
- O Reviewer escreveu o teste que pegou o bug da T01 e achou o caso de reagendamento da T05 só lendo o código.
- O sinal de parada por limite foi conferido na documentação antes do código, e é oficial.

### O que não funcionou

- Apagar um módulo numa onda paralela quebrou o build de teste dos outros clones.
- Commits de tarefa sem prefixo convencional bagunçaram o CHANGELOG, e a correção ficou fora da tag.
- O juiz do eval falhou numa rodada inteira (0/5) com respostas certas.
- A release precisou de Daniel por causa do classificador do modo auto.

### Melhorias do harness

- [Build do globalSetup não quebrar com módulo removido por outro clone](../../inbox/2026-10-21-main-harness-build-do-globalsetup-nao-quebrar-com-modulo-removido-por-out.md) (média)
- [hx release avisa commit sem prefixo convencional](../../inbox/2026-10-21-main-harness-hx-release-avisa-commit-sem-prefixo-convencional.md) (média)
- [hx eval repete sozinho o juiz sem veredito](../../inbox/2026-10-21-main-harness-hx-eval-repete-sozinho-o-juiz-sem-veredito.md) (média)
- [Release liberada no modo auto quando Daniel pede](../../inbox/2026-10-21-main-harness-release-liberada-no-modo-auto-quando-daniel-pede.md) (baixa)
