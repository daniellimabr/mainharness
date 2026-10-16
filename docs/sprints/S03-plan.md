# S03 — Arrumação antes do Dashboard (v0.4.0)

- **Projeto:** main-harness
- **Versão do harness:** 0.3.0 (alvo: 0.4.0, skill opcional nova `frontend-design`)
- **Status:** aguardando aprovação
- **Execução:** em chat novo (`/sprint-run`), com o VS Code reiniciado (painel do ponytail desligado).

## Objetivo

Deixar o harness pronto para o desenvolvimento do Dashboard: o painel do ponytail fica desligado em toda máquina, a lista nativa de tarefas deixa de ser exigida onde não existe, o `sprint close` mostra o tempo real de trabalho, o `hx run` com vitest funciona pelo Bash em pasta com espaço, a skill `frontend-design` volta ao catálogo (o Dashboard é tela) e a auditoria `claude-code-setup` vira itens de backlog.

## Contexto

Retro da S02: planejado 55 min de relógio, corrido 30 min; 8 de 8 tarefas abaixo do previsto. O painel do ponytail 5.3.0 voltou mesmo com `~/.claude/.ponytail-band=off`: o ponytail procura o arquivo em `$HOME/.claude`, e no Windows `HOME` não existe. Em 2026-10-16 o Tech Lead criou `HOME=%USERPROFILE%` à mão nesta máquina (`setx`). A 1ª linha do `sprint close` da S02 disse 3 h 39 min, mas o trabalho levou 30 min (o resto foi espera pelo teste de Daniel). A lista nativa de tarefas não existe na extensão do VS Code (9 de 9 tarefas sem cumprir a instrução).

## Escopo

1. B020: `hx setup` desliga o painel do ponytail; `hx doctor` avisa.
2. B022: lista nativa de tarefas só se a ferramenta existir.
3. B021: `sprint close` mostra o tempo corrido e, à parte, a espera.
4. B019: `hx run` com vitest pelo Bash em pasta com espaço.
5. B007: `frontend-design` volta ao catálogo opcional, com evals passando.
6. B002: auditoria `claude-code-setup`; recomendações com evidência viram itens de backlog.
7. Release v0.4.0.

## Fora de escopo

B005 (bloqueado). Implementar os itens que a auditoria (B002) gerar: entram no backlog para uma sprint futura.

## Decisões

| Decisão | Detalhe |
|---|---|
| Painel do ponytail | `hx setup` grava `~/.claude/.ponytail-band` = `off` sempre (Daniel prefere desligado; quem quiser o painel liga com `/ponytail band`). No Windows, se `HOME` não estiver definido para o usuário, grava `HOME` = `USERPROFILE` com `setx` (mesmo valor que o Git usa). `hx doctor` avisa quando o flag não é `off` ou quando falta `HOME` no Windows: "painel do ponytail ligado: rode hx setup". O Task board (ledger) é orientado no aviso do doctor (desligar em `/plugin` → ponytail → Task board); o `hx` não mexe na config do plugin. |
| Lista nativa | `sprint-run` e `tech-lead`: "mantenha a lista nativa de tarefas, se a ferramenta existir nesta interface; senão a lista do `hx` basta". |
| Tempo no close | 1ª linha: `Sprint SNN fechada: X/Y tarefas em <corrido> (aguardou teste por <espera>)`. Corrido = 1º `task start` ao último `task done` (o mesmo `wall_min` do `hx metrics`). Espera = último `task done` ao `sprint close`; some quando for menor que 1 min. |
| `hx run` + vitest | Achar a causa antes de corrigir (hipótese: letra do drive `c:` × `C:` no cwd vindo do Bash). Corrigir no `hx run`, não no projeto. Se a causa estiver fora do `hx` (vitest/Bash), registrar a orientação e o motivo no backlog e manter "use o PowerShell". |
| `frontend-design` | Volta de `skills-pending/` para `skills/optional/` com `git mv`. Caso 1 falhava 3x (o plano visual não aparecia antes do código): ajustar o corpo da skill para exigir o plano visual curto na resposta antes de qualquer código; a expectativa do caso fica. Evals completos (skill nova no catálogo). |
| Auditoria (B002) | Instalar `claude-code-setup@claude-plugins-official` (só lê e recomenda), rodar no repo, e cada recomendação com evidência no repo vira linha nova no backlog (origem `roadmap`, status `aberto`). Sem evidência: descartada, citada no Release Report. |
| Reviewer | `model: opus` na T01 (grava variável de ambiente do usuário e arquivo fora do repo). Sonnet no resto. |

## Critérios de aceite

1. `hx setup` numa máquina com `HOME` ausente (Windows) grava `HOME` = `USERPROFILE` e `~/.claude/.ponytail-band` = `off`; rodar de novo não muda nada. `hx doctor` mostra o aviso quando o flag não é `off` ou falta `HOME`; tudo certo, nada.
2. `commands/sprint-run.md` e `agents/tech-lead.md` tornam a lista nativa condicional.
3. `hx sprint close` mostra o corrido das tarefas e a espera à parte, como em "9/9 tarefas em 30 min (aguardou teste por 3 h 9 min)".
4. `hx run npx vitest run cli/test/sprint.test.ts` pelo Bash em `C:\Main Harness` roda os testes (ou, se a causa for externa, o backlog registra o motivo).
5. `skills/optional/frontend-design/` existe, `skills-pending/frontend-design/` não; `hx skills` lista a skill; `hx eval frontend-design` passa (gatilho e casos).
6. Backlog com os itens da auditoria (origem `roadmap`) e B002 como feito (S03).
7. **`npm run check` com zero erros e zero avisos; `cli/dist/hx.js` rebuildado.**
8. Release v0.4.0 com `hx release minor`; backlog com B002, B007, B019–B022 como feito (S03).

## Plano de testes (tdd-workflow: teste antes do código)

- **Unitários (Vitest):**
  - T01: setup grava o flag e `HOME` só quando falta (com `HOME` e `USERPROFILE` simulados, sem chamar `setx` de verdade: o comando é injetado/mockado); doctor com flag `off`, ausente e `on`, e com/sem `HOME` (`setup.test.ts`, `doctor.test.ts`).
  - T02: close com espera > 1 min e < 1 min (`sprint.test.ts`).
  - T03: teste que reproduz o cwd com letra minúscula (`c:/...`) antes da correção (`run.test.ts`).
- **Evals:** T05 muda o corpo de uma skill que entra no catálogo; a T07 roda `hx eval frontend-design` real (Sonnet, 1 rodada).
- `HARNESS_HOME` e o diretório do Claude apontam para pastas temporárias nos testes; nenhum teste grava em `~/.claude` nem chama `setx` de verdade.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |
|---|---|---|---|---|---|
| T01 | B020: `hx setup` desliga o painel do ponytail (flag + `HOME` no Windows); `hx doctor` avisa | clone A | `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `cli/test/setup.test.ts`, `cli/test/doctor.test.ts` | — | 15 min |
| T02 | B021: `sprint close` mostra o corrido das tarefas e a espera à parte | clone B | `cli/src/commands/sprint.ts`, `cli/test/sprint.test.ts` | — | 10 min |
| T03 | B019: `hx run` com vitest pelo Bash em pasta com espaço (causa + correção) | clone C | `cli/src/commands/run.ts`, `cli/test/run.test.ts` | — | 20 min |
| T04 | B022: lista nativa de tarefas condicional | clone D | `commands/sprint-run.md`, `agents/tech-lead.md` | — | 5 min |
| T05 | B007: `frontend-design` para `skills/optional/`; corpo exige o plano visual antes do código | clone E | `skills-pending/frontend-design/` → `skills/optional/frontend-design/` | — | 20 min |
| T06 | B002: auditoria `claude-code-setup` e itens novos no backlog | tech-lead | `docs/backlog.md` | — | 15 min |
| T07 | Validação real: `hx eval frontend-design` (gatilho e casos); custo no `hx usage` | reviewer | (só leitura + resultados dos evals) | T05 | 15 min |
| T08 | Revisão final, backlog (B002, B007, B019–B022 → feito (S03)), CHANGELOG e release v0.4.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md`, `docs/sprints/S03-release.md` | T01–T07 | 10 min |

**Ondas:** 1 = T01, T02, T03, T04, T05, T06 em paralelo; 2 = T07; 3 = T08.

**Paralelismo:** as tarefas da onda 1 não cruzam arquivos. `docs/backlog.md` é da T06 na onda 1 e da T08 na onda 3. `cli/dist/hx.js` não é tocado pelos clones: o Tech Lead rebuilda antes de cada commit que muda `cli/src`. O `global-setup` dos testes builda o bundle; se dois clones rodarem a suíte ao mesmo tempo, rode só o arquivo de teste da tarefa.

**Git:** um commit por tarefa na `main`.

**Histórico (hx metrics):**

| Sprint | Planejado (relógio) | Soma das tarefas | Corrido |
|---|---|---|---|
| S01 | 4 h | 1 h 58 min | 45 min |
| S02 | 55 min | 1 h 15 min | 30 min |

**Total estimado:** ~1 h 50 min de soma das tarefas; ~45 min de relógio (onda 1 ~20 min, T07 ~15 min, T08 ~10 min). Calibrado pela S02, em que as tarefas levaram de metade a um quarto do previsto.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-16 11:06:36 (horário de Brasília) — UTC 2026-10-16T14:06:36Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `a5495daf2852a6d15874759b36c744d213492db88965c878ba5fc22fd92d74a4`
- **Versão do harness:** 0.3.0
