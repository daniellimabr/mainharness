# S07 — % de uso no Dashboard, retomada após o limite e tempos mais finos

- **Projeto:** main-harness
- **Versão do harness:** 0.7.0
- **Status:** aguardando aprovação

## Objetivo

O harness passa a gravar o % de uso do Claude Code (sessão de 5 h e semanal) em qualquer interface, inclusive na extensão do VS Code, para o ícone que o Dashboard IA já tem mostrar o valor real. Quando a sessão estoura o limite, o harness agenda a retomada do chat para logo depois do reinício, sem Daniel. A status line sai, porque não aparece no VS Code. A sprint também fecha os pedidos pequenos do backlog: tempo de revisão separado da fila, estimativa calibrada pela régua nova, `tsc` no handoff dos clones e `safeText` no lugar certo. Fecha com a release v0.8.0.

## Escopo

1. **B064:** `hx` lê o % de uso no endpoint interno que o `/usage` do Claude Code usa (`GET https://api.anthropic.com/api/oauth/usage`, com o token do login em `~/.claude/.credentials.json`). Decisão de Daniel: o endpoint não é documentado, e ele aceitou isso como exceção à regra "só caminhos oficiais" do roadmap. A exceção fica registrada em ADR.
   - Grava o evento novo `usage.limits`: `five_hour` e `seven_day` (%) e os horários de reinício de cada um. Os campos seguem a tabela `limit_window` do Dashboard (janela, %, `resets_at`).
   - Atualiza no hook Stop no máximo a cada 5 min. O hook não trava: a chamada tem limite de 3 s, e um erro não aparece.
   - `hx usage` mostra a linha do limite.
   - O token só vai para `api.anthropic.com`; nunca aparece em log nem em evento.
2. **B005:** retomada automática após o limite (autorizada por Daniel em 21/10).
   - Quando a vez do agente termina por limite de uso, o harness agenda no Agendador de Tarefas do Windows uma execução única, 2 min após o `resets_at` da janela que estourou. Essa execução roda `hx resume`, que retoma a mesma sessão com `claude --resume <sessão> -p "Continue de onde parou."` na pasta do projeto.
   - Uma retomada agendada por sessão: um novo estouro troca o horário, sem duplicar.
   - Os clones param junto com o chat principal; o Tech Lead retomado os chama de novo pela lista de tarefas.
   - `hx setup` libera o `schtasks` do harness no modo auto. `hx doctor` lista as retomadas pendentes.
   - Antes do código: conferir na documentação do Claude Code o evento de hook que indica parada por limite. O resultado e o mecanismo vão para o ADR.
3. **B065:** remove `hx statusline`: o comando, o teste e o registro no roteador. Remove também a `statusLine` que o `hx setup` grava e o aviso do `hx doctor`. O `hx setup` apaga a `statusLine` do `~/.claude/settings.json` só se for exatamente a do harness. O evento `statusline` fica no contrato como obsoleto, e os eventos antigos continuam válidos.
4. **B063:** `safeText` sai de `hooks/session-start.ts` para `core/text.ts`.
5. **B066:** o handoff de clone pede `hx run npx tsc --noEmit -p cli` no critério de pronto, além do lint. Vale para a skill `handoff` e para a seção "Se você é um clone" do `tech-lead`.
6. **B067:** `sprint-plan` calcula o fator da soma com a duração até a entrega e usa só sprints com fase `revisão` registrada (S05 em diante).
7. **B068:** o clone marca `hx task phase TNN fila` na entrega, e o Reviewer marca `revisão` ao começar. A tabela e o `hx metrics` mostram "4 min (fila: 14 min, revisão: 3 min)". Tarefa sem fase `fila` continua como hoje.

## Fora de escopo

- **B029** (CI no GitHub): depende do backup remoto (roadmap 4).
- Leitura do token e agendamento no macOS/Linux: o harness roda só no Windows hoje.
- Leitura do evento `usage.limits` no Dashboard IA: são poucas linhas no importador dele, que preenchem a `limit_window` e trocam a estimativa pelo valor real. Isso é feito no próprio projeto do Dashboard, depois da release.
- Retomada visível no painel do VS Code: a sessão retomada roda em segundo plano e aparece no Dashboard e no histórico do chat.

## Critérios de aceite

1. Com uma resposta de exemplo do endpoint, o Stop grava um `usage.limits` com os dois percentuais e os horários de reinício, e dentro de 5 min não chama de novo. Nada é gravado, e o hook segue normal, nestes casos:
   - sem credencial;
   - com erro de rede;
   - com resposta inválida;
   - com demora acima de 3 s.
2. O token só vai no cabeçalho da chamada a `api.anthropic.com`. Não aparece em evento, log, saída nem mensagem de erro.
3. `hx usage` mostra "Limite: 5 h 42% · semana 18%" com o último valor gravado.
4. Parada por limite com `resets_at` às 15:00 agenda uma tarefa única às 15:02, que roda `hx resume` para aquela sessão e pasta. Um segundo estouro da mesma sessão substitui a tarefa. Parada normal não agenda nada. Sessão e caminho vindos da entrada do hook são validados antes de entrar no comando agendado, sem injeção.
5. `hx resume` retoma a sessão com `claude --resume`, grava um evento e apaga a própria tarefa agendada.
6. `hx statusline` não existe mais. `hx setup` remove a `statusLine` do harness e mantém outra qualquer. `hx doctor` não fala mais em status line.
7. `safeText` vem de `core/text.ts`, e nenhum comando importa de `hooks/`.
8. O handoff de clone traz o `tsc` no critério de pronto. A `sprint-plan` mostra o fator da soma só das sprints com fase `revisão`. As duas skills passam nos evals.
9. Tarefa com `fila` aos 4 min, `revisão` aos 18 min e done aos 21 min aparece como "4 min (fila: 14 min, revisão: 3 min)".
10. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01 (`cli/test/limits.test.ts`, novo):
    - `fetch` falso com resposta válida, resposta inválida, erro, demora e sem credencial;
    - intervalo de 5 min;
    - token ausente de eventos e saídas.
  - T02 (`cli/test/setup.test.ts`, `cli/test/doctor.test.ts`): o setup remove só a `statusLine` do harness; o doctor fica sem o aviso.
  - T04 (`cli/test/sprint.test.ts`): fases `fila` e `revisão` na tabela e no `hx metrics`; tarefa sem `fila` igual a hoje.
  - T05 (`cli/test/resume.test.ts`, novo), com `schtasks` e `claude` falsos:
    - agenda no horário certo;
    - substitui a tarefa no segundo estouro;
    - ignora parada normal;
    - recusa sessão ou caminho malformados;
    - `hx resume` chama `claude --resume` e apaga a tarefa.
- **Evals:** T03 roda `hx eval handoff` e `hx eval sprint-plan` (o corpo mudou, então só `evals.json`; Sonnet, 1 rodada, `--failed` para repetir).
- **E2E (depois da release):**
  - Daniel usa o VS Code normalmente e confere o % no `hx usage`.
  - Na próxima vez que o limite estourar, Daniel confere no `hx doctor` a retomada agendada e, depois do reinício, se o chat continuou.
- Tudo roda em pastas temporárias (`HARNESS_HOME`, `HOME`). Nenhum teste chama a rede de verdade, lê a credencial real ou cria tarefa real no Agendador.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | B064: % de uso pelo endpoint, evento `usage.limits`, Stop e `hx usage`; ADR e roadmap | clone A | `cli/src/usage/limits.ts` (novo), `cli/src/hooks/lifecycle.ts`, `cli/src/commands/usage.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md`, `cli/test/limits.test.ts` (novo), `docs/adr/` (novo ADR), `docs/roadmap.md` | — | 30 min (S06/T03: 7 min real + pesquisa e ADR) | 13 min |
| T02 | B065 + B063: remove a status line; `safeText` em `core/text.ts` | clone B | `cli/src/commands/statusline.ts` (apagar), `cli/test/statusline.test.ts` (apagar), `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `cli/src/commands/status.ts`, `cli/src/hooks/session-start.ts`, `cli/src/core/text.ts` (novo), `cli/test/setup.test.ts`, `cli/test/doctor.test.ts` | — | 15 min (S06/T04) | 7 min |
| T03 | B066 + B067: `tsc` no handoff e fator da soma pela régua nova; evals | clone C | `skills/handoff/**`, `skills/sprint-plan/**` | — | 25 min (S06/T06: 10 min com eval) | 11 min |
| T04 | B068: fila e revisão separadas no tempo da tarefa | clone D | `cli/src/sprint/index.ts`, `cli/src/commands/metrics.ts`, `cli/test/sprint.test.ts`, `commands/sprint-run.md`, `agents/tech-lead.md`, `agents/reviewer.md` | — | 20 min (S06/T07) | 9 min |
| T05 | B005: retomada automática após o limite (`hx resume`, agendamento no Stop, setup e doctor); ADR | clone A | `cli/src/commands/resume.ts` (novo), `cli/test/resume.test.ts` (novo), `cli/src/hooks/lifecycle.ts`, `hooks/hooks.json`, `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `docs/adr/` (novo ADR), `docs/contracts/events.md`, `cli/src/events/schema.ts` | T01, T02 | 40 min (sem histórico parecido: pesquisa + agendador + segurança) | 18 min |
| T06 | Revisão final, backlog (B005, B063–B068), CHANGELOG e release v0.8.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md`, `docs/sprints/S07-release.md` | T01–T05 | 10 min (S06/T08: 2 min) | 5 min |

**Ondas:**

1. T01, T02, T03 e T04 em paralelo.
2. T05, com o mesmo clone da T01. Usa o `resets_at` da T01 e mexe em arquivos das tarefas T01 e T02 (`lifecycle.ts`, `setup.ts`, `doctor.ts`).
3. T06.

O Reviewer revisa cada onda dentro das tarefas, sem linha própria na tabela. T01 (token e entrada externa), T02 (`settings.json`) e T05 (comando agendado montado com dados do hook) usam `model: opus`.

**Paralelismo:** nenhuma tarefa da mesma onda cruza arquivo com outra.

- A linha do `tsc` na seção "Se você é um clone" do `agents/tech-lead.md` (B066) entra pelo clone D, que é o dono do arquivo.
- O roteador `cli/src/index.ts` (tirar `statusline`, registrar `resume`), o `cli/dist/hx.js` e o `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.
- Os clones rodam só os próprios testes, mais o `tsc`.

**Git:** um commit por tarefa na `main`.

**Histórico (hx metrics, soma até a entrega):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S06 | 1 h 2 min | 27 min | 2 h 23 min | 51 min |
| S05 | 1 h 12 min | 53 min | 3 h 10 min | 1 h 38 min |

Fator, só das sprints com fase `revisão`:

- **soma:** S06 0,36 e S05 0,52, média **0,44**;
- **relógio:** S06 0,44 e S05 0,74, média **0,59**.

A S04 fica fora porque media até o done.

**Total estimado:**

- **Soma:** ~1 h 3 min (bruta 2 h 20 min × 0,44).
- **Relógio:** ~47 min de agente. É o caminho T01 → T05 → T06 (80 min brutos) × 0,59.
- O teste de Daniel no VS Code e o primeiro estouro real do limite ficam à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-21 17:51:20 (horário de Brasília) — UTC 2026-10-21T20:51:20Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `1d5d97db94d528ad2875a787bbadcf9cb2f1b61d8bcbebfea21204a87def4888`
- **Versão do harness:** 0.7.0
