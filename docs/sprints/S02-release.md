# S02 — Release Report: Sprint mais clara e mais segura (v0.3.0)

## Resumo da entrega

- **Acompanhar a sprint:** as mensagens começam com `[TNN] Título:`. O comando `hx task phase` mostra em que fase está a tarefa em andamento.
- **Tempo:** o "Planejado" do total passou a ser o tempo de relógio previsto, calculado pelas dependências entre tarefas (ajuste pedido por Daniel). O `hx metrics` separa o relógio da soma das tarefas, e a skill `sprint-plan` estima pelo histórico.
- **Segurança:** se `HARNESS_HOME` apontar para um caminho relativo ou para a raiz do disco, o `hx` para com erro e não grava nada. O hook que bloqueia comandos perigosos continua funcionando mesmo assim.
- **Pasta com espaço:** o `hx doctor` avisa e as instruções explicam a mensagem estranha do Bash.
- **Evals:** os casos de teste foram reescritos com uma regra única. `sprint-plan`, `adr` e `handoff` passaram de verdade.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B017: `harnessHome()` recusa `HARNESS_HOME` relativo ou na raiz do disco, com erro claro | clone A | 15 min | 07:10 | 07:20 | 10 min |
| ✅ | T02 | B011 (código): `hx doctor` avisa projeto em pasta com espaço e mostra a orientação | clone B | 15 min | 07:10 | 07:19 | 9 min |
| ✅ | T03 | B016 + B011 (texto): regra `[TNN] Título:` nas mensagens e orientação do Bash em pasta com espaço | clone C | 10 min | 07:10 | 07:19 | 9 min |
| ✅ | T04 | B018: tempo corrido no total do `hx metrics` e do `sprint close` | clone D | 15 min | 07:10 | 07:19 | 9 min |
| ✅ | T05 | B015: `hx task phase TNN <fase>`; fase na linha 🔄; `sprint-run` chama o comando a cada fase | tech-lead | 25 min | 07:19 | 07:23 | 4 min |
| ✅ | T06 | B014: `sprint-plan` mostra planejado × real das sprints anteriores e estima pelo histórico | clone E | 10 min | 07:15 | 07:23 | 8 min |
| ✅ | T07 | B010 + B012 + B013: regra dos casos de eval; caso 3 da `sprint-plan` sem a ação; caso 4 vago; fixtures de `adr` e `handoff` | clone F | 20 min | 07:10 | 07:19 | 9 min |
| ✅ | T08 | Validação real: `hx eval sprint-plan`, `adr`, `handoff` (casos); tempo, sessões e custo no `hx usage` | reviewer | 15 min | 07:23 | 07:36 | 13 min |
| ✅ | T09 | Revisão final, backlog (B010–B018 → feito (S02)), CHANGELOG e release v0.3.0 (`hx release minor`) | tech-lead + reviewer | 15 min | 07:36 | 07:40 | 4 min |
| ✅ | **Total** | 9 tarefas |  | 55 min | 2026-10-16 07:10 | 2026-10-16 07:40 | 30 min |

## Observações por tarefa

- **Antes da T01: bug na aprovação.**
  - O `hx sprint open` recusou o plano aprovado. O `hx sprint approve` calculava o hash e só depois punha uma linha em branco antes da seção de aprovação, então o hash nunca batia.
  - Corrigido com um teste novo (commit `2baa50c`). Daniel reaprovou o plano sem mudar nada nele.
- **T01, T02, T03, T04 e T07: cinco tarefas ao mesmo tempo.**
  - Quatro clones trabalharam em paralelo, e o Tech Lead fez a T01. Todas ficaram prontas em cerca de 9 min.
- **T01: reprovada uma vez (segurança).**
  - O Reviewer (Opus) viu que, com `HARNESS_HOME` inválido, o hook `pre-bash` dava erro e acabava liberando o comando.
  - Corrigido: o hook usa os valores padrão e continua bloqueando. Há um teste para esse caso.
- **T04: corrido guardado fora do evento.** O clone guardou o tempo corrido num desvio interno. O Tech Lead trocou pelo campo `wall_min`, opcional, no evento `sprint.metrics`, e registrou no contrato de eventos.
- **T05: fase fora da coluna de status.** A fase aparece na própria coluna de status (`🔄 revisão`). O teste foi para `sprint.test.ts`, e não para um `task.test.ts` novo.
- **T08: o eval do `adr` falhou no caso 3.**
  - Diante do pedido "atualiza a decisão do ADR 0003", a skill reescreveu o 0003. O certo era criar um ADR novo que o substitui.
  - A regra foi reforçada no topo da skill e no checklist final. Na nova rodada, passou 3/3.
  - A 1ª rodada de evals foi interrompida, porque o ajuste 1 mudou o texto da `sprint-plan`. O custo dela entra no total.

## Indicadores

Gerado por `hx sprint close S02`. O custo é uma estimativa: a assinatura não cobra por token. A 1ª linha do close ("9/9 tarefas em 3 h 39 min") conta desde o `sprint open` e inclui a espera pelo teste de Daniel. O tempo corrido das tarefas foi de 30 min.

### Indicadores — S02

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 15 min | 10 min | −5 min | — |
| T02 | 15 min | 9 min | −6 min | — |
| T03 | 10 min | 9 min | −1 min | — |
| T04 | 15 min | 9 min | −6 min | — |
| T05 | 25 min | 4 min | −21 min | — |
| T06 | 10 min | 8 min | −2 min | — |
| T07 | 20 min | 9 min | −11 min | — |
| T08 | 15 min | 13 min | −2 min | — |
| T09 | 15 min | 4 min | −11 min | — |
| **Total** | 2 h 20 min | 1 h 14 min (soma) | | US$ 11.55 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 55 min · 30 min |
| Soma das tarefas (planejada · real) | 2 h 20 min · 1 h 14 min |
| Tarefas feitas | 9/9 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 129.753 / 118.613 / 1.216.700 / 22.463.697 |
| Custo total | US$ 11.55 |
| Custo por agente | tech-lead US$ 5.46 · main-harness:tech-lead US$ 1.79 · main-harness:reviewer US$ 0.92 · eval US$ 3.37 |
| Retrabalho (ajustes pedidos por Daniel) | 1 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

O custo por tarefa aparece como "—" porque as sessões não se ligam a uma tarefa específica.

## Revisão

- **Reviewer:** foram 4 revisões: onda 1 (Opus, por causa da T01), onda 2, ajuste 1 e revisão final. Houve 1 reprovação (T01), corrigida e aprovada na re-revisão. Todas as tarefas terminaram com `hx review pass`.
- **Critérios de aceite:**
  1. `HARNESS_HOME` relativo, `\.hh` ou raiz do disco → erro claro, nada gravado; vazio → `~/.harness`. ✅
  2. `hx doctor` avisa só em pasta com espaço. ✅
  3. Regra `[TNN] Título:` e orientação do Bash em `tech-lead.md` e `sprint-run.md`. ✅
  4. `hx metrics` e `hx sprint close` mostram previsto × corrido e a soma planejada × real. ✅ O formato mudou com o ajuste 1.
  5. `hx task phase`: fase na linha 🔄, fase inválida dá erro, `done` limpa. ✅ Coberto por teste. Não foi usado na própria S02, porque o `hx` instalado era o 0.2.1 até a T09.
  6. `sprint-plan` mostra o histórico e estima por ele. ✅
  7. Caso 3 sem a ação conferida, caso 4 vago, fixtures de `adr` e `handoff`. ✅
  8. Evals reais: `sprint-plan` 4/4, `adr` 3/3, `handoff` 3/3. ✅
  9. **Lint e tipos: zero erros e zero avisos.** 278 testes passando, `cli/dist/hx.js` rebuildado. ✅
  10. Release v0.3.0 com `hx release minor`, backlog B010–B018 como feito (S02). ✅

## Retorno de Daniel

- **Ajuste 1 (conta como retrabalho):** o "Planejado" do total deve mostrar o tempo previsto da sprint considerando o paralelismo, e não a soma das tarefas.
  - Feito: o previsto é o caminho mais longo pela coluna "Depende de" (sem a coluna, vale a soma). O evento ganhou `planned_wall_min`, e a skill `sprint-plan` passou a pedir essa coluna.
  - Na S02, o previsto deu 55 min, contra 2 h 20 min da soma.
- **Painel do ponytail:** apareceu num chat novo depois da v0.3.0, que atualizou o ponytail para a 5.3.0. Daniel preferiu desligar. Foi desligado nesta máquina (`~/.claude/.ponytail-band`).
- **Preview do VS Code:** a pré-visualização em Markdown mostrava a lista antiga, embora o arquivo estivesse certo. É cache do VS Code, não do `hx`.

## Retrospectiva

| Indicador | S00 | S01 | S02 |
|---|---|---|---|
| Tempo corrido | 12 h 53 min | 45 min | 30 min |
| Tempo previsto (relógio) | sem dado | sem dado | 55 min |
| Soma das tarefas (planejada · real) | sem dado | 4 h · 1 h 58 min | 2 h 20 min · 1 h 14 min |
| Custo (estimado) | sem dado | US$ 16.32 | US$ 11.55 |
| Retrabalho (ajustes de Daniel) | 4 | 1 | 1 |
| Reprovações do Reviewer | 3 | 3 | 1 |

**O que funcionou**
- Paralelismo de novo: 5 tarefas na onda 1, prontas em cerca de 9 min. O corrido (30 min) ficou bem abaixo do previsto (55 min).
- O Reviewer com Opus na tarefa de segurança pegou um problema real: o hook que bloqueia comandos perigosos liberava o comando quando dava erro.
- A regra nova dos casos de eval funcionou: nenhuma reprovação por caso ambíguo (S01: 2).
- O custo caiu 29% em relação à S01 (US$ 16.32 → US$ 11.55).

**O que não funcionou**
- As estimativas ainda estão altas: 9 de 9 tarefas abaixo do planejado, e a soma real foi 53% da planejada. A estimativa pelo histórico (T06) só vale a partir da S03.
- O `sprint close` diz "3 h 39 min", mas o tempo corrido foi de 30 min. A espera pelo teste de Daniel entra na conta.
- A lista nativa de tarefas não existe na extensão do VS Code, então a instrução do `sprint-run` ficou sem cumprir.
- Pelo Bash, nesta pasta com espaço, os testes falharam 2 vezes, até trocar para o PowerShell.

## Melhorias do harness (pedidos)

- Média: [sprint close mostra tempo corrido, não tempo desde o open](../../inbox/2026-10-16-main-harness-sprint-close-mostra-tempo-corrido-nao-tempo-desde-o-open.md)
- Média: [painel do ponytail desligado por padrão](../../inbox/2026-10-16-main-harness-painel-do-ponytail-desligado-por-padrao-nas-maquinas-do-harn.md)
- Baixa: [sprint-run sem lista nativa no VS Code](../../inbox/2026-10-16-main-harness-sprint-run-sem-lista-nativa-no-vs-code.md)
- Baixa: [hx run com vitest pelo Bash em pasta com espaço](../../inbox/2026-10-16-main-harness-hx-run-com-vitest-pelo-bash-em-pasta-com-espaco.md)

## CHANGELOG

A v0.3.0 foi publicada na T09 (`hx release minor`). O `CHANGELOG.md` traz as novidades (fase da tarefa, tempo previsto e corrido, estimativa pelo histórico, aviso do doctor) e as correções (`HARNESS_HOME`, hash da aprovação).
