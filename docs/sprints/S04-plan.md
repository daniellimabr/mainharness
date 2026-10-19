# S04 — Consertos e medição (v0.5.0)

- **Projeto:** main-harness
- **Versão do harness:** 0.4.0 (alvo: 0.5.0, hook novo `pre-edit`)
- **Status:** aguardando aprovação
- **Execução:** em chat novo (`/main-harness:sprint-run S04`).

## Objetivo

Destravar o Dashboard IA antes da S03 dele e medir melhor o tempo. Daniel recebe: estimativas calibradas pelo histórico, agentes que não se perdem no shell em pasta com espaço, travas que garantem as regras do `CLAUDE.md` (bundle, `harness-stable`, tipos), tempo de sprint sem pausas, sem fila de revisão e com as rodadas de ajuste medidas, e evals mais baratos.

## Contexto

O Dashboard IA estima de 2 a 7 vezes acima do real (soma real/planejada: S01 15%, S02 42%). A skill `sprint-plan` mostra o histórico, mas não aplica nenhum fator. Na S03 daqui, o eval custou 63% da sprint (7 rodadas completas) e o tempo corrido somou 3 h de pausa. Um subagente do Dashboard falhou com `cd "/c/Dashboard IA/src"`, e um `Remove-Item` legítimo foi bloqueado com `system path "C:\Dashboard`. Essa mensagem não sai do `pre-bash` do harness (provavelmente vem do Claude Code ou do `security-guidance`).

## Escopo

1. B042: `Remove-Item` em caminho com espaço dentro do repo deixa de ser bloqueado (causa primeiro).
2. B041: regra fixa de ferramentas de arquivo nos prompts e no handoff; o `pre-bash` bloqueia `cd` com `/c/...`.
3. B039 (absorve B031 e B038): estimativa calibrada pelo histórico na `sprint-plan`.
4. B035, B037, B040: tempo até a revisão separado, pausas acima de 30 min descontadas, rodadas de ajuste medidas.
5. B036: `hx eval --failed` reexecuta só o que falhou.
6. B025: `index.md` sem linhas duplicadas.
7. B023: hook `pre-edit` bloqueia edição de `cli/dist/hx.js` e de `C:\harness-stable`.
8. B024: `pre-bash` pergunta antes de `git commit` com `cli/src` no stage e bundle desatualizado.
9. B026: Stop roda typecheck quando `cli/src` mudou.
10. B027: `.claude/settings.json` libera comandos só de leitura.
10b. B043 (pedido de Daniel durante a S04): a linha Total mostra o fim previsto enquanto a sprint está aberta.
11. Release v0.5.0.

## Fora de escopo

- S05, integração com o Dashboard (com PRD antes): B034 (registro de projetos), B032 (eventos em arquivo) e B030 (validar o ciclo de pedidos).
- B033 descartado no harness: o navegador fica com cada projeto.
- Ficam abertos: B028, B029, B005.

## Decisões

| Decisão | Detalhe |
|---|---|
| B042 | Reproduzir primeiro. Se o bloqueio vier do `pre-bash`, corrigir lá. Se vier de fora (Claude Code ou `security-guidance`), não há o que mudar no `hx`: o `tech-lead.md` orienta caminho relativo (`Remove-Item tsconfig.tsbuildinfo`), o motivo vai para o backlog, e o pedido é respondido assim. |
| B041 no prompt | `tech-lead.md`, `reviewer.md` e o handoff: ler, buscar e editar só com Read, Grep, Glob, Edit e Write; terminal no Windows pelo PowerShell (`hx run ...`) sem `cd`; no Bash, sem `cd` e sem caminho `/c/...` (o cwd já é o projeto). |
| B041 no hook | `pre-bash` nega `cd` cujo alvo comece com `/c/` (ou outra letra, ou `/mnt/x/`, `/cygdrive/x/`), com a mensagem: "use caminho relativo ou as ferramentas Read/Grep/Edit; o cwd já é o projeto". `cd "C:/..."` continua permitido (é a orientação atual para pasta com espaço). |
| B039 | Sem código novo: a `sprint-plan` já roda `hx metrics` das 2 últimas sprints. Passa a calcular o fator = corrido ÷ previsto (relógio) e real ÷ planejada (soma), usar a média das duas sprints como fator padrão, mostrar a estimativa bruta e a calibrada por tarefa, e separar no total o tempo de agente da espera por Daniel (teste e ajustes). A coluna `Planejado` recebe o valor calibrado (é o que vira indicador). Sprint com pausa ou fila distorcida (ex.: S03 daqui) fica fora da média, com o motivo escrito. |
| B037 | Pausa = intervalo sem nenhum evento acima de 30 min. Sai do corrido da tarefa e da sprint; aparece à parte (`pausas: 3 h 2 min`). |
| B035 | Cada tarefa mostra o tempo até a fase `revisão` (`task phase`) e o tempo até o done. Na falta da fase, só o done, como hoje. |
| B040 | `hx sprint feedback N` abre uma rodada; a rodada termina no próximo `sprint feedback` ou no `sprint close`. A tabela de execução ganha uma linha por rodada (`Ajuste 1`, com início, fim e duração), e os indicadores mostram o tempo e o custo das rodadas. |
| B036 | `hx eval <skill> --failed` roda só os casos e as consultas de gatilho que falharam em `cases-results.json` e `trigger-results.json`, e junta o resultado aos que já passaram. O carimbo só fica válido se o hash da skill for o mesmo da rodada anterior; senão roda tudo e avisa. |
| B023 | Hook novo `PreToolUse` em `Write\|Edit\|MultiEdit` (`hx hook pre-edit`): nega `cli/dist/hx.js` ("rode npm run build") e qualquer arquivo em `C:\harness-stable`. |
| B024 | No `git commit`: se `cli/src` está no stage e o `cli/dist/hx.js` é mais antigo que o arquivo mais novo de `cli/src`, o hook pergunta ("bundle desatualizado: rode npm run build"). Só no repo do harness (onde existe `cli/dist/hx.js`). |
| B026 | Stop: se `git status` mostra `cli/src` alterado, roda `tsc --noEmit` (timeout de 60 s). Com erro, devolve as primeiras linhas para o agente corrigir. Só neste repo. |
| B027 | Rodar a skill `fewer-permission-prompts` e liberar só comandos de leitura (`npm run *`, `git status`, `git diff`, `git log`), no Bash e no PowerShell. |
| Evals | O corpo das skills `handoff` e `sprint-plan` muda: o `evals.json` de cada uma roda (ADR 0009) na T10, já com o `--failed` da T05 para repetir só o que falhar. |
| B043 | Linha **Total**, coluna Fim, com a sprint aberta: `~HH:MM (previsto)` = início + Planejado do total + pausas já descontadas. Sprint fechada: fim real. Vai na T04 (mesmo arquivo). |
| Reviewer | `model: opus` em T01, T02 e T03 (hooks). Sonnet no resto. |

## Critérios de aceite

1. Um `Remove-Item` de arquivo dentro do repo com espaço no caminho passa, ou o motivo externo está no backlog, com orientação no `tech-lead.md`.
2. `pre-bash` nega `cd /c/x`, `cd "/c/Pasta X"` e `cd /mnt/c/x`; permite `cd "C:/Pasta X"` e `cd src`.
3. `agents/tech-lead.md`, `agents/reviewer.md` e `skills/handoff/SKILL.md` têm a regra das ferramentas de arquivo.
4. `skills/sprint-plan/SKILL.md` manda calcular o fator, mostrar a estimativa bruta e a calibrada e separar agente de espera; o eval da skill passa.
5. `hx metrics` e `sprint close` descontam pausas acima de 30 min e as mostram à parte; cada tarefa com fase `revisão` mostra o tempo até a revisão; cada rodada de `sprint feedback` aparece com início, fim e duração.
6. `hx eval <skill> --failed` roda só o que falhou e mantém o carimbo quando o hash não mudou; com hash diferente, roda tudo e avisa.
7. `index.md` sem caminho repetido depois de editar um arquivo que já está nele (causa corrigida em `cli/src/repomap/`).
8. Edit/Write em `cli/dist/hx.js` ou em `C:\harness-stable\...` é negado pelo `pre-edit`.
9. `git commit` com `cli/src` no stage e bundle mais antigo faz o hook perguntar; com o bundle novo, passa.
10. O Stop com erro de tipo em `cli/src` devolve o erro; sem mudança em `cli/src`, não roda nada.
11. `.claude/settings.json` libera os comandos de leitura combinados.
12. **`npm run check` com zero erros e zero avisos; `cli/dist/hx.js` rebuildado.**
13. Release v0.5.0 com `hx release minor`; backlog com B023–B027, B031, B035–B042 como feito (S04) e B033 como descartado.

## Plano de testes (tdd-workflow: teste antes do código)

- **Unitários (Vitest):**
  - T01: `cd` com `/c/`, `/mnt/c/`, `/cygdrive/c/`, entre aspas e com espaço (nega); `C:/...` e relativo (permite); commit com bundle velho e novo (pede e passa, com `mtime` controlado em repo temporário); `Remove-Item` entre aspas com espaço dentro do repo (`cli/test/pre-bash-s04.test.ts`).
  - T02: `pre-edit` com `cli/dist/hx.js`, `C:\harness-stable\x` (barra normal e invertida, maiúsculas) e arquivo comum (`cli/test/pre-edit.test.ts`).
  - T03: Stop com `cli/src` sujo e erro de tipo (devolve o erro), limpo (não roda o `tsc`); o `tsc` é injetado/mockado (`cli/test/stop-typecheck.test.ts`).
  - T04: eventos sintéticos com pausa de 45 min e de 20 min, tarefa com e sem fase `revisão`, duas rodadas de feedback com close (`cli/test/sprint.test.ts`).
  - T05: `--failed` com 1 de 3 casos falhando roda 1 só (runner mockado); hash diferente roda tudo (`cli/test/eval.test.ts`).
  - T06: reproduzir a duplicação antes da correção (`cli/test/repomap.test.ts`).
- **Evals:** T10 roda `hx eval handoff` e `hx eval sprint-plan` reais (Sonnet, 1 rodada).
- Todos os testes usam pastas temporárias (`HARNESS_HOME` e repos de teste); nenhum toca `C:\harness-stable` nem `~/.claude`.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |
|---|---|---|---|---|---|
| T01 | B042 (causa + correção ou orientação), B041 (hook nega `cd /c/`), B024 (commit com bundle velho) no `pre-bash` | clone A | `cli/src/hooks/pre-bash.ts`, `cli/test/pre-bash-s04.test.ts` | — | 15 min |
| T02 | B023: hook `pre-edit` | clone B | `cli/src/hooks/pre-edit.ts`, `cli/src/hooks/index.ts`, `hooks/hooks.json`, `cli/test/pre-edit.test.ts` | — | 10 min |
| T03 | B026: Stop roda typecheck quando `cli/src` mudou | clone C | `cli/src/hooks/lifecycle.ts`, `cli/test/stop-typecheck.test.ts` | — | 10 min |
| T04 | B035, B037, B040, B043: tempo até a revisão, pausas, rodadas de ajuste, fim previsto | clone D | `cli/src/sprint/index.ts`, `cli/src/commands/sprint.ts`, `cli/src/commands/metrics.ts`, `cli/test/sprint.test.ts` | — | 20 min |
| T05 | B036: `hx eval --failed` | clone E | `cli/src/eval/run.ts`, `cli/src/commands/eval.ts`, `cli/test/eval.test.ts` | — | 15 min |
| T06 | B025: `index.md` sem duplicadas (causa + limpeza) | clone F | `cli/src/repomap/index.ts`, `cli/test/repomap.test.ts`, `index.md` | — | 8 min |
| T07 | B041: regra de ferramentas de arquivo nos prompts e no handoff (+ orientação do B042, se externo) | tech-lead | `agents/tech-lead.md`, `agents/reviewer.md`, `skills/handoff/SKILL.md` | T01 | 8 min |
| T08 | B039: estimativa calibrada na `sprint-plan` | clone G | `skills/sprint-plan/SKILL.md`, `templates/sprint-plan.md` | — | 10 min |
| T09 | B027: liberar comandos de leitura (`fewer-permission-prompts`) | tech-lead | `.claude/settings.json` | — | 5 min |
| T10 | Validação real: `hx eval handoff` e `hx eval sprint-plan` (com `--failed` para repetir) | reviewer | (só leitura + resultados dos evals) | T05, T07, T08 | 15 min |
| T11 | Revisão final, backlog, CHANGELOG e release v0.5.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md`, `docs/sprints/S04-release.md` | T01–T10 | 10 min |

**Ondas:** 1 = T01, T02, T03, T04, T05, T06, T08, T09 em paralelo; 2 = T07 (depois da T01, para saber a causa do B042); 3 = T10; 4 = T11.

**Paralelismo:** nenhuma tarefa da onda 1 cruza arquivo com outra. O `index.md` é da T06, e o hook `post-edit` grava nele em toda edição: a T06 corrige a causa e só limpa o arquivo no fim da onda 1, pelo Tech Lead. `cli/dist/hx.js` não é tocado pelos clones: o Tech Lead rebuilda antes de cada commit que muda `cli/src`. Clones rodam só o arquivo de teste da própria tarefa (o `global-setup` builda o bundle).

**Git:** um commit por tarefa na `main`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S02 | 55 min | 30 min | 2 h 20 min | 1 h 14 min |
| S03 | 45 min | 4 h 17 min | 1 h 50 min | 6 h 47 min |

A S03 fica fora da calibragem: ~3 h de pausa da sessão e a fila de revisão da onda inflaram o corrido (é o que B035 e B037 corrigem). Fator da S02: soma real ÷ planejada = 53%, relógio 55%. Estimativas brutas (soma 4 h 15 min) × ~0,5 = calibradas na coluna `Planejado`.

**Total estimado:** ~2 h 6 min de soma das tarefas (bruta ~4 h 15 min). Relógio: ~50 min de agente (onda 1 ~20 min, T07 ~8 min, T10 ~15 min, T11 ~10 min) mais a espera pelo teste de Daniel, à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-18 20:39:25 (horário de Brasília) — UTC 2026-10-18T23:39:25Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `22ddb7ffceb7b905fc35e66072c63cd34255f01d26ee7533b9ac029011b5e0b5`
- **Versão do harness:** 0.4.0
