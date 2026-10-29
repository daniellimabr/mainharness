# S13 — Harness mais limpo e eventos para o Dashboard

- **Projeto:** main-harness
- **Versão do harness:** 0.10.2
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe um harness sem o trabalhador Gemini, com o `hx` menos ruidoso (tirar/adiar tarefa, `done` em tarefa já feita, `index.md` sem linhas velhas), consumo e custo por tarefa confiáveis, e os eventos que o Dashboard pediu (tarefa do clone, contexto atualizado, "agente parado ou com erro"). As ideias da conversa da S12 (regra de ouro, perfil de decisão, handoff melhor) entram no processo.

## Escopo

1. **Remover o trabalhador Gemini (B115, resolve B125).** Saem `hx worker`, a skill `worker`, a config `worker`, os testes do trabalhador e o guia `docs/omniroute.md` (ADR 0012 ganha nota "substituído pelo ADR 0014"). Eventos antigos do trabalhador continuam legíveis no `hx usage`/`hx metrics`. Recomendação: remover em vez de deixar genérico (ninguém usa; Haiku em clone cobre o texto simples).
2. **`usage` sem duplicata na gravação (B124).** `transcript.ts` não grava de novo a resposta com o mesmo `message_id`; o `roundStats` do `sprint/index.ts` soma cada resposta uma vez.
3. **`hx task done/phase` em tarefa já feita (B118).** Depois do `hx review pass` ou num ajuste do feedback: registra a fase (fila/revisão) ou avisa "já está feita", sem erro.
4. **`hx task drop|defer TNN` (B117).** Tira a tarefa da sprint ou a adia para a próxima: ajusta o plano e as dependências, registra o motivo e marca o plano como "precisa de nova aprovação" (Daniel aprova no chat; nada de `approve --force` escondido).
5. **`index.md` sem linhas obsoletas (B119).** Ao atualizar o `index.md`, o `post-edit` tira as linhas de arquivos que não existem mais (apagados, movidos ou renomeados).
6. **Eventos para o Dashboard (B120, B121, B108).** `agent.start` do clone traz o `TNN` (lido da descrição do Agent ou da tarefa em andamento); `alert.context` traz `agent_id` e a tarefa; evento `context` a cada `Stop` (tokens, limite, marca de compactação). Contrato em `docs/contracts/events.md`.
7. **Eventos `attention` e `error` (B107).** Hooks `async` em `Notification`, `StopFailure`, `PostToolUseFailure` e `PermissionRequest`, só metadados (nunca conteúdo). Base para o aviso no Windows (B109, próxima sprint).
8. **Custo por tarefa (B116).** O `sprint.metrics` e o `hx metrics` mostram, por tarefa, US$ e chamadas, e o custo por executor (Haiku, Sonnet, Opus) para medir o Haiku.
9. **Regra de ouro, perfil de decisão e handoff melhor (B113, B112, B114 texto, B122).**
   - Regra de ouro no `CLAUDE.md` e no `agents/tech-lead.md`: tudo que importa vai para arquivo; o chat é descartável.
   - `docs/decisoes-daniel.md`: cada decisão com o porquê, a alternativa descartada e o contraponto; o Tech Lead consulta antes de recomendar e, quando fizer sentido, oferece outra ótica.
   - Skill `handoff`: seções fixas "decisões e porquês" e "pedidos de Daniel ainda não registrados" (com evals).
   - Template do sprint plan com formato único de ondas: `**Ondas:** onda 1 = T01, T02; onda 2 = T03`.
10. **Volta da compactação mais completa (B114 código).** `session-start` com `source=compact` devolve, além do handoff, a tarefa em andamento e o estado do `hx` (sprint, tarefas feitas e pendentes).
11. **Release v0.11.0** (minor: sai um comando). Backlog, CHANGELOG, roadmap. O Release Report traz a medida prometida: efeito da compactação aos 140 mil contra a linha de base da S12.

## Fora de escopo

- Aviso no Windows (toast) quando um agente pede permissão ou para (B109): depende da T07; próxima sprint.
- `hx shot` para o Reviewer ver o app (B123), regra para o `hx release` no modo automático (B104), worktrees (B003).

## Critérios de aceite

1. `hx worker` não existe mais; skill `worker` e config `worker` sumiram; `hx usage` e `hx metrics` de sprints antigas continuam funcionando com eventos do trabalhador.
2. Ingerir o mesmo transcript duas vezes (ou com o cache apagado) não grava `usage` duplicado; `roundStats` bate com a soma única.
3. `hx task done` e `hx task phase` em tarefa já feita não imprimem erro; a fase é registrada ou vem o aviso "já está feita".
4. `hx task drop T05` e `hx task defer T05` mudam o plano, registram evento com o motivo e deixam a sprint pedindo nova aprovação; dependências que apontavam para a tarefa são ajustadas.
5. Editar um arquivo depois de apagar outro tira do `index.md` a linha do apagado.
6. `agent.start` de um clone traz o `TNN`; `alert.context` traz `agent_id`; cada `Stop` grava um `context`. Contrato documentado.
7. Os quatro hooks novos gravam `attention`/`error` só com metadados, são `async` e não travam a sessão em erro.
8. `hx metrics S13` mostra US$ e chamadas por tarefa e o custo por executor.
9. Regra de ouro no `CLAUDE.md` e no `tech-lead.md`; `docs/decisoes-daniel.md` criado com as decisões já tomadas (S11–S12); skill `handoff` com as duas seções novas e evals passando; template com o formato único de ondas.
10. Depois de uma compactação, o contexto injetado traz a tarefa em andamento e o estado da sprint.
11. Release v0.11.0 publicada; B107, B108, B112–B122, B124 e B125 como `feito (S13)` no backlog.
12. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01: teste de que `hx worker` responde "comando desconhecido" e de que `hx usage` lê um log com eventos antigos do trabalhador.
  - T02: transcript com resposta repetida e reingestão sem cache → um `usage` por `message_id`.
  - T03: `done`/`phase` depois de `review pass` → código 0, sem "não está em andamento".
  - T04: plano de exemplo em pasta temporária; `drop` e `defer` → plano editado, dependências ajustadas, evento gravado, aprovação marcada como vencida.
  - T05: `index.md` com linha de arquivo inexistente → some ao editar outro arquivo; linhas válidas intactas.
  - T06: hooks com entrada JSON de exemplo → campos novos nos eventos, validados pelo `schema.ts`.
  - T07: cada hook novo com entrada de exemplo → evento com metadados só; entrada inválida → sai 0 e grava no log de erro.
  - T08: eventos de duas tarefas e dois modelos → US$ e chamadas certos por tarefa e por executor.
  - T10: `session-start` com `source=compact` e estado com tarefa em andamento → texto injetado traz a tarefa e a sprint.
- **Skill:** T09 roda `hx eval handoff` (corpo mudou → `evals.json`).
- **Dados de teste:** `HARNESS_HOME` e projeto em pasta temporária (helpers existentes); limpeza no `afterEach` com `rm` e `maxRetries`.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Remover o trabalhador Gemini (B115, B125) | clone (opus) | `cli/src/commands/worker.ts`, `cli/src/eval/run.ts`, `cli/src/core/config.ts`, `cli/src/events/schema.ts`, `cli/src/commands/usage.ts`, `cli/test/worker*.test.ts`, `cli/test/zz-worker-ref.ts`, `skills/worker/`, `docs/omniroute.md`, `docs/adr/0012-*.md` | — | 30 min | 24 min |
| T02 | `usage` sem duplicata na gravação (B124) | clone (sonnet) | `cli/src/usage/transcript.ts`, `cli/test/transcript.test.ts` | — | 20 min | 16 min |
| T03 | `task done/phase` em tarefa já feita (B118) | clone (sonnet) | `cli/src/commands/task.ts`, `cli/test/task.test.ts` | — | 15 min | 12 min |
| T04 | `hx task drop\|defer` (B117) | clone (opus) | `cli/src/commands/task.ts`, `cli/src/sprint/index.ts`, `cli/test/task-drop.test.ts`, `skills/sprint-run/SKILL.md` | T03, T08 | 40 min | 32 min |
| T05 | `index.md` sem linhas obsoletas (B119) | clone (opus) | `cli/src/hooks/post-edit.ts`, `cli/test/post-edit.test.ts` | — | 20 min | 16 min |
| T06 | Eventos: TNN no `agent.start`, `agent_id` no `alert.context`, `context` a cada `Stop` (B120, B121, B108) | clone (opus) | `cli/src/hooks/lifecycle.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md`, `cli/test/lifecycle.test.ts` | T01 | 35 min | 28 min |
| T07 | Eventos `attention` e `error` (B107) | clone (opus) | `cli/src/hooks/attention.ts`, `cli/src/hooks/index.ts`, `hooks/hooks.json`, `cli/src/events/schema.ts`, `docs/contracts/events.md`, `cli/test/attention.test.ts` | T06 | 40 min | 32 min |
| T08 | Custo por tarefa e por executor; `roundStats` sem duplicata (B116, B124) | clone (sonnet) | `cli/src/sprint/index.ts`, `cli/test/metrics.test.ts` | — | 25 min | 20 min |
| T09 | Regra de ouro, perfil de decisão, handoff melhor, ondas no template (B113, B112, B114, B122) | clone (sonnet) | `CLAUDE.md`, `agents/tech-lead.md`, `docs/decisoes-daniel.md`, `skills/handoff/SKILL.md`, `skills/handoff/evals/`, `templates/sprint-plan.md` | — | 30 min | 24 min |
| T10 | `session-start` após compactar traz tarefa e estado (B114) | clone (opus) | `cli/src/hooks/session-start.ts`, `cli/test/session-start.test.ts` | — | 25 min | 20 min |
| T11 | Revisão final, backlog, CHANGELOG, roadmap e release v0.11.0 | tech-lead (sonnet) + reviewer (opus) | `docs/backlog.md`, `CHANGELOG.md`, `docs/roadmap.md` | T01–T10 | 20 min | 16 min |

**Por que esses agentes:** T01 é Opus porque remove um comando do `hx` e mexe no contrato de eventos e na config. T04 é Opus porque edita o plano e mexe na aprovação (caminho de erro, dado lido de arquivo). T05, T07 e T10 são Opus porque é lógica nova em hooks. T06 é Opus porque muda o contrato de eventos usado pelo Dashboard. T02, T03 e T08 são Sonnet: regra simples com teste claro. T09 é Sonnet (não Haiku): o formato do perfil de decisão ainda não está fechado e mexe em skill com evals.

**Ondas:** onda 1 = T01, T02, T03, T05, T08, T09, T10; onda 2 = T04, T06; onda 3 = T07; onda 4 = T11.

**Revisão:** uma por onda, Reviewer em **Opus** (todas as ondas têm hooks ou contrato do `hx`), `hx review pass|fail` por tarefa.

**Paralelismo:**

- Onda 1 sem arquivo em comum: T01 (worker, config, schema, usage), T02 (transcript), T03 (`task.ts`), T05 (`post-edit.ts`), T08 (`sprint/index.ts`), T09 (docs, agents, skill handoff, template), T10 (`session-start.ts`).
- T04 espera T03 (`task.ts`) e T08 (`sprint/index.ts`). T06 espera T01 (`schema.ts`). T07 espera T06 (`schema.ts`, `events.md`).
- `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.

**Git:** um commit por tarefa na `main`, `<tipo>(S13/TNN): <resumo>`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S11 | 1 h 12 min | 1 h 34 min | 2 h 45 min | 2 h 12 min |
| S12 | 2 h 48 min | 2 h 41 min | 4 h 12 min | 3 h 24 min |

Fator, só das sprints com fase `revisão`: relógio S11 1,31 e S12 0,96 → **1,13**; soma S11 0,80 e S12 0,81 → **0,80**. Referências: T01 como S12/T09; T02 e T08 como S12/T08; T03 como S12/T01.

**Total estimado:** soma 5 h brutas → **4 h** calibrada (× 0,80). Relógio de agente: caminho T01 → T06 → T07 → T11 (125 min brutos) × 1,13 ≈ **2 h 21 min**. Espera por Daniel: só o teste final.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-28 23:22:25 (horário de Brasília) — UTC 2026-10-29T02:22:25Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `51c13197fe142b1a6b657bab71a1f25d52e863478791f2bd6ce13d28a3b2b448`
- **Versão do harness:** 0.10.2
