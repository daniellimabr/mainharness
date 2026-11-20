# Contrato do `state.json` (v1)

Arquivo por projeto, gerado por `buildState` (`cli/src/state/build.ts`) a partir dos eventos (`docs/contracts/events.md`). ADR 0019. Quem lê (extensão) ignora campo desconhecido e avisa se `v` for maior que o conhecido.

## Regras

- Custo em US$ vem dos eventos `usage`, sem repetir o mesmo `message_id`. **Custo ausente é `null` ("sem dado"), nunca 0.** `null` só vira número quando há ao menos um `usage` com `usd`.
- Dias (`usd_by_day`) em UTC (`AAAA-MM-DD`); dia sem gasto não aparece.
- Evento desconhecido, linha corrompida ou de outro projeto é ignorado.
- Papel: agente `executor` é `clone`; `main-harness:reviewer` é `reviewer`; o resto (inclusive sem agente) é `tech-lead`.

## Campos

| Campo | Tipo | Significado |
|---|---|---|
| `v` | `1` | versão do formato |
| `updated_at` | string ISO | quando o estado foi calculado |
| `project.id` | string ou `null` | projeto (`null` sem eventos) |
| `project.last_event_at` | string ISO ou `null` | último evento |
| `project.total_usd` | número ou `null` | gasto total |
| `project.parado` | boolean | sem agente ativo e último evento há mais de 30 min |
| `sprint_active` | string ou `null` | última sprint aberta e não fechada |
| `sprints[]` | `{id, status, done, total, usd}` | `status`: `aberta` ou `fechada`; `done`/`total`: tarefas feitas/total; `usd`: número ou `null` |
| `tasks[]` | `{id, title, status, agent, role, usd}` | só da sprint ativa. `status`: `a fazer`, `em andamento`, `em revisão`, `feita`, `reprovada`; `agent`: agente do plano (`title`/`agent` podem ser `null`); `role`: papel do `agent`; `usd`: número ou `null` |
| `agents[]` | `{id, role, task, since}` | agentes ativos: `agent.start` sem `agent.end` e iniciado há no máximo 30 min; `task` pode ser `null` |
| `usd_by_day` | `{ "AAAA-MM-DD": número }` | gasto por dia |

## Status da tarefa

`task.start` e fases `testes`/`código`/`lint` → `em andamento`; fases `fila`/`revisão`/`commit` → `em revisão`; `review.result` fail → `reprovada` (um novo `task.start` reabre); pass ou `task.done` → `feita`. Sem evento → `a fazer`.

## Custo por tarefa

`usage` com `task` próprio, ou, sem ele, a tarefa do `agent.start` do mesmo `agent_id`. Sem nenhum dos dois, entra só no total, no dia e na sprint.
