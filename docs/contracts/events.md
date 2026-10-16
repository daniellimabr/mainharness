# Contrato de eventos: Main Harness e Dashboard IA

Versão do contrato: **v1** (`EVENT_VERSION = 1`). A fonte da verdade é `cli/src/events/schema.ts`; este documento descreve o mesmo esquema.

## Onde ficam

`%USERPROFILE%\.harness\events\YYYY-MM-DD.jsonl`

- Um arquivo por dia, pela data em **UTC**.
- **Somente acréscimo** (append-only). Ninguém reescreve nem apaga linhas.
- **Uma linha = um evento completo** em JSON. O Dashboard lê linha a linha e ignora linha incompleta no fim do arquivo.
- Nos testes, `HARNESS_HOME` redireciona `%USERPROFILE%\.harness`.

## Envelope

Todo evento tem estes campos, sempre presentes (use `null` quando não se aplica):

| Campo | Tipo | Descrição |
|---|---|---|
| `v` | número | Versão do contrato (hoje `1`) |
| `id` | texto | ULID do evento (ordenável no tempo, único) |
| `ts` | texto | Instante em UTC, ISO 8601: `2026-10-15T14:03:22.123Z` |
| `harness` | texto | Versão do harness (`0.1.0`) |
| `project` | texto | Slug do projeto (`[a-z0-9-]+`) |
| `session` | texto ou null | Id da sessão do Claude Code |
| `sprint` | texto ou null | Ex.: `S01` |
| `task` | texto ou null | Ex.: `T04` |
| `agent` | texto ou null | Ex.: `tech-lead`, `reviewer`, `eval` |
| `type` | texto | Um dos tipos da tabela abaixo |
| `data` | objeto | Campos do tipo (tabela abaixo) |

Exemplo (uma linha no arquivo; quebrada aqui só para leitura):

```json
{"v":1,"id":"01K7ZQ3M9X4T8R2B6V5N1C0DEF","ts":"2026-10-15T14:03:22.123Z","harness":"0.1.0",
 "project":"main-harness","session":"6f1c2a9e-0b7d-4d1e-9a55-3c2b8e7d1a40","sprint":"S00",
 "task":"T04","agent":"clone-b","type":"task.done","data":{"duration_s":2710,"planned_min":45}}
```

## Tipos de evento e campos de `data`

Notação: `?` = campo opcional (pode faltar); `| null` = pode ser `null`. Números são finitos. Textos aceitam até 200 caracteres, sem quebra de linha.

| Tipo | Campos de `data` | Quando é gravado |
|---|---|---|
| `session.start` | `source` texto; `model?` texto \| null | Início de um chat (`startup`, `resume`, `compact`...) |
| `session.end` | `reason` texto | Fim do chat |
| `sprint.approved` | `plan` texto; `sha256` texto; `approved_at` texto; `approver` texto | `hx sprint approve` |
| `sprint.open` | `tasks` número | `hx sprint open` |
| `sprint.close` | `tasks_done` número; `tasks_total` número; `duration_s` número | `hx sprint close` |
| `sprint.feedback` | `adjustments` número | `hx sprint feedback <n>` (ajustes pedidos por Daniel) |
| `sprint.metrics` | `tasks_total`, `tasks_done`, `planned_min`, `actual_min`, `tokens_input`, `tokens_output`, `tokens_cache_write`, `tokens_cache_read`, `usd`, `rework`, `review_rejections`, `context_alerts`, `handoffs` (todos número); `wall_min?` número (tempo corrido: 1º `task.start` ao último `task.done`; desde a v0.3.0); `usd_by_agent`, `usd_by_task`, `actual_min_by_task` (objeto chave → número) | Fechamento da sprint |
| `task.start` | `planned_min?` número | `hx task start` |
| `task.done` | `duration_s` número; `planned_min?` número | `hx task done` |
| `review.result` | `result`: `pass` ou `fail` | `hx review pass\|fail` |
| `usage` | `model` texto; `input`, `output`, `cache_write`, `cache_read` número; `usd` número \| null; `message_id` texto; `transcript`: `main` ou `subagent` | Uma resposta nova do modelo (ADR 0007) |
| `alert.context` | `tokens` número; `limit` número; `handoff` booleano | Contexto passou de `handoffAt` (ADR 0006) |
| `handoff` | `mode`: `compact`, `manual` ou `new-chat`; `file` texto \| null | Handoff gravado ou compactação |
| `harness.request` | `file` texto; `priority`: `alta`, `media` ou `baixa` | `hx request` |
| `harness.release` | `version` texto; `tag` texto; `previous` texto \| null | `hx release` |
| `harness.rollback` | `from` texto; `to` texto | `hx rollback` |
| `harness.migrate` | `from` texto; `to` texto; `kind`: `simple` ou `structural`; `applied` booleano | `hx migrate` |

Notas:

- `usd` em `usage` é **estimado** (preços em `config.json`). `null` = modelo sem preço na tabela.
- `usd_by_agent`, `usd_by_task` e `actual_min_by_task` têm chaves no formato de id (`[A-Za-z0-9._:@-]`, até 128 caracteres).
- `sprint.approved.sha256` é o hash do plano no momento da aprovação. Plano alterado depois exige nova aprovação e novo evento.
- A contagem de compactações é o número de eventos `handoff` com `mode: "compact"`.

## Privacidade

Eventos guardam **só metadados**: ids, horários, nomes de arquivo, contagens, durações, valores.

**Nunca** entram: código, prompts, respostas do modelo, segredos, conteúdo de arquivo.

O teste de esquema (`cli/test/events.test.ts`) garante isso:

- rejeita qualquer campo fora do esquema (no envelope e em `data`);
- rejeita texto com cara de conteúdo: mais de 200 caracteres, quebra de linha ou tabulação, ou os caracteres `{ } ; < > \``.

Quem escreve um evento novo precisa passar nesse teste.

## Versionamento

- O campo `v` diz a versão do contrato.
- O Dashboard aceita a **versão atual e a anterior**. Evento de versão desconhecida é ignorado (e contado).
- Acrescentar tipo ou campo opcional não quebra o contrato. Mudança que **quebra** (remover/renomear campo, mudar tipo ou sentido) só acontece **entre sprints** e **sobe `v`**. O Release Report da sprint avisa.
- Arquivos antigos não são reescritos: eventos antigos mantêm o `v` com que foram gravados.

## Outros arquivos que o Dashboard pode ler

Em `%USERPROFILE%\.harness\`:

| Arquivo | Conteúdo |
|---|---|
| `projects.json` | `{"projects":[{"id","name","path","version","attachedAt"}]}`: projetos conectados com `/attach` |
| `config.json` | Configuração do harness: preços por modelo, `contextLimit`, `handoffAt`, estratégia de contexto |

`handoffs/`, `logs/` e `cache/` são **internos**: formato livre, podem mudar sem aviso. O Dashboard não deve depender deles.

## Como o Dashboard deriva indicadores

| Indicador | Cálculo |
|---|---|
| Duração da tarefa | `task.done.data.duration_s` |
| Tempo planejado × real da tarefa | `task.done.data.planned_min` × `duration_s` / 60 |
| US$ por agente | soma de `usage.data.usd` agrupada por `agent` (ignorar `null`) |
| US$ por tarefa / por sprint | soma de `usage.data.usd` agrupada por `task` / `sprint` |
| Tokens por projeto | soma de `input`, `output`, `cache_write`, `cache_read` de `usage` por `project` |
| Reprovações do Reviewer | contagem de `review.result` com `result: "fail"` |
| Alertas de contexto | contagem de `alert.context` |
| Compactações | contagem de `handoff` com `mode: "compact"` |
| Retrabalho | soma de `sprint.feedback.data.adjustments` |
| Resumo pronto da sprint | último `sprint.metrics` da sprint (já traz os totais e os mapas por agente e por tarefa) |

Regra: se há `sprint.metrics`, ele é a visão oficial do fechamento. Para a sprint em andamento, calcule dos eventos brutos.
