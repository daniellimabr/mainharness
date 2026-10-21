# Release Report — S05: Eventos completos para o Dashboard e ciclo de pedidos fechado

- **Projeto:** main-harness
- **Versão do harness:** 0.6.0
- **Período (UTC):** 2026-10-21 11:14 → 2026-10-21 12:07
- **Plano:** `docs/sprints/S05-plan.md`

## Resumo da entrega

O Dashboard IA passa a receber eventos de agentes (início e fim de clones e Reviewer), de cada comando de Daniel (sem o texto), o título do chat e o consumo de tokens correto. Os tempos da sprint ficaram honestos: tarefa reaberta soma as passadas, e a espera por Daniel aparece à parte. Cada projeto fica sabendo, no chat novo, dos pedidos dele atendidos no harness. Na segurança e no setup, a trava do terminal cobre redirecionamentos e `git --output=`, o `hx setup` libera o `hx` no modo auto e o `hx release` valida o plugin antes de publicar. Saiu a v0.6.0.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B052 + B048: eventos de agente, comando, título do chat, `project.status`, pesquisa do % de limite, contrato | clone A | 33 min | 08:14 | 08:30 | 16 min (revisão: 10 min) |
| ✅ | T02 | B051: `usage` com o `output_tokens` final | clone B | 17 min | 08:14 | 08:30 | 16 min (revisão: 8 min) |
| ✅ | T03 | B046, B047: `pre-bash` com `--output=` e redirecionamentos | clone C | 17 min | 08:14 | 08:30 | 16 min (revisão: 8 min) |
| ✅ | T04 | B044: `hx setup` grava `autoMode.allow`; `hx doctor` confere | clone D | 17 min | 08:14 | 08:35 | 20 min (revisão: 9 min) |
| ✅ | T05 | B053: tarefa reaberta soma as passadas | clone E | 17 min | 08:14 | 08:30 | 16 min (revisão: 8 min) |
| ✅ | T06 | B045: espera por Daniel separada (`hx metrics`, `sprint close`, Release Report) | clone E | 22 min | 08:30 | 08:42 | 12 min (revisão: 7 min) |
| ✅ | T07 | B049, B050: relógio calibrado e sem tarefa de revisão da onda na `sprint-plan` | tech-lead | 11 min | 08:14 | 08:30 | 16 min (revisão: 3 min) |
| ✅ | T08 | B028: `hx release` valida o manifesto | clone F | 11 min | 08:14 | 08:30 | 16 min (revisão: 9 min) |
| ✅ | T09 | B030: projeto fica sabendo dos pedidos atendidos | clone A | 17 min | 08:30 | 08:42 | 12 min (revisão: 3 min) |
| ✅ | T10 | Validação real: `hx eval sprint-plan` | reviewer | 11 min | 08:17 | 08:30 | 13 min (revisão: 5 min) |
| ✅ | T11 | Revisão final, backlog (B028, B030, B032, B034, B044–B053), CHANGELOG e release v0.6.0 (`hx release minor`) | tech-lead + reviewer | 17 min | 08:42 | 09:07 | 25 min (revisão: 19 min) |
| ✅ | **Total** | 11 tarefas |  | 1 h 12 min | 2026-10-21 08:14 | 2026-10-21 09:07 | 53 min |

## Observações por tarefa

- **T01:** o `session.start` só recebe o título quando o chat tem nome (`/rename` ou `--name`); o título automático e o % do limite só chegam à status line (B056).
- **T03:** além do pedido, `rm`/`mv` de `cli/dist/hx.js` pelo terminal passaram a ser bloqueados (mesma regra do `pre-edit`); `Tee-Object` e `git format-patch -o` ficaram para o B054.
- **T04:** reprovada uma vez: a regra do modo auto liberava `hx run` com qualquer comando dentro, em todo projeto. Corrigido (`hx run` só vale se o comando de dentro valeria sozinho; `hx release` fora da regra global) e `settings.json` com formato estranho deixou de quebrar o setup.
- **T06:** a skill `release-report` mudou, e o eval dela deu 0/3 por falta de ambiente (sandbox vazio, repo não conectado). Um clone criou as fixtures, que pegaram um defeito real (Observações repetindo a tabela); a skill foi corrigida e o eval passou com 3/3.
- **T09:** depois da aprovação, passou a mostrar os 10 pedidos mais recentes (com o histórico antigo, os da sprint atual ficavam fora do limite). O Reviewer confirmou.
- **T10:** os evals da `sprint-plan` rodaram em paralelo com os clones da onda 1, antes da revisão.

## Indicadores

Sprint S05 fechada: 11/11 tarefas em 53 min (aguardou teste por 42 min).

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 33 min | 16 min (revisão: 10 min) | −17 min | — |
| T02 | 17 min | 16 min (revisão: 8 min) | −1 min | — |
| T03 | 17 min | 16 min (revisão: 8 min) | −1 min | — |
| T04 | 17 min | 21 min (revisão: 9 min) | +4 min | — |
| T05 | 17 min | 16 min (revisão: 8 min) | −1 min | — |
| T06 | 22 min | 12 min (revisão: 7 min) | −10 min | — |
| T07 | 11 min | 16 min (revisão: 3 min) | +5 min | — |
| T08 | 11 min | 16 min (revisão: 9 min) | +5 min | — |
| T09 | 17 min | 12 min (revisão: 3 min) | −5 min | — |
| T10 | 11 min | 13 min (revisão: 5 min) | +2 min | — |
| T11 | 17 min | 25 min (revisão: 19 min) | +8 min | — |
| **Total** | 3 h 10 min | 3 h (soma) | | US$ 17.40 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 1 h 12 min · 53 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 0 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 0 min · 53 min |
| Soma das tarefas (planejada · real) | 3 h 10 min · 3 h |
| Tarefas feitas | 11/11 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 314.759 / 193.152 / 1.880.060 / 35.973.187 |
| Custo total | US$ 17.40 |
| Custo por agente | tech-lead US$ 3.59 · main-harness:tech-lead US$ 5.61 · eval US$ 5.94 · main-harness:reviewer US$ 2.25 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

"Espera por Daniel" ficou em 0 min porque esta sessão rodou com os hooks da v0.5.0: os eventos `turn.end` e `prompt` só existem a partir da v0.6.0. A espera real foi a do teste (42 min, linha acima). Vale a partir da S06.

## Revisão

- **Reviewer** (Opus, por haver hooks, setup e release): T01, T02, T03, T05, T06, T07, T08, T09, T10 e T11 aprovadas na primeira; T04 reprovada uma vez (regra do modo auto ampla demais) e aprovada na re-revisão. Security review sem achados em T06 e T09; achados baixos foram para o backlog (B054, B055, B057, B058, B059).
- **Critérios de aceite:**
  1. Eventos de agente com `agent_id` e tarefa, `prompt` sem texto, título no `session.start`: atendido.
  2. Contrato com os tipos novos e `task.phase`, `EVENT_VERSION` 1: atendido.
  3. `usage` com o `output_tokens` da última linha, também entre leituras: atendido.
  4. `--output=` e `>` para destinos protegidos tratados como escrita: atendido.
  5. `hx setup` grava a regra e mantém as chaves; `hx doctor` avisa: atendido (Daniel rodou na máquina real).
  6. Tarefa reaberta soma as passadas (6 + 4 = 10 min): atendido.
  7. "Espera por Daniel" à parte em `hx metrics`, close e Release Report: atendido.
  8. Plano sem "revisão da onda"; evals da `sprint-plan` passam: atendido.
  9. `hx release` com manifesto inválido para antes de publicar: atendido.
  10. Pedidos atendidos no chat novo do Dashboard IA, uma vez só: Daniel aprovou a sprint.
  11. Lint e tipos: zero erros e zero avisos: atendido.
- **Lint e tipos:** zero erros e zero avisos (`npm run check`; 2 testes de tempo estouraram com a máquina carregada e passaram isolados).

## Retorno de Daniel

Nenhum ajuste pedido (`hx sprint feedback` não usado). Daniel rodou `hx setup` e `hx doctor` na máquina real (só restou o aviso inofensivo da pasta com espaço) e aprovou a sprint. Próximo passo escolhido: S06 curta no harness para zerar as pendências (B054–B059) e depois voltar ao Dashboard.

## Retrospectiva

| Indicador | S02 | S03 | S04 | S05 |
|---|---|---|---|---|
| Tempo corrido | 30 min | 4 h 17 min | 58 min (+1 h 12 min de pausas) | 53 min |
| Tempo previsto (relógio) | 55 min | 45 min | 48 min | 1 h 12 min |
| Soma das tarefas (planejada · real) | 2 h 20 min · 1 h 14 min | 1 h 50 min · 6 h 47 min | 2 h 6 min · 3 h 41 min | 3 h 10 min · 3 h |
| Custo | US$ 11.55 | US$ 26.65 | US$ 12.46 | US$ 17.40 |
| Retrabalho (ajustes de Daniel) | 1 | 0 | 0 | 0 |
| Reprovações do Reviewer | 1 | 2 | 1 | 1 |

- **Comparação:** a soma real ficou 5% abaixo da planejada (S04: 75% acima) e o relógio 26% abaixo do previsto (S04: 21% acima). É a primeira sprint com previsão calibrada e sem tarefa de "revisão da onda", e o erro caiu. O custo subiu US$ 4.94 sobre a S04, quase tudo em evals (US$ 5.94, 34% do total).
- **O que funcionou:** 6 clones em paralelo na onda 1 sem conflito de arquivo; uma revisão por onda com o mesmo Reviewer (re-revisões rápidas, 1 a 2 min); onda 2 só depois dos commits da onda 1, com um commit por tarefa; evals rodando enquanto os clones trabalhavam.
- **O que não funcionou:** a duração das tarefas da onda 1 saiu igual (16 min) porque o `done` só vem no commit, depois da revisão da onda; os clones levaram de 6 a 8 min. O eval da `release-report` não tinha fixtures e custou um clone de 19 min. Os testes de tempo dão falha falsa com a máquina carregada.
- **Oportunidades de melhoria no harness:**
  - Duração da tarefa medir a entrega, não a onda: `inbox/2026-10-21-main-harness-duracao-da-tarefa-mede-a-onda-nao-a-tarefa.md`
  - Fixtures nos evals de todas as skills: `inbox/2026-10-21-main-harness-evals-de-skill-sem-fixtures-falham-por-ambiente.md`
  - Testes de tempo estáveis com a máquina carregada: `inbox/2026-10-21-main-harness-testes-de-tempo-estouram-com-a-maquina-carregada.md`
