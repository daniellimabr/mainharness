# S06 — Release Report

## Resumo da entrega

A sprint fechou as 9 pendências abertas do backlog (B054–B062) e publicou a v0.7.0. Agora a duração de cada tarefa mede o trabalho do clone e mostra a revisão à parte. Os evals das skills não falham mais por falta de arquivos de teste, e os testes de tempo aguentam a máquina ocupada. O `hx statusline` grava o % de uso do limite e o título do chat, mas Daniel apontou que ele só roda no terminal. Por isso o % de uso no Dashboard virou o item B064, para a próxima sprint.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B054: `pre-bash` com `Tee-Object` e `format-patch -o` | clone A | 14 min | 10:55 | 12:43 | 4 min (revisão: 17 min) |
| ✅ | T02 | B055 + B062: cursor do `usage` e testes de tempo estáveis | clone B | 14 min | 10:55 | 12:43 | 7 min (revisão: 13 min) |
| ✅ | T03 | B056: `hx statusline` (% do limite e título), `setup` e `doctor` | clone C | 24 min | 10:55 | 12:43 | 7 min (revisão: 13 min) |
| ✅ | T04 | B057 + B058: `;` no `hx status` e `/` no `session-start` | clone D | 10 min | 10:55 | 12:43 | 5 min (revisão: 15 min) |
| ✅ | T05 | B059 + B061 (código): env limpo e aviso de caso sem fixture no `hx eval` | clone E | 14 min | 10:55 | 12:43 | 8 min (revisão: 13 min) |
| ✅ | T06 | B061 (skills): auditoria das fixtures das 8 skills e evals das alteradas | clone E | 29 min | 12:36 | 12:47 | 10 min (revisão: 1 min) |
| ✅ | T07 | B060: duração até a entrega do clone, revisão à parte | clone F | 19 min | 10:55 | 12:43 | 8 min (revisão: 13 min) |
| ✅ | T08 | Revisão final, backlog (B054–B062), CHANGELOG e release v0.7.0 (`hx release minor`) | tech-lead + reviewer | 19 min | 12:47 | 12:49 | 2 min |
| ✅ | **Total** | 8 tarefas |  | 1 h 2 min | 2026-10-21 10:55 | 2026-10-21 12:49 | 27 min (pausas: 1 h 27 min) |

## Observações por tarefa

- **Onda 1 (T01–T05, T07):** às 10:59 os seis clones pararam no limite mensal de gasto e voltaram às 12:26, quando Daniel pediu para continuar. O `hx` contou essa parada como pausa (1 h 27 min), fora do corrido.
- **T02:** com a máquina ocupada, o teste de 5 MB ainda estourou o tempo na suíte inteira. O motivo era a forma como o próprio teste montava o arquivo (custo quadrático). O Tech Lead corrigiu antes do commit.
- **T03:** os nomes dos campos da status line (`session_name`, `rate_limits.*`) vieram do backlog e não foram conferidos na documentação.
- **T06:** a auditoria só sinalizou a `tdd-workflow`. O eval dela falhou duas vezes (acionamento 5/8 e 6/8; casos 1/3) até a descrição e o Passo 4 da skill serem ajustados. Depois passou de primeira: 8/8 no acionamento e 3/3 nos casos.
- **T01, T02, T03, T07:** o Reviewer aprovou e apontou ajustes menores, aplicados antes do commit:
  - `format-patch --output-dir` abreviado;
  - o teste de 5 MB passou a exigir uma leitura nova;
  - o `try` em volta do evento na status line;
  - o `events.md` documenta `actual_min_by_task` e `review_min_by_task`.

## Indicadores

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 14 min | 4 min (revisão: 17 min) | −10 min | — |
| T02 | 14 min | 7 min (revisão: 13 min) | −7 min | — |
| T03 | 24 min | 7 min (revisão: 13 min) | −17 min | — |
| T04 | 10 min | 5 min (revisão: 15 min) | −5 min | — |
| T05 | 14 min | 8 min (revisão: 13 min) | −6 min | — |
| T06 | 29 min | 10 min (revisão: 1 min) | −19 min | — |
| T07 | 19 min | 8 min (revisão: 13 min) | −11 min | — |
| T08 | 19 min | 2 min | −17 min | — |
| **Total** | 2 h 23 min | 51 min (soma) | | US$ 10.27 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 1 h 2 min · 27 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 1 h 27 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 5 h 3 min · 16 min |
| Soma das tarefas (planejada · real) | 2 h 23 min · 51 min |
| Tarefas feitas | 8/8 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 66.556 / 78.946 / 1.261.035 / 14.885.748 |
| Custo total (estimado: a assinatura não cobra por token) | US$ 10.27 |
| Custo por agente | tech-lead US$ 2.60 · main-harness:tech-lead US$ 4.64 · main-harness:reviewer US$ 1.01 · eval US$ 2.02 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 0 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

O custo por tarefa saiu "—" porque os clones rodaram em paralelo, sem uma tarefa única ativa. O "Real" por tarefa vai até a entrega do clone (B060). O tempo de revisão da onda 1 (13 a 17 min) inclui a fila: a espera pelos outros clones e pelo commit em lote. O Reviewer levou cerca de 3 min.

## Revisão

O Reviewer aprovou as 8 tarefas, sem reprovação. A onda 1 foi revisada no Opus (hooks, setup e entrada externa) e a T06 no Sonnet.

1. `Tee-Object` e `format-patch -o` para destino protegido são negados; destinos comuns passam: atendido (`pre-bash-s06.test.ts`, 19 casos).
2. O streaming com uma linha `user` no meio grava o `output_tokens` final: atendido.
3. Os testes de tempo passam com a CPU ocupada: atendido. A suíte inteira passou com os evals rodando ao lado.
4. `hx statusline` grava o evento e imprime a linha; JSON inválido ou vazio não quebra; setup e doctor: atendido. Ressalva: só roda onde o Claude Code executa a status line (ver Retorno).
5. `hx status` com `;`: atendido.
6. Item do backlog com `\|` aparece inteiro: atendido.
7. A sessão do `hx eval` não recebe as 3 variáveis: atendido.
8. O aviso de caso sem `files` funciona, nenhuma skill fica sinalizada e a `tdd-workflow` passa nos evals: atendido.
9. "7 min (revisão: 9 min)" e a soma até a entrega: atendido.
10. Lint e tipos: zero erros e zero avisos (`npm run check`: 421 testes).

## Retorno de Daniel

- A status line só aparece no terminal e, assim, não serve. O que importa é o harness e o Dashboard mostrarem o % de uso da sessão atual (5 h) e o semanal. Isso virou o item B064 (prioridade alta), que precisa de uma fonte que funcione em qualquer interface, inclusive na extensão do VS Code.
- Não houve ajuste pedido dentro da S06 (retrabalho 0).

## Retrospectiva

### Comparação

| Indicador | S04 | S05 | S06 |
|---|---|---|---|
| Relógio (previsto · corrido) | 48 min · 58 min | 1 h 12 min · 53 min | 1 h 2 min · 27 min |
| Soma (planejada · real) | 2 h 6 min · 3 h 41 min | 3 h 10 min · 3 h | 2 h 23 min · 51 min |
| Custo | US$ 12.46 | US$ 17.40 | US$ 10.27 |
| Retrabalho | 0 | 0 | 0 |
| Reprovações | 1 | 1 | 0 |
| Alertas de contexto | 0 | 0 | 0 |

O relógio caiu para 44% do previsto (S05: 74%). A soma real despencou (36% do planejado) principalmente porque mudou a régua: desde a v0.7.0 ela mede só até a entrega do clone, não até o done. O custo caiu 41% em relação à S05. A espera por Daniel (5 h 3 min) é quase toda o intervalo até o teste. A lentidão do agente não pesou; o atraso maior foi o limite de gasto.

### O que funcionou

- Seis clones em paralelo sem cruzar arquivo: 6 tarefas entregues em cerca de 4 min de trabalho cada, depois que o limite voltou.
- Uma revisão por onda, sem nenhuma reprovação: os ajustes menores entraram antes do commit, sem volta ao clone.
- A régua nova (B060) já mediu esta sprint: o tempo de revisão aparece à parte.

### O que não funcionou

- O limite mensal de gasto parou tudo por 1 h 27 min, e só Daniel pôde retomar (B005 continua fora de escopo).
- Dois clones usaram uma função que não existe na versão de TypeScript do projeto, e o Stop do Tech Lead bloqueou duas vezes por erros de tipo de trabalho em andamento.
- A status line foi entregue sem conferir onde ela roda: na extensão do VS Code ela não serve a Daniel.
- O plano superestimou a T06 e a T08 (29 e 19 min planejados; 10 e 2 min reais).

### Melhorias do harness

- [Separar fila e revisão no tempo de revisão da tarefa](../../inbox/2026-10-21-main-harness-separar-fila-e-revisao-no-tempo-de-revisao-da-tarefa.md) (baixa)
- [Recalibrar o fator da soma com a duração até a entrega](../../inbox/2026-10-21-main-harness-recalibrar-o-fator-da-soma-com-a-duracao-ate-a-entrega.md) (média)
- [Handoff de clone pede tsc além do lint](../../inbox/2026-10-21-main-harness-handoff-de-clone-pede-tsc-alem-do-lint.md) (baixa)
- B064 no backlog: % de uso (5 h e semanal) no harness e no Dashboard, em qualquer interface (alta, pedido de Daniel).
