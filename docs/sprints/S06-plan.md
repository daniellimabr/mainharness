# S06 — Pendências do backlog: status line, tempos honestos e evals estáveis

- **Projeto:** main-harness
- **Versão do harness:** 0.6.0
- **Status:** aguardando aprovação

## Objetivo

Fechar as pendências abertas do backlog: o harness passa a gravar o % do limite e o título do chat pela status line, a duração da tarefa mede a entrega do clone (não a fila da revisão), os evals das skills deixam de falhar por falta de ambiente e os testes de tempo não quebram com a máquina carregada. Fecha com a release v0.7.0.

## Escopo

1. **B054:** `pre-bash` trata `Tee-Object -FilePath` e `git format-patch -o` para destinos protegidos (`cli/dist/hx.js`, `C:\harness-stable`) como escrita (mesma regra do `pre-edit`).
2. **B055:** `usage` recua o cursor até a primeira linha da mensagem em streaming, mesmo com uma linha `user` no meio dos trechos.
3. **B062:** testes '5 MB transcript' (usage) e 'web project' (attach) medem só o caminho rápido ou ganham timeout folgado; `npm run check` não falha com evals rodando em paralelo.
4. **B056:** comando `hx statusline` para a status line do Claude Code: lê o JSON da entrada, grava evento com `rate_limits.*.used_percentage` (5 h e semanal) e `session_name`, e imprime uma linha curta. `hx setup` configura a `statusLine` em `~/.claude/settings.json` só se não houver outra (nunca sobrescreve); `hx doctor` avisa se faltar. Evento novo documentado em `docs/contracts/events.md`.
5. **B057:** `hx status --where/--next` aceita `;` (mesma limpeza do título).
6. **B058:** `session-start` não corta o item do backlog que tem `\|` no texto.
7. **B059:** `hx eval` apaga `HARNESS_REPO`, `HARNESS_STABLE_DIR` e `HARNESS_INBOX` do env da sessão.
8. **B061:** `hx eval` avisa caso sem `files` cujo prompt pressupõe repo conectado, sprint ou relatório; auditoria das 8 skills distribuídas, com fixtures (`evals/files*` com `.hx-home/config.json` isolado) onde faltar; evals reais só das skills cujas fixtures mudaram.
9. **B060:** a entrega do clone marca a fase `revisão` (`hx task phase TNN revisão` na hora da entrega, instrução no `sprint-run` e no `tech-lead`); a tabela de execução e o `hx metrics` mostram duração até a entrega e tempo de revisão à parte, e a soma real usa a duração até a entrega.

## Fora de escopo

- **B005** (retomar sozinho após o limite): precisa de autorização de Daniel.
- **B029** (CI no GitHub): depende do backup remoto (roadmap 4), ainda não ativo.
- Painel do % de limite no Dashboard IA: fica no próprio projeto.

## Critérios de aceite

1. `Get-Content x | Tee-Object -FilePath cli/dist/hx.js` e `git format-patch -o C:\harness-stable` são tratados como escrita protegida (nega ou pergunta, igual ao `pre-edit`); destinos comuns continuam liberados.
2. Mensagem em streaming com uma linha `user` entre trechos grava o `output_tokens` final no evento `usage`.
3. Os dois testes de tempo passam com a CPU ocupada (rodados junto com outra carga), sem perder o que verificam.
4. `hx statusline` com JSON de exemplo grava um evento com os dois percentuais e o título e imprime uma linha; JSON inválido ou vazio não quebra (imprime a linha mínima, não grava lixo). `hx setup` cria a `statusLine` quando não há nenhuma e mantém a existente; `hx doctor` avisa quando falta.
5. `hx status --where "a; b" --next "c"` grava o evento sem erro.
6. Item de backlog com `\|` aparece inteiro no contexto do `session-start`.
7. A sessão `claude -p` do `hx eval` não recebe `HARNESS_REPO`, `HARNESS_STABLE_DIR` nem `HARNESS_INBOX`.
8. `hx eval` avisa o caso sem `files` que pressupõe repo conectado; nenhuma skill distribuída fica com caso assim; as skills com fixtures novas passam nos evals.
9. Tarefa com fase `revisão` aos 7 min e done aos 16 min aparece como "7 min (revisão: 9 min)" e soma 7 min no real do `hx metrics`.
10. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01: `Tee-Object -FilePath`/`-Path` e `format-patch -o`/`--output-directory` para destinos protegidos e comuns (`cli/test/pre-bash-s06.test.ts`).
  - T02: transcript com `user` entre trechos da mesma `message.id` (`cli/test/usage.test.ts`); os dois testes de tempo reescritos sem depender da velocidade da máquina.
  - T03: JSON de exemplo, inválido e vazio no `hx statusline`; `settings.json` com e sem `statusLine` no setup e no doctor (`cli/test/statusline.test.ts`, `setup.test.ts`, `doctor.test.ts`).
  - T04: `;` no `hx status`; backlog com `\|` no `session-start` (`cli/test/text-s06.test.ts`).
  - T05: env da sessão sem as 3 variáveis; aviso para caso sem `files` que cita repo conectado/sprint (`cli/test/eval.test.ts`).
  - T07: fase `revisão` antes do done na tabela e no `hx metrics` (`cli/test/sprint.test.ts`).
- **Evals:** T06 roda `hx eval <skill>` real só nas skills com fixtures alteradas (Sonnet, 1 rodada, `--failed` para repetir).
- **E2E:** depois da release, Daniel abre um chat novo e confere a status line e o evento do % do limite.
- Tudo em pastas temporárias (`HARNESS_HOME`, `HOME` e repos de teste); nada toca `C:\harness-stable` nem o `~/.claude` real.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | B054: `pre-bash` com `Tee-Object` e `format-patch -o` | clone A | `cli/src/hooks/pre-bash.ts`, `cli/test/pre-bash-s06.test.ts` (novo) | — | 15 min (S05/T03) | 14 min |
| T02 | B055 + B062: cursor do `usage` e testes de tempo estáveis | clone B | `cli/src/usage/transcript.ts`, `cli/test/usage.test.ts`, `cli/test/attach.test.ts` | — | 15 min (S05/T02) | 14 min |
| T03 | B056: `hx statusline` (% do limite e título), `setup` e `doctor` | clone C | `cli/src/commands/statusline.ts` (novo), `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md`, `cli/test/statusline.test.ts` (novo), `cli/test/setup.test.ts`, `cli/test/doctor.test.ts` | — | 25 min (S05/T04 + T01) | 24 min |
| T04 | B057 + B058: `;` no `hx status` e `\|` no `session-start` | clone D | `cli/src/commands/status.ts`, `cli/src/hooks/session-start.ts`, `cli/test/text-s06.test.ts` (novo) | — | 10 min (S05/T08) | 10 min |
| T05 | B059 + B061 (código): env limpo e aviso de caso sem fixture no `hx eval` | clone E | `cli/src/eval/run.ts`, `cli/test/eval.test.ts` | — | 15 min (S05/T02) | 14 min |
| T06 | B061 (skills): auditoria das fixtures das 8 skills e evals das alteradas | clone E | `skills/*/evals/**` | T05 | 30 min (S05, fixtures do release-report: 19 min + eval) | 29 min |
| T07 | B060: duração até a entrega do clone, revisão à parte | clone F | `cli/src/sprint/index.ts`, `cli/src/commands/task.ts`, `cli/src/commands/metrics.ts`, `cli/test/sprint.test.ts`, `commands/sprint-run.md`, `agents/tech-lead.md` | — | 20 min (S05/T06) | 19 min |
| T08 | Revisão final, backlog (B054–B062), CHANGELOG e release v0.7.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md`, `docs/sprints/S06-release.md` | T01–T07 | 20 min (S05/T11) | 19 min |

**Ondas:** 1 = T01, T02, T03, T04, T05, T07 em paralelo; 2 = T06 (depois de T05, mesmo clone); 3 = T08. O Reviewer revisa cada onda dentro das tarefas (sem linha própria); T01, T03 e T04 (hooks, setup e entrada externa) com `model: opus`.

**Paralelismo:** nenhuma tarefa da onda 1 cruza arquivo com outra. O roteador `cli/src/index.ts` (registro do `hx statusline`), `cli/dist/hx.js` e `index.md` são do Tech Lead (rebuild antes de cada commit que muda `cli/src`). Clones rodam só os próprios arquivos de teste. T06 só mexe em `skills/*/evals/**`.

**Git:** um commit por tarefa na `main`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S05 | 1 h 12 min | 53 min | 3 h 10 min | 3 h |
| S04 | 48 min | 58 min | 2 h 6 min | 3 h 41 min |

Fator: S05 relógio 74%, soma 95%; S04 relógio 121%, soma 175%. Relógio: média ~0,97. Soma: só a S05 (0,95); a S04 fica fora, inflada pela fila da revisão da onda (o que a T07 corrige).

**Total estimado:** soma de ~2 h 23 min (bruta 2 h 30 min). Relógio: ~1 h 3 min de agente (caminho T05 → T06 → T08 = 65 min × 0,97) mais a espera pelo teste de Daniel da status line, à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-21 10:54:15 (horário de Brasília) — UTC 2026-10-21T13:54:15Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `13a7fe24197940b8419a2876261a9fa7b7b0a25b9dd441f06fe516e66ecda1a0`
- **Versão do harness:** 0.6.0
