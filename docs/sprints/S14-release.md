# S14 — Release Report

## Resumo da entrega

**v0.12.0: `hx worker` genérico, trava de codificação e custo por tarefa; nenhum modelo externo grátis passou no teste.** Entraram `hx worker run/check` com apelidos na chave `workers` da config, a trava de codificação (BOM e texto quebrado) no `post-edit`, o custo por tarefa com rateio do chat (B100, B116, B126, B127, B131) e o guia `docs/omniroute.md`. O teste cego pedido por Daniel não mediu DeepSeek V4 Pro, Kimi K2.7 e GLM-5.2: a rota `cfp/` corta pedido acima de 6.000 caracteres (uma sessão real manda ~150 KB, então dá 502) e a NIM não tem esses modelos. Só o gpt-oss-20b rodou e reprovou (aceite 5/1, escondidos 2/6, 988 s, contra Sonnet 8/0 e 8/0 em 151 s). O ADR 0015 registra que nenhum externo grátis executa tarefa; a coluna Agente segue o ADR 0014.

**Ressalva:** o Gemini 4 Argon, próximo teste previsto, deu 429 até num pedido de uma linha (cota). Daniel fechou a S14 sem ele; virou B133 para a S15.


## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Trabalhador externo genérico: `hx worker run/check`, apelidos na config, consumo em `usage` (B100) | clone (sonnet) | 42 min | 16:52 | 08:18 | 12 min (fila: 14 min, revisão: 5 min) |
| ✅ | T02 | Trava de codificação no `post-edit` (BOM e texto quebrado) | clone (sonnet) | 19 min | 16:52 | 08:18 | 3 min (fila: 23 min, revisão: 5 min) |
| ✅ | T03 | Custo e chamadas por tarefa: clones, Reviewer, trabalhador e rateio do chat (B126, B127, B131, B116) | clone (sonnet) | 38 min | 16:52 | 08:18 | 14 min (fila: 11 min, revisão: 5 min) |
| ✅ | T04 | Guia `docs/omniroute.md`: modelos grátis (DeepSeek V4 Pro, Kimi K2.7, GLM-5.2), limites e conferência | clone (sonnet) | 19 min | 16:52 | 08:18 | 2 min (fila: 24 min, revisão: 5 min) |
| ✅ | T05 | Teste cego: protocolo, desafio 3, corridas dos 3 externos + linha de base, nota do juiz | tech-lead (sonnet) + trabalhadores + reviewer (sonnet) | 56 min | 09:11 | 13:01 | 2 h 23 min |
| ✅ | T06 | Resultado, ADR 0015 e decisão de Daniel | tech-lead (sonnet) | 24 min | 13:01 | 13:02 | 0 min |
| ✅ | T07 | Revisão final, regra do Agente (se o ADR 0015 for aceito), backlog, CHANGELOG, roadmap e release v0.12.0 | tech-lead (sonnet) + reviewer (sonnet) | 19 min | 13:03 | 13:56 | 8 min |
| ✅ | **Total** | 7 tarefas |  | 2 h 21 min | 2026-10-29 16:52 | 2026-10-30 13:56 | 3 h 5 min (pausas: 17 h 59 min) |

## Observações por tarefa

| Tarefa | Quem fez de fato | Passou de primeira? | Nota |
|---|---|---|---|
| T01 a T04 | clones Sonnet | sim (1 reprovação do Reviewer no total da sprint, já corrigida) | Onda 1 em paralelo; 3 a 14 min contra 19 a 42 previstos. A fila (11 a 24 min) é o maior custo de tempo. |
| T05 | Tech Lead (Sonnet) | sim | Estourou: 2 h 23 min contra 56 min. Mudou 4 vezes de rota (502, NIM sem chave, catálogo sem os modelos, bench quebrando 4 testes). |
| T06 | Tech Lead (Sonnet) | sim | Resultado, ADR 0015 e decisão de Daniel. |
| T07 | Tech Lead (Sonnet) + Reviewer (Sonnet) | sim | Reviewer em Sonnet, não Opus como o plano previa. O `hx release minor` precisou de autorização de Daniel e saiu a v0.12.0. |

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 2 h 21 min · 3 h 5 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 17 h 59 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 5 h · 1 h 9 min |
| Soma das tarefas (planejada · real) | 3 h 37 min · 3 h 3 min |
| Tarefas feitas | 7/7 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 514 / 125.036 / 998.717 / 17.478.750 |
| Custo total | US$ 9.88 |
| Custo por agente | tech-lead US$ 5.52 · main-harness:executor US$ 2.98 · main-harness:reviewer US$ 1.38 |
| Custo por executor | Sonnet US$ 4.90 · Opus US$ 4.98 |
| Custo por tarefa | T01 US$ 1.64 · T02 a T04 US$ 1.35 cada (rateado) · T05 US$ 2.77 · T06 US$ 0.08 · T07 US$ 0.26 |
| Chamadas por tarefa | sem-tarefa 21 · T01 45 · T02 36 · T03 36 · T04 36 · T05 65 · T06 2 · T07 12 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 1 |
| Handoffs | 5 |

## Revisão

O Reviewer final (Sonnet) aprovou T05 e T06 sem reprovar. Segurança: nenhum achado alto ou médio no token (só no env do processo filho, mascarado na saída, `redirect: "error"` no `fetch`). Dois achados corrigidos antes do release: o guia `docs/omniroute.md` não avisava que os modelos `cfp/` passam no `check` mas falham em sessão real (média), e o `scripts/bench.mjs` não validava o nome do modelo como o `worker.ts` faz (baixa). Aberto, baixa prioridade: o critério 6 do plano (nota por modelo e desafio) ficou parcial, pelo motivo acima.

## Retorno de Daniel

Nenhum ajuste pedido. Daniel escolheu testar o que a NIM tem (e não encerrar sem dado), pediu para deixar o gpt-oss de fora e, com o Argon sem cota, fechou a S14 sem ele.

## Retrospectiva

- **Deu certo:** as 4 tarefas de código saíram em onda, em 2 a 14 min cada. O teste barato (sonda de pedido pequeno) achou a causa do 502 antes de gastar mais corrida.
- **Deu errado:** a premissa do plano (os três modelos estão na NIM e rodam sessão real) não foi checada antes de aprovar. Custou a T05 inteira: 2 h 23 min contra 56 min previstos (+1 h 27 min). Em S12 o Gemini também tinha falhado, e o padrão se repete: externo grátis falha em contexto grande ou em cota.
- **Comparando:** S13 gastou US$ 19,67 em 11 tarefas e S14 US$ 9,88 em 7; o custo por tarefa agora aparece, mas T02 a T04 têm o mesmo US$ 1,35 porque o rateio é igual, não medido.
- **Próximo passo:** sondar a rota com ~100 KB e a cota com um pedido de uma linha **antes** de planejar um teste de modelo (B133, Argon).
