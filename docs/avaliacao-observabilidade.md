# Avaliação de observabilidade: Main Harness e Dashboard IA

> Histórico. Na S19 saíram os eventos `context`, `attention` e `error`, os hooks `StopFailure` e `PostToolUseFailure` e a ligação com o dashboard.

- **Data:** 2026-10-28
- **Escopo:** só avaliação; nenhum código foi alterado.
- **Comparado com:** Claude-Code-Agent-Monitor, Agents Observe, disler/multi-agent-observability, claude-hud e o OpenTelemetry nativo do Claude Code.
- **Repos:** `C:\Main Harness` (harness) e `C:\Dashboard IA` (Dashboard). Caminhos com prefixo `Dashboard` são do segundo repo.

## Fontes conferidas

- **Claude Code instalado:** 2.1.300 (`claude --version`).
- **Doc oficial de hooks** (code.claude.com/docs/en/hooks): 33 eventos. Entre eles: `SubagentStart`, `SubagentStop`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`, `Notification`, `StopFailure`, `PreCompact` e `PostCompact`.
  - Matchers do `Notification`: `permission_prompt`, `idle_prompt`, `agent_needs_input`, `agent_completed` e outros.
  - Matchers do `StopFailure`: `rate_limit`, `overloaded`, `billing_error`, `authentication_failed`, `server_error` e outros.
  - A doc diz: "When a subagent calls a tool, tool events such as `PreToolUse` and `PostToolUse` fire the same configured hooks as in the main conversation, and the input carries the `agent_id` and `agent_type`".
  - A entrada do `PreToolUse` traz `tool_use_id`. Command hooks aceitam `"async": true` (roda em segundo plano, sem bloquear).
- **Doc de monitoramento** (code.claude.com/docs/en/monitoring-usage): eventos OTel `api_request`, `api_error`, `tool_result` e `tool_decision`, mais o `agent_id` dos subagentes.
- **Transcripts locais** (`~/.claude/projects/c--Main-Harness`): existem `<sessão>/subagents/agent-*.jsonl` com o `.meta.json` ao lado; `isCompactSummary` e `compact_boundary` aparecem nos JSONL.
- **Medição nesta máquina:** iniciar o Node vazio (`node -e 0`) leva cerca de 140 ms; `node cli/dist/hx.js version` leva de 160 a 215 ms (bundle de 194 KB).

## Tabela-resumo

| # | Item | Status | Repo | Evidência |
|---|---|---|---|---|
| 1 | Tool calls de subagentes | PARCIAL | ambos | `hooks/hooks.json:27-38,89-100`; `cli/src/hooks/lifecycle.ts:135-161`; `cli/src/usage/transcript.ts:76-105`; `Dashboard server/usage.ts:36-44,99-107` |
| 2 | Robustez do hook | PARCIAL | harness | `cli/src/hooks/runner.ts:45-63`; `hooks/hooks.json` (timeouts de 10 a 90 s, nenhum `async`); `cli/src/hooks/lifecycle.ts:57,81` |
| 3 | Sessões abandonadas | PARCIAL | Dashboard | `Dashboard server/data.ts:20-21,348-359` |
| 4 | Contexto vs. consumo | PARCIAL | ambos | `cli/src/usage/transcript.ts:42-62,189-207`; `cli/src/hooks/lifecycle.ts:96-127,163-182`; `Dashboard server/db.ts:127-178`; `Dashboard docs/sprints/S12-plan.md:14,26` |
| 5 | Estado "aguardando o humano" | PARCIAL | ambos | `cli/src/hooks/lifecycle.ts:84-91`; `cli/src/hooks/prompt.ts:7-17`; `Dashboard server/data.ts:61-82,262-273` |
| 6 | Notificações | FALTA | harness | `docs/roadmap.md:14-23`; nenhum hook `Notification` em `hooks/hooks.json` |
| 7 | Acesso dos agentes ao Dashboard | PARCIAL | ambos | `Dashboard server/http.ts:8-46`; `Dashboard CLAUDE.md:9`; `cli/src/hooks/pre-bash.ts` |
| 8 | Versão do harness por projeto | PARCIAL | ambos | `Dashboard .claude/harness.json:4`; `cli/src/events/schema.ts:116`; `cli/src/commands/doctor.ts:58-94,219-226`; `cli/src/hooks/session-start.ts:21-31,90-92` |
| 9 | Statusline do contexto contra 250K | NÃO SE APLICA | — | `CHANGELOG.md:125`; `docs/backlog.md:75` (B065); `cli/src/core/config.ts:54-55`; `.claude/settings.json:36` |
| 10 | Pre/Post unidos por `tool_use_id` e exibição por ferramenta | FALTA | Dashboard (opcional) | `cli/src/events/schema.ts:143-146`; nenhum `tool_use` em `Dashboard src/` |
| 11 | Nomes de sessão e transcript → projeto | PARCIAL | Dashboard | `cli/src/hooks/session-start.ts:33-39`; `cli/src/core/projects.ts:51-60`; `Dashboard server/usage.ts:9-12,69-72` |
| 12 | Importação idempotente | JÁ EXISTE (Dashboard) / PARCIAL (harness) | ambos | `Dashboard server/events.ts:252-280`; `Dashboard server/usage.ts:55-60`; `Dashboard server/importer.ts:44-50`; `cli/src/commands/usage.ts:109`; `cli/src/usage/transcript.ts:32-37,162` |
| 13 | Eventos de erro | PARCIAL | ambos | `Dashboard server/usage.ts:21-23,73-79`; `hooks/hooks.json` sem `PostToolUseFailure`, `StopFailure` e `PermissionRequest` |
| 14 | Telemetria OTel nativa | NÃO AGORA (complementar, com cuidado) | harness | `docs/adr/0007-consumo-via-transcripts.md:8,19`; `docs/roadmap.md:44-46`; `cli/src/usage/transcript.ts:20-23` |

## Detalhe por item

### 1. Atribuição de tool calls internas de subagentes — PARCIAL (ambos)

**O que existe:**
- O harness registra início e fim de cada subagente: `SubagentStart` e `SubagentStop` (`hooks/hooks.json:27-38,89-100`) viram `agent.start` e `agent.end` com `agent_id` e o tipo (`cli/src/hooks/lifecycle.ts:135-161`).
- O consumo de cada subagente é lido de `<sessão>/subagents/agent-*.jsonl`, com o nome vindo do `agentType` do `.meta.json` (`cli/src/usage/transcript.ts:76-105`). O Dashboard faz o mesmo na importação (`Dashboard server/usage.ts:36-44,99-107`).
- A doc confirma que as tool calls de subagentes disparam `PreToolUse` e `PostToolUse` com `agent_id`. Por isso o `pre-bash` e o `pre-edit` já protegem também os clones e o Reviewer.

**O que falta:** nenhum dos dois repos registra o que cada subagente *fez* (qual ferramenta, qual arquivo, se deu certo). Os hooks de ferramenta só existem como guarda (`Bash|PowerShell`, `Write|Edit|MultiEdit`) e não gravam eventos. Também não há leitura de `tool_use` com `tool_result` unidos pelo `tool_use_id`.

**O que fazer:** no Dashboard, ler `tool_use` e `tool_result` dos `agent-*.jsonl` (leitura local, sem passar pelo contrato) e montar uma linha do tempo por agente. Alternativa no harness: um `PostToolUse` geral com `async: true`, emitindo só metadados (ferramenta, ok, duração, `agent_id`).

### 2. Robustez do hook — PARCIAL (harness)

**O que existe:**
- Falha em silêncio: o `runHook` transforma qualquer exceção em exit 0 e grava no log (`cli/src/hooks/runner.ts:45-63`).
- O `emit` só faz `appendFileSync` num arquivo local (`cli/src/events/emit.ts:47`), sem rede.

**O que falta:**
- Nada é fire-and-forget: nenhum hook usa `async: true`.
- O `Stop` tem timeout de 90 s. Ele faz a ingestão do transcript, roda o tsc (só no repo do harness) e chama o `refreshLimits` pela rede, com até 3 s (`cli/src/hooks/lifecycle.ts:57,81`).
- O `post-edit` tem 60 s, mas é bloqueante de propósito, porque roda o lint.

**Custo no Windows:** cada processo Node custa de 140 a 200 ms. Cada Edit abre 2 processos (pre e post) e cada Bash abre 1. Numa tarefa com 50 edições, isso soma cerca de 20 s de espera.

**O que fazer (harness):** pôr `async: true` nos hooks que só observam (`UserPromptSubmit`, `SubagentStart`) e manter síncronos os de guarda (`pre-bash`, `pre-edit`, `Stop` com bloqueio). Os hooks novos de observação (itens 5, 6 e 13) já nascem com `async`.

### 3. Sessões abandonadas — PARCIAL (Dashboard)

**O que existe:** o Dashboard encerra chats e agentes sem `session.end` depois de 30 min sem eventos (`Dashboard server/data.ts:20-21,348-359`). O harness não tem detecção nenhuma.

**Problemas:**
- A "atividade" vem só dos eventos do harness, e o consumo só é gravado no `Stop`. Um turno autônomo longo, sem eventos no meio, é dado como encerrado.
- Um chat parado esperando Daniel por mais de 30 min também vira "encerrado", quando na verdade está aguardando.

**O que fazer (Dashboard):** usar também a tabela `turn` (já importada dos transcripts) ou a data de modificação do transcript como sinal de vida. Separar "aguardando você" de "abandonado" (por exemplo: abandonado só depois de N horas sem `prompt`).

### 4. Contexto vs. consumo — PARCIAL (ambos)

**O que existe:**
- **Contexto atual:** o `currentContextTokens` usa a última resposta do chat principal (input + cache lido + cache escrito), que cai sozinho depois do `/compact` (`cli/src/usage/transcript.ts:189-207`). O consumo acumulado é outra coisa: os eventos `usage`.
- **Compactação:** detectada pelo hook `PreCompact` (`cli/src/hooks/lifecycle.ts:163-182`), que grava `lastCompactAt`. O `isCompactSummary` do transcript não é lido, e não precisa.
- **Leitura incremental por byte-offset nos dois repos:** o harness guarda um offset por arquivo e relê só a mensagem que ainda está chegando (`cli/src/usage/transcript.ts:42-62,107-119`). O Dashboard guarda cursor e hash do começo do arquivo, para notar se ele foi reescrito (`Dashboard server/db.ts:127-178`).

**O que falta:** o contexto só sai no `alert.context`, a partir de 120 mil tokens, e nunca é atualizado depois (`cli/src/hooks/lifecycle.ts:96-127`). Por isso a S12 do Dashboard planeja tirar a barra "ctx", que mostra um número velho e alto (`Dashboard docs/sprints/S12-plan.md:14,26`).

**O que fazer:**
- **Harness:** um evento `context` a cada `Stop`, com tokens, limite e uma marca `compacted` depois do `PreCompact`/`PostCompact`.
- **Dashboard:** voltar a mostrar a barra com esse evento.

**Observação:** os tokens de consumo do Dashboard somam o cache lido (`Dashboard server/usage.ts:145`). Isso infla o número em relação ao custo; vale mostrar o cache à parte.

### 5. Estado "aguardando o humano" — PARCIAL (ambos)

**O que existe:**
- O harness emite `turn.end` quando o `Stop` deixa o agente parar (`cli/src/hooks/lifecycle.ts:84-91`) e `prompt` a cada mensagem de Daniel (`cli/src/hooks/prompt.ts:7-17`).
- O Dashboard calcula as esperas passadas de cada sprint pelo transcript: do último turno do assistente até a próxima mensagem humana, separando a espera por limite de uso (`Dashboard server/data.ts:61-82,262-273`).

**O que falta:**
- Uma lista ao vivo: "chats parados esperando você desde HH:MM".
- O caso do pedido de permissão: o `Notification` (`permission_prompt`, `idle_prompt`) não é capturado.

**O que fazer:**
- **Harness:** hook `Notification` com `async: true`, emitindo `attention {kind}`.
- **Dashboard:** estado por chat = último `turn.end` ou `attention` sem `prompt` depois, com o tempo decorrido.

### 6. Notificações quando um agente precisa de input — FALTA (harness)

Está no roadmap, item 2 (`docs/roadmap.md:14-23`), e não há nada implementado.

**O que fazer (harness):** um hook `Notification` com `async: true` que mostra um toast do Windows (PowerShell), só para `permission_prompt` e `idle_prompt`.

**A CONFIRMAR:** se o painel do Claude Code no VS Code dispara o `Notification` como o terminal. A doc não diz, e Daniel trabalha no painel.

### 7. Acesso dos agentes ao Dashboard — PARCIAL (ambos)

**O que existe:**
- Os agentes leem o backlog, as sprints e o roadmap direto dos arquivos (`docs/backlog.md`, `docs/sprints/*`, `docs/roadmap.md`) e pelo `hx sprint status`.
- O Dashboard expõe só `GET /api/data` (todos os dados de uma vez) e `POST /api/projects/:id/promote`, restritos a localhost (`Dashboard server/http.ts:8-46`). Não há MCP.

**Separação entre leitura, escrita e ações destrutivas:**
- Leitura: arquivos.
- Escrita: comandos `hx` (`task`, `sprint`, `request`, `handoff`); o `CLAUDE.md` do Dashboard proíbe editar o estado à mão (`Dashboard CLAUDE.md:9`).
- Destrutivo: barrado pelo `pre-bash`.

**O que fazer:** só se houver necessidade real. Primeiro, um comando de leitura entre projetos no `hx` (por exemplo `hx status --all`); MCP só depois disso.

### 8. Versão do harness por projeto — PARCIAL (ambos)

**O que existe:**
- Cada projeto guarda a versão em `.claude/harness.json` (`Dashboard .claude/harness.json:4`) e é migrado no `SessionStart` quando a versão muda (`cli/src/hooks/session-start.ts:21-31,90-92`).
- Todo evento carrega o campo `harness`, a versão do bundle que rodou (`cli/src/events/schema.ts:116`).
- O `hx doctor` compara a versão instalada no projeto com a disponível no marketplace e manda atualizar (`cli/src/commands/doctor.ts:58-94,219-226`).
- Todos os projetos, inclusive o próprio harness, usam `main-harness@harness-stable` (`.claude/settings.json:32`). A versão "dev" só roda nos testes. Por isso a divergência possível é de versão, não de origem (stable × dev).

**O que falta:** uma visão central. O Dashboard ignora o campo `harness`, e o `doctor` só roda quando alguém pede, um projeto por vez.

**O que fazer (Dashboard):** mostrar a versão do último evento de cada projeto e marcar divergência em relação ao último `harness.release`.

### 9. Statusline com o contexto contra o limite de 250K — NÃO SE APLICA

A statusline (`hx statusline`) foi removida na S07 (B065), porque não aparece no painel do VS Code (`CHANGELOG.md:125`, `docs/backlog.md:75`).

O limite também mudou:
- No harness, o limite hoje é de 140 mil, com alerta em 120 mil (`cli/src/core/config.ts:54-55`).
- O `settings.json` tem `autoCompactWindow: 250000` (`.claude/settings.json:36`), e o ADR 0006 e o roadmap ainda falam em 250K (`docs/roadmap.md:20`).

Vale alinhar a documentação. O papel da statusline passa para o item 4, no Dashboard.

### 10. Pre/PostToolUse unidos por `tool_use_id` e exibição por ferramenta — FALTA (Dashboard, opcional, prioridade baixa)

O contrato de eventos proíbe conteúdo: texto com quebra de linha, chaves ou acima de 200 caracteres é recusado (`cli/src/events/schema.ts:143-146`). Então diff e saída de terminal nunca vão passar pelo harness, e isso é uma decisão de privacidade, não um esquecimento.

**O que fazer, se Daniel quiser:** o Dashboard lê `tool_use` e `tool_result` direto do transcript local (o mesmo leitor do item 1), unindo pelo `tool_use_id`, e mostra diff no Edit e terminal no Bash. Antes, um ADR decidindo se o conteúdo pode ir para o banco do Dashboard.

### 11. Identificação de sessão e projeto — PARCIAL (Dashboard)

**Nome legível:**
- O Dashboard usa o `ai-title` do transcript, o nome que o Claude Code dá ao chat (`Dashboard server/usage.ts:69`).
- O harness manda `title` só quando o chat foi renomeado com `/rename` (`cli/src/hooks/session-start.ts:33-39`).
- Resultado: funciona.

**Mapeamento transcript → projeto:**
- O harness sobe a partir do `cwd` até achar `.claude/harness.json` (`cli/src/core/projects.ts:51-60`), o que é robusto.
- O Dashboard compara o `cwd` de cada linha **exatamente** com o caminho do repo (`Dashboard server/usage.ts:9-12,71`). Um chat aberto numa subpasta some do consumo.

**O que fazer (Dashboard):** casar pelo maior prefixo de caminho.

### 12. Importação de histórico idempotente — JÁ EXISTE (Dashboard) / PARCIAL (harness)

**Dashboard:**
- Eventos entram com `INSERT OR IGNORE` pelo id (`Dashboard server/events.ts:252-280`).
- O consumo entra com upsert pelo `message.id` (`Dashboard server/usage.ts:55-60`), a mesma chave do evento `usage` do harness (`Dashboard server/events.ts:216`).
- Projeto novo zera o cursor e reimporta sem duplicar (`Dashboard server/importer.ts:44-50`).
- Resultado: projetos antigos conectados depois entram certos, desde que os transcripts ainda existam. A S12/T04 cuida de não perder histórico quando a versão do banco sobe.

**Harness:**
- Os offsets por arquivo evitam reler (`cli/src/usage/transcript.ts:32-37,162`).
- Mas o `hx usage` e o `hx metrics` somam os eventos sem deduplicar por `message_id` (`cli/src/commands/usage.ts:109`). Se `~/.harness/usage-cache` for apagado, o consumo conta dobrado.
- A ingestão marca com a sprint *ativa* o consumo antigo que lê pela primeira vez (`cli/src/usage/transcript.ts:140`).

**O que fazer (harness):** deduplicar por `message_id` na soma.

### 13. Eventos de erro — PARCIAL (ambos)

**O que existe:** o Dashboard detecta o limite de uso pela mensagem sintética do transcript, com `isApiErrorMessage` e `error: "rate_limit"` (`Dashboard server/usage.ts:21-23,73-79`). Ela vira um turno `limit`, usado nas esperas.

**O que falta:** não há hooks `PostToolUseFailure`, `StopFailure`, `PermissionRequest` nem `PermissionDenied`. Erros de API além do limite (`overloaded`, `billing_error`, `server_error`) e falhas de ferramenta não aparecem.

**O que fazer (harness):** hooks com `async: true` emitindo `error {kind, tool?}` e `attention {kind: "permission"}`, sem conteúdo.

**A CONFIRMAR:** os campos de entrada do `StopFailure` e do `PostToolUseFailure`. A página da doc lida nesta avaliação veio cortada nesse trecho.

### 14. Telemetria OTel nativa — vale como complemento, não agora

**O que o OTel oferece:**
- `api_request` com custo e tokens.
- `api_error`.
- `tool_result`, com `tool_use_id`, sucesso e duração.
- `tool_decision`.
- `agent_id` nos eventos de subagentes.

**Por que não agora:**
- Precisa de um coletor OTLP rodando na máquina (ou o exporter `console`, que só imprime). Hoje o harness não tem servidor nenhum.
- O `api_request` traz `request_id`, **não** o `message.id` do transcript. Somar as duas fontes duplica o consumo, sem chave para deduplicar.

**Recomendação:**
- Manter os transcripts como fonte única de consumo (ADR 0007, interface `UsageSource` em `cli/src/usage/transcript.ts:20-23`).
- Usar o OTel só quando o Dashboard for para a nuvem (`docs/roadmap.md:44-46`), e então **trocar** a fonte, sem somar.
- Os erros e as falhas de ferramenta ficam com os hooks do item 13, sem coletor.

## As 5 ações de maior impacto

| # | Ação | Repo | Itens |
|---|---|---|---|
| 1 | Hooks `Notification`, `StopFailure`, `PostToolUseFailure` e `PermissionRequest` (todos com `async: true`), com dois tipos novos de evento no contrato: `attention` e `error` | harness | 5, 6, 13 |
| 2 | Painel "Aguardando você" por chat (desde quando e por quê), sem encerrar por inatividade o chat que só espera Daniel | Dashboard | 3, 5 |
| 3 | Evento `context` a cada `Stop`, com marca de compactação; a barra de contexto volta no Dashboard. Sugestão: rever a S12/T03 do Dashboard antes de aprovar | harness + Dashboard | 4 |
| 4 | Toast do Windows para permissão e ociosidade; `async: true` nos hooks que só observam | harness | 2, 6 |
| 5 | Transcript → projeto pelo maior prefixo de caminho; versão do harness por projeto, com alerta de divergência | Dashboard | 8, 11 |

**Menor, no harness:** deduplicar `hx usage` e `hx metrics` por `message_id` (item 12) e alinhar a documentação do limite de contexto, 140 mil × 250K (item 9).

## Pedidos para o Dashboard IA (preparados, não enviados)

Formato de `templates/inbox-request.md`. Para enviar: `hx request --to dashboard-ia` (um pedido por vez). O pedido B depende da ação 3 no harness.

### Pedido A

```markdown
# Pedido ao harness: Painel "Aguardando você" por chat

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Mostrar, ao vivo, os chats parados esperando Daniel: projeto, título do chat, desde quando e por quê (fim de turno ou pedido de permissão). Estado por chat = último `turn.end` (ou `attention`, quando o harness entregar) sem `prompt` depois. Um chat nessa situação não deve ser encerrado pela regra dos 30 min sem atividade (`server/data.ts:348-359`).

## Por quê

Hoje só existem as esperas passadas por sprint (`waitsOf`). Daniel não vê quais chats estão travados por ele agora, e um chat esperando há mais de 30 min aparece como encerrado.

## Exemplo

"6thGear — S03 execução — aguardando você há 12 min (fim de turno)". "Dashboard IA — T04 — pedido de permissão há 3 min."
```

### Pedido B

```markdown
# Pedido ao harness: Barra de contexto pelo evento `context`

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Manter o `contextPct` dos agentes (rever a S12/T03, que tira a barra "ctx") e alimentá-lo com o evento novo `context` do harness, gravado a cada fim de turno com tokens, limite e marca de compactação. Enquanto o evento não existir, esconder a barra em vez de mostrar o último `alert.context`.

## Por quê

O `alert.context` só sai acima de 120 mil tokens e nunca é atualizado depois da compactação, por isso o número fica velho. Com um evento por turno, a barra volta a dizer a verdade e substitui a statusline, que não aparece no VS Code.

## Exemplo

Tech Lead: 64% (90 mil de 140 mil), "compactado às 15:20".
```

### Pedido C

```markdown
# Pedido ao harness: Transcript → projeto pelo maior prefixo de caminho

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** média

## O que precisa

Em `server/usage.ts` (linha 71), casar o `cwd` de cada linha do transcript com o projeto cujo `repoPath` é o maior prefixo do `cwd`, em vez de exigir caminho igual (mantendo o `norm` atual, sem diferenciar maiúsculas no Windows).

## Por quê

Um chat aberto numa subpasta do repo (ex.: `C:\Dashboard IA\server`) fica fora do consumo e das esperas. O harness já resolve o projeto subindo a partir do `cwd`.

## Exemplo

`cwd` = `c:\dashboard ia\server` → projeto `dashboard-ia`.
```

### Pedido D

```markdown
# Pedido ao harness: Versão do harness por projeto

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** média

## O que precisa

Ler o campo `harness` (versão) dos eventos e mostrar, por projeto, a versão do último evento. Marcar divergência quando ela for menor que a do último `harness.release`.

## Por quê

Hoje só o `hx doctor`, rodado à mão em cada projeto, mostra se um projeto ficou para trás. O campo já vem em todo evento e o Dashboard o ignora.

## Exemplo

"6thGear — harness 0.9.0 (atual 0.10.1) — rode `claude plugin update`".
```

### Pedido E (opcional, baixa)

```markdown
# Pedido ao harness: Linha do tempo de ferramentas por agente

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** baixa

## O que precisa

Ler `tool_use` e `tool_result` dos transcripts locais (chat principal e `subagents/agent-*.jsonl`), unidos pelo `tool_use_id`, e mostrar por agente: ferramenta, alvo, duração e se falhou. Diff para Edit e terminal para Bash só depois de um ADR sobre guardar conteúdo no banco.

## Por quê

Hoje se sabe quanto cada subagente gastou, mas não o que ele fez. O contrato de eventos do harness não carrega conteúdo, então a leitura tem que ser local.

## Exemplo

"Reviewer 1 — Bash `hx run npm test` (42 s, ok) → Edit `server/db.ts` (falhou)".
```

## A CONFIRMAR

- Se o painel do Claude Code no VS Code dispara o hook `Notification` (`permission_prompt`, `idle_prompt`) como o terminal.
- Os campos de entrada do `StopFailure`, do `PostToolUse` e do `PostToolUseFailure`: a doc oficial lida nesta avaliação veio cortada nesse trecho.
