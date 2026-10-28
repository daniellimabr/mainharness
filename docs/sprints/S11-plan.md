# S11 — Parar de queimar token: um modelo fixo por papel

- **Projeto:** main-harness
- **Versão do harness:** 0.9.0
- **Status:** aguardando aprovação

## Objetivo

Gastar menos franquia do Claude sem perder qualidade. Cada papel passa a ter **um modelo fixo**: Opus planeja, Sonnet orquestra a execução, e quem executa é escolhido no plano por uma regra escrita (Gemini, Sonnet ou Opus). A troca automática de modelo pelo % de uso sai. O harness grava o modelo e os tokens por modelo para o Dashboard. Fecha com a release v0.10.0.

**Por quê (S10):** o chat principal em Opus custou US$ 11,27 de US$ 26,99 e leu 44 milhões de tokens de cache (contexto grande relido a cada vez). Os evals foram 34% do custo, quase tudo em rodadas repetidas. Mandar a execução a um modelo barato economiza pouco se o orquestrador seguir em Opus com contexto enorme.

## Escopo

1. **ADR 0013 e regra no `agents/tech-lead.md`.**
   - Modelo por papel: planejar (sprint plan, ADR, PRD) em **Opus**; orquestrar o `sprint-run` em **Sonnet**; executar pela regra abaixo; revisar com o Reviewer em **Opus**.
   - Regra de quem executa, decidida pelo Tech Lead no plano (coluna Agente) e aprovada por Daniel:
     - **Opus:** basta uma — decisão de desenho que o plano não fechou; muda contrato usado por outros projetos (eventos, config, comandos do `hx`); lógica nova em área sensível (hooks, `pre-bash`, release, processo com senha); o Sonnet já falhou 2 vezes.
     - **Gemini:** escopo fechado, até 3 arquivos, nada sensível, handoff com o teste de aceite.
     - **Sonnet:** todo o resto.
   - **Sem troca por limiar:** o modelo de cada papel não muda com o % de uso. Perto do limite, o Tech Lead grava o handoff e para, como antes da S10.
2. **Chat de execução em Sonnet.** O modelo padrão do Tech Lead passa a ser Sonnet; Opus é escolhido por Daniel no seletor ao abrir um chat de planejamento. O `sprint-run` confere o modelo da sessão no início e, se for Opus, avisa em uma linha para trocar (sem trocar sozinho, que relê o contexto sem cache). A tarefa começa com um teste curto do mecanismo no VS Code: frontmatter do agente × seletor de modelo × `model:` do comando (que só vale no turno).
3. **Persona de executor enxuta.** Novo `agents/executor.md` (Sonnet): só o que quem executa precisa (handoff, arquivos permitidos, TDD, lint e tipos, não commitar, relatório). Inclui marcar as fases `testes`, `código`, `lint` e `fila` (B094). Clones e o trabalhador Gemini usam essa persona (`hx worker run` passa `--agent main-harness:executor`). A seção "Se você é um clone" sai do `tech-lead.md`, e a skill `handoff` aponta para o executor.
4. **Tirar o gatilho de 90%.** Saem o aviso do `Stop` e do `hx task`, o `workerNudge`, a chave `worker.threshold` e a seção "Perto do limite" da skill `worker`. B097 e B098 viram `descartado`.
5. **Modelo e tokens por modelo nos eventos.** O `sprint.metrics` ganha `usd_by_model`, `tokens_by_model` e `models_by_task`, tirados dos eventos `usage` (que já trazem modelo, sprint e tarefa). O `hx metrics` mostra uma linha "Custo por modelo". Contrato em `docs/contracts/events.md`. As telas são do Dashboard (pedidos já no backlog dele).
6. **Compactar mais cedo.** O alerta de contexto passa de 250 mil para 120 mil tokens (configurável), e o texto do `tech-lead.md` acompanha.
7. **Handoff atualizado sozinho (B101).** `hx task done` e `hx task phase` reescrevem uma seção automática do handoff da sessão (estado das tarefas e arquivos não commitados). O texto escrito pelo agente fica intacto.
8. **Evals com o `hx` do repo (B102).** A sandbox do `hx eval` usa o `cli/dist/hx.js` do repo, não o estável.
9. **Pedido do harness para um projeto: `hx request --to <projeto>`.** Grava o pedido no `inbox/` do projeto registrado em `~/.harness/projects.json`, e o `session-start` desse projeto avisa quantos pedidos há. Só caminhos do registro (nada vindo do texto do pedido).
10. **Backlog, CHANGELOG, roadmap e release v0.10.0.** B086 e B087 viram `feito (S10)`.

## Fora de escopo

- Outros itens do backlog (B029, B077–B085, B088–B096, B099, B100): vão para a S12, já no modelo novo.
- Trocar o OmniRoute pelo claude-code-router: seguimos no OmniRoute.
- Trocar de IDE: seguimos no VS Code.
- Telas do Dashboard: são do projeto Dashboard IA (pedidos no backlog dele, 27/10).

## Critérios de aceite

1. ADR 0013 escrito, e `agents/tech-lead.md` com a tabela de modelo por papel e a regra de quem executa.
2. Um chat novo roda em Sonnet sem Daniel mexer no seletor, e com Opus escolhido no seletor roda em Opus (conferido no `/status` ou no evento `session.start`); o `sprint-run` num chat em Opus avisa para trocar.
3. `agents/executor.md` existe; `hx worker run` passa `--agent main-harness:executor` (teste com `claude` falso); a skill `handoff` passa nos evals.
4. Com o uso em 91%, nem o `Stop` nem o `hx task` mostram aviso; `worker.threshold` não existe mais; a skill `worker` passa nos evals.
5. `hx metrics` de uma sprint com eventos de dois modelos mostra o custo e os tokens de cada um, e `sprint.metrics` traz os 3 campos novos (validados pelo schema).
6. O alerta de contexto dispara em 120 mil por padrão e respeita o valor da config.
7. Após `hx task done`, o handoff traz o estado das tarefas e os arquivos não commitados, e o texto do agente fica igual.
8. Na sandbox do `hx eval`, `hx` aponta para o `cli/dist/hx.js` do repo.
9. `hx request --to dashboard-ia` grava em `C:\Dashboard IA\inbox\`; projeto fora do registro é recusado; o `session-start` do projeto cita o pedido.
10. Release Report da S11 com custo por modelo e, por tarefa, se a entrega passou de primeira.
11. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código), em pastas temporárias (`HARNESS_HOME`, `HOME`):**
  - T03 `cli/test/worker-run.test.ts` (`--agent` no spawn, `claude` falso).
  - T04 `cli/test/worker-trigger.test.ts` (vira: 91% sem aviso; ou o arquivo sai junto com o gatilho).
  - T05 `cli/test/metrics.test.ts` (eventos de dois modelos → campos e linha nova).
  - T06 teste do alerta de contexto (padrão 120 mil e valor da config).
  - T07 `cli/test/task.test.ts` (seção automática do handoff).
  - T08 `cli/test/eval.test.ts` (PATH da sandbox).
  - T09 `cli/test/request.test.ts` (destino do registro, recusa fora dele, aviso no `session-start`).
- **Evals:** T03 roda `hx eval handoff`; T04 roda `hx eval worker`. Os dois depois da T08 (já com o `hx` do repo).
- **Manual (T02):** abrir um chat de `sprint-run` e um de planejamento e conferir o modelo.
- Nenhum teste chama o `claude`, o Gemini ou o OmniRoute de verdade.

## Tarefas

Fator, só das sprints com fase `revisão`: S10 soma 0,84 e relógio 1,56. **S09 fica fora:** a T03 levou 8 rodadas de eval (soma 3,25, relógio 4,2).

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | ADR 0013 e regra de modelo por papel no `tech-lead.md` | tech-lead (opus) | `docs/adr/0013-*.md`, `agents/tech-lead.md` | — | 20 min | 17 min |
| T02 | Chat de execução em Sonnet (teste do mecanismo e aplicação) | tech-lead (opus) + Daniel | `agents/tech-lead.md` (frontmatter), `commands/sprint-run.md`, `commands/sprint-plan.md` | T01 | 20 min | 17 min |
| T03 | Persona `executor` + fases (B094) + `hx worker run --agent` | clone (sonnet) | `agents/executor.md`, `cli/src/commands/worker.ts`, `cli/test/worker-run.test.ts`, `skills/handoff/*` | T02, T08 | 25 min | 21 min |
| T04 | Tirar o gatilho de 90% | clone (sonnet) | `cli/src/usage/limits.ts`, `cli/src/hooks/lifecycle.ts`, `cli/src/commands/task.ts`, `cli/src/core/config.ts`, `cli/test/worker-trigger.test.ts`, `skills/worker/*`, `docs/omniroute.md` | T06, T08 | 20 min | 17 min |
| T05 | Custo e tokens por modelo em `sprint.metrics` e `hx metrics` | clone (sonnet) | `cli/src/commands/metrics.ts`, `cli/src/sprint/index.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md`, `cli/test/metrics.test.ts` | — | 20 min | 17 min |
| T06 | Alerta de contexto em 120 mil | gemini | `cli/src/core/config.ts`, `cli/test/config.test.ts` | — | 10 min | 8 min |
| T07 | Handoff atualizado em `task done/phase` (B101) | gemini | `cli/src/commands/task.ts`, `cli/src/commands/handoff.ts`, `cli/test/task.test.ts` | T04 | 20 min | 17 min |
| T08 | `hx eval` com o `hx` do repo (B102) | gemini | `cli/src/eval/run.ts`, `cli/test/eval.test.ts` | T06 | 20 min | 17 min |
| T09 | `hx request --to <projeto>` + aviso no `session-start` | clone (sonnet) | `cli/src/commands/request.ts`, `cli/src/hooks/session-start.ts`, `cli/test/request.test.ts` | — | 25 min | 21 min |
| T10 | Backlog, CHANGELOG, roadmap e release v0.10.0 | gemini (docs) + tech-lead (`hx release minor`) | `docs/backlog.md`, `CHANGELOG.md`, `docs/roadmap.md` | T01–T09 | 15 min | 13 min |

**Ondas e revisão** (o Reviewer revisa cada onda em **Opus 5.5**, e cada tarefa leva `hx review pass|fail`):

1. **Onda 1:** T01 (Tech Lead), T05 e T09 (clones Sonnet), T06 (Gemini). → **Revisão 1:** T05, T06, T09.
2. **Onda 2:** T02 (Tech Lead + Daniel), T08 (Gemini, depois do commit da T06). → **Revisão 2:** T08.
3. **Onda 3:** T03 e T04 (clones Sonnet, com evals), depois T07 (Gemini, depois do commit da T04, que também mexe em `task.ts`). → **Revisão 3:** T03, T04, T07.
4. **Onda 4:** T10. → **Revisão final** junto com a release.

Revisão não vira linha da tabela (o tempo dela entra nas tarefas e nos `hx review`, B050).

**Paralelismo:**

- Na mesma onda, nenhum arquivo aparece em duas tarefas.
- `config.ts` é da T06 (onda 1) e depois da T04 (onda 3). `task.ts` é da T04 e depois da T07, que só sai depois do commit da T04.
- Um trabalhador Gemini por vez: T06 → T08 → T07 → T10.
- `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.

**Quem orquestra a S11:** ainda o Tech Lead em Opus, porque o chat em Sonnet só existe depois da T02. A S12 é a primeira medida no modelo novo e compara o custo com a S10 e a S11.

**Git:** um commit por tarefa na `main`, `<tipo>(S11/TNN): <resumo>`.

**Total estimado:** soma 3 h 15 min brutos → **2 h 44 min** calibrada (× 0,84). Relógio de agente: caminho mais longo T06 → T08 → T03 → T10 e T01 → T02 → T03 → T10 (80 min brutos) × 1,56 ≈ **2 h 5 min**. Espera por Daniel: o teste do modelo do chat (T02) e o teste final.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-27 23:07:53 (horário de Brasília) — UTC 2026-10-28T02:07:53Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `722c66bfe8593b8770584afeaa380e8fbc3d64f617c67bed7c667bdb3774e3c4`
- **Versão do harness:** 0.9.0
