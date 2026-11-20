# S18 — Release Report

> Sprint em andamento. A tabela de execução abaixo é atualizada pelo `hx` a cada tarefa; o Tech Lead completa o restante no fechamento (skill release-report), mantendo esta tabela.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Contrato `state.md` e `buildState` puro (projeto, sprint ativa, tarefas, agentes ativos, custo por tarefa/dia/sprint) | clone (sonnet) | 30 min | 16:40 | 16:55 | 8 min (fila: 5 min, revisão: 2 min) |
| ✅ | T02 | Gravação atômica do estado: gancho em `emit()` para eventos de ciclo, lote após `usage`, `HARNESS_DASHBOARD=off` | clone (sonnet) | 22 min | 16:55 | 17:16 | 10 min (fila: 9 min, revisão: 3 min) |
| ✅ | T03 | `hx state rebuild [--all]` e rebuild do `cli/dist/hx.js` | clone (sonnet) | 15 min | 17:17 | 17:28 | 8 min (fila: 0 min, revisão: 2 min) |
| ✅ | T04 | Esqueleto da extensão: pacote, esbuild, tsconfig, tipos do estado, comando "Abrir Harness Dash", integração com `npm run check` | clone (sonnet) | 10 min | 16:55 | 17:16 | 15 min (fila: 3 min, revisão: 3 min) |
| ✅ | T05 | Leitor de estado e observador da pasta (registro + `state/*.json`, debounce) | clone (sonnet) | 15 min | 17:17 | 17:28 | 4 min (fila: 4 min, revisão: 2 min) |
| ✅ | T06 | Painel (webview) conforme a maquete | clone (sonnet) | 38 min | 17:28 | 17:48 | 10 min (fila: 1 min, revisão: 9 min) |
| ✅ | T07 | Barra de status | clone (sonnet) | 10 min | 17:28 | 17:48 | 6 min (fila: 5 min, revisão: 9 min) |
| ✅ | T08 | Empacotar `.vsix`, README de instalação, `index.md` | clone (haiku) | 15 min | 17:48 | 18:07 | 9 min (fila: 0 min, revisão: 9 min) |
| ✅ | T09 | Revisão final, evals (`hx eval --changed`), CHANGELOG, roadmap, backlog e release v0.17.0 (Daniel roda o `hx release`) | tech-lead + reviewer | 15 min | 18:07 | 18:10 | 2 min |
| ✅ | T10 | Conferência: `hx state rebuild --all`, total do painel contra o dashboard atual (até 1%); diferença maior volta a Daniel | tech-lead | 8 min | 18:10 | 18:15 | 5 min |
| ✅ | **Total** | 10 tarefas |  | 2 h 11 min | 2026-11-20 16:40 | 2026-11-20 18:15 | 1 h 35 min |

## Resumo da entrega

O `hx` agora grava o estado de cada projeto (sprint, tarefas, agentes ativos, custo) em `~/.harness/dashboard/<id>.json`, e `hx state rebuild --all` refaz tudo a partir dos eventos. A extensão **Harness Dash** do VS Code lê esses arquivos e mostra o painel (gasto, projetos, sprints, tarefas, agentes, gasto por dia) e um item na barra de status. O pacote está em `extension/harness-dash-0.1.0.vsix`. Daniel ainda vai usar por alguns dias; os ajustes ficam para a próxima sprint.

## Observações por tarefa

- T07: reprovada uma vez (formatação do `extension/package.json` no `format:check`).
- T08: reprovada uma vez (README citava um item da barra de status com texto que não existe; `index.md` com 4 descrições vazias).
- T10: a conferência de custo contra o Dashboard IA deu de +3,9% a −58,2% (ver `docs/sprints/S18-conferencia.md`). Daniel dispensou o critério de 1% (ver `docs/decisoes-daniel.md`); o custo vale daqui em diante.
- T11: adiada (arquivar o Dashboard IA só depois de dias de uso da extensão).
- Plano: o caminho `state/` virou `dashboard/` na implementação; ADR 0019, PRD 0001 e `docs/contracts/state.md` foram atualizados. A linha 13 do plano aprovado não foi alterada.

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 2 h 11 min · 1 h 35 min |
| Espera por Daniel · trabalho | 1 h 2 min · 45 min |
| Soma das tarefas (planejada · real) | 2 h 58 min · 1 h 17 min |
| Tarefas feitas | 10/10 (T11 adiada) |
| Custo total | US$ 8,10 (tech-lead 3,08 · clones 3,72 · reviewer 1,30) |
| Custo por executor | Sonnet US$ 8,10 · Haiku US$ 0,00 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Reprovações do Reviewer | 2 |
| Alertas de contexto · handoffs | 3 · 3 |
| Real/planejado por agente | tech-lead 0,8x |

## Revisão

Reviewer (Sonnet) revisou por onda e na revisão final: aprovada. Segurança da webview sem achados (CSP com nonce, `textContent`, `localResourceRoots` só em `media/`); gravação do estado não quebra o `emit` e respeita `HARNESS_DASHBOARD=off`; `.vsix` só com `dist/extension.js`, `media/`, `package.json` e README. Achados BAIXA sem bloqueio: `statusModel.ts` sem `?? []` em `agents`/`tasks`/`usd_by_day`; "parado" só reavalia quando o arquivo de estado muda; a barra só observa `dashboard/`.

Lint e tipos: zero erros e zero avisos (`npm run check`: 638 testes passando). A webview e a barra de status não foram abertas dentro do VS Code por mim; a conferência visual é de Daniel.

## Retorno de Daniel

"Tem muita coisa pra ajustar, mas ficam pra uma próxima sprint após o uso." Nenhum ajuste nesta sprint (0 rodadas). Dispensou a conferência de 1% do custo.

## Retrospectiva

**Comparação com a S17:** tempo corrido 1 h 35 min contra 1 h 15 min (previsto 2 h 11 min contra 1 h 8 min); custo US$ 8,10 contra US$ 27,72; reprovações 2 contra 0; retrabalho 0 nas duas.

**Funcionou:** tarefas em dupla de clones (T01/T04, T05/T03, T06/T07) fecharam abaixo do planejado (1 h 17 min reais contra 2 h 58 min); o estado como função pura (`buildState`) deu testes simples; custo bem menor que na S17.

**Não funcionou:** o check completo leva ~6 min (354 s) e roda a cada onda; as duas reprovações foram falhas pequenas (formatação e texto de README) que o check ou uma conferência do texto teria pegado antes; o plano trazia um caminho (`state/`) que a implementação trocou, o que gerou atualização de 3 documentos depois; a conferência de custo foi planejada contra uma fonte (transcrições) que os eventos não replicam.

### Melhorias do harness

- `inbox/2026-11-20-main-harness-npm-run-check-mais-rapido-por-tarefa-so-o-que-mudou.md`: check incremental por tarefa (354 s por rodada completa nesta sprint).
