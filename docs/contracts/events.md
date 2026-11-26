# Contrato de eventos do Main Harness

Versão do contrato: **v1** (`EVENT_VERSION = 1`). A fonte da verdade é `cli/src/events/schema.ts`; este documento descreve o mesmo esquema.

## Onde ficam

`%USERPROFILE%\.harness\events\YYYY-MM-DD.jsonl`

- Um arquivo por dia, pela data em **UTC**.
- **Somente acréscimo** (append-only). Ninguém reescreve nem apaga linhas.
- **Uma linha = um evento completo** em JSON. Quem lê vai linha a linha e ignora linha incompleta no fim do arquivo.
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
| `session.start` | `source` texto; `model?` texto \| null; `title?` texto (desde a v0.6.0) | Início de um chat (`startup`, `resume`, `compact`...). `title` só vem quando o chat tem nome dado por `/rename` ou `--name` (o Claude Code não envia o título automático ao hook); caracteres proibidos viram espaço |
| `session.end` | `reason` texto | Fim do chat |
| ~~`session.resume`~~ | `ok` booleano, da v0.8.0 à v0.8.x | **Saiu na v0.9.0** junto com o `hx resume` (ADR 0011 substituído). Não é mais gravado nem aceito; linhas antigas no log ficam como estão |
| `prompt` | nenhum (`{}`) | Cada comando de Daniel (hook `UserPromptSubmit`). Só horário e sessão: **o texto do prompt nunca é gravado** |
| `turn.end` | nenhum (`{}`) | Fim da vez do agente (hook `Stop`), só quando o Stop deixa parar (não quando bloqueia). Do último `turn.end` até o próximo `prompt` da mesma sessão é espera por Daniel (desde a v0.6.0) |
| `agent.start` | `agent_id` texto; `agent_type?` texto e `model?` texto (desde a v0.12.0; gravados pelo `hx worker run`, com `agent_type: "worker"` e `agent: "worker"` no envelope) | Subagente começou (hook `SubagentStart`). `agent` do envelope = tipo do agente (ex.: `main-harness:reviewer`; `null` se vazio); `task` = o `TNN` da descrição do Agent (ex.: `T06 eventos`, `[T06] ...`, lida do `agent-<id>.meta.json`, desde a v0.11.0); sem `TNN` na descrição, a tarefa em andamento quando há exatamente uma; senão `null` |
| `agent.end` | `agent_id` texto | Subagente terminou (hook `SubagentStop`); mesmo envelope do `agent.start` (`task` = a do `agent.start` do mesmo `agent_id`) |
| `sprint.approved` | `plan` texto; `sha256` texto; `approved_at` texto; `approver` texto | `hx sprint approve` |
| `sprint.open` | `tasks` número; opcionais `task_info` (id → `[título, agente]`) e `task_planned` (id → minutos planejados) | `hx sprint open` |
| `sprint.close` | `tasks_done` número; `tasks_total` número; `duration_s` número | `hx sprint close` |
| `sprint.feedback` | `adjustments` número | `hx sprint feedback <n>` (ajustes pedidos por Daniel) |
| `sprint.metrics` | `tasks_total`, `tasks_done`, `planned_min`, `actual_min`, `tokens_input`, `tokens_output`, `tokens_cache_write`, `tokens_cache_read`, `usd`, `rework`, `review_rejections`, `context_alerts`, `handoffs` (todos número); `wall_min?` número (tempo corrido: 1º `task.start` ao último `task.done`) e `planned_wall_min?` número (relógio previsto: caminho mais longo pela coluna "Depende de"; sem a coluna, a soma), desde a v0.3.0; `usd_by_agent`, `usd_by_task`, `actual_min_by_task` (objeto chave → número; desde a v0.7.0, `actual_min` e `actual_min_by_task` medem até a última fase `revisão` antes do done, quando há); `review_min_by_task?` objeto chave → número (tempo da entrega ao done, somado por passada), desde a v0.7.0; `wait_min?` número (espera por Daniel: soma dos intervalos `turn.end` → `prompt` seguinte da mesma sessão, sobreposições unidas) e `work_min?` número (`wall_min` menos as esperas dentro dele que já não eram pausa), desde a v0.6.0; `usd_by_model?` objeto modelo → número (US$ por modelo, dos eventos `usage`), `tokens_by_model?` objeto modelo → `{input, output, cache_write, cache_read}` (números) e `models_by_task?` objeto tarefa → lista de modelos distintos que gastaram nela, em ordem alfabética, desde a v0.10.0; `calls_by_task?` objeto tarefa → número (chamadas de modelo) e `usd_by_executor?` objeto executor → número (US$ por executor), desde a v0.11.0; `usd_split_by_task?` objeto tarefa → número, `pause_min?` número, `queue_min_by_task?` objeto tarefa → número, `feedback_rounds?`, `feedback_min?` e `feedback_usd?` números (parte do custo dividida entre tarefas simultâneas; minutos de pausa de mais de 30 min; minutos de fila até a revisão; rodadas de ajuste, seus minutos e custo; campos opcionais; consumidores antigos ignoram) | Fechamento da sprint |
| `task.start` | `planned_min?` número | `hx task start` |
| `task.phase` | `phase` texto (`testes`, `código`, `lint`, `fila`, `revisão`, `commit`; `tirada` e `adiada` em `hx task drop\|defer`) | `hx task phase <id> <fase>` (tarefa em andamento) |
| `task.done` | `duration_s` número; `planned_min?` número | `hx task done` |
| ~~`worker.start`~~ | `model` texto (agente `gemini`) | **Legado:** o `hx worker` saiu na v0.11.0; o tipo não é mais gravado nem aceito. Só aparece em logs antigos (até a v0.10) |
| ~~`worker.end`~~ | `model` texto; `exit_code` número; `duration_s` número (agente `gemini`) | **Legado**, como o `worker.start`: só em logs até a v0.10 |
| `review.result` | `result`: `pass` ou `fail` | `hx review pass\|fail` |
| `usage` | `model` texto; `input`, `output`, `cache_write`, `cache_read` número; `usd` número \| null; `message_id` texto; `transcript`: `main` ou `subagent`; `agent_id?` texto (desde a v0.12.0; ligado ao `agent.start` do trabalhador externo) | Uma resposta nova do modelo (ADR 0007). `task` do envelope (desde a v0.11.0): resposta de subagente = `task` do `agent.start` do mesmo agente; resposta da sessão principal = a tarefa em andamento quando há exatamente uma; senão `null` |
| `usage.limits` | `five_hour` número (% usado do limite de 5 h); `five_hour_resets_at` texto \| null (reinício da janela, ISO-8601 UTC); `seven_day` número (% usado do limite semanal); `seven_day_resets_at` texto \| null, desde a v0.8.0 | Hook `Stop`, no máximo a cada 5 min, com o valor de `GET api.anthropic.com/api/oauth/usage` (ADR 0010). Falha (sem login, rede, resposta inválida, mais de 3 s) não grava nada. Os limites são da conta: o `project` é só o do chat que leu. |
| `alert.context` | `tokens` número; `limit` número; `handoff` booleano; `agent_id?` texto \| null (desde a v0.11.0; `null` na sessão principal) | Contexto passou de `handoffAt` (ADR 0006). `task` do envelope: a do `agent.start` do `agent_id`, senão a tarefa em andamento quando há exatamente uma (desde a v0.11.0) |
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
- `agent.start`/`agent.end` se casam pelo `data.agent_id`. Com clones em paralelo (várias tarefas em andamento) e sem `TNN` na descrição do Agent, `task` fica `null`.
- **% do limite de uso (janela de 5 h e semanal):** vem do evento `usage.limits` (desde a v0.8.0). Os hooks do Claude Code não recebem esse dado; a fonte é o endpoint interno que o `/usage` usa, não documentado (exceção aceita no ADR 0010). O token do login vai só no cabeçalho da chamada e nunca é gravado.

## Privacidade

Eventos guardam **só metadados**: ids, horários, nomes de arquivo, contagens, durações, valores.

**Nunca** entram: código, prompts, respostas do modelo, segredos, conteúdo de arquivo.

O teste de esquema (`cli/test/events.test.ts`) garante isso:

- rejeita qualquer campo fora do esquema (no envelope e em `data`);
- rejeita texto com cara de conteúdo: mais de 200 caracteres, quebra de linha ou tabulação, ou os caracteres `{ } ; < > \``.

Quem escreve um evento novo precisa passar nesse teste.

## Versionamento

- O campo `v` diz a versão do contrato.
- Quem lê aceita a **versão atual e a anterior**. Evento de versão desconhecida é ignorado (e contado).
- Acrescentar tipo ou campo opcional não quebra o contrato. Mudança que **quebra** (remover/renomear campo, mudar tipo ou sentido) só acontece **entre sprints** e **sobe `v`**. O Release Report da sprint avisa. Exceção única: a remoção da S19 (abaixo) não subiu `v`.
- Arquivos antigos não são reescritos: eventos antigos mantêm o `v` com que foram gravados.

## Tipos removidos na S19

`project.status`, `statusline`, `context`, `attention` e `error` não são mais gravados nem aceitos; linhas antigas no log ficam como estão. Saíram junto com o dashboard web e a extensão, sem subir `v`.

**Atenção, projeto Dashboard IA:** ele também usava `context`, `attention` e `error` e deixa de recebê-los a partir do release da S19.

## Outros arquivos que podem ser lidos

Em `%USERPROFILE%\.harness\`:

| Arquivo | Conteúdo |
|---|---|
| `projects.json` | `{"projects":[{"id","name","path","version","attachedAt"}]}`: projetos conectados com `/attach` |
| `config.json` | Configuração do harness: preços por modelo, `contextLimit`, `handoffAt`, estratégia de contexto |

`handoffs/`, `logs/` e `cache/` são **internos**: formato livre, podem mudar sem aviso. Não dependa deles.

## Como derivar indicadores

Quem lê os eventos no harness: `hx metrics`, `hx usage` e o Release Report.

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
