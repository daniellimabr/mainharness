# S02 — Sprint mais clara e mais segura (v0.3.0)

- **Projeto:** main-harness
- **Versão do harness:** 0.2.1 (alvo: 0.3.0, comando novo `hx task phase`)
- **Status:** aguardando aprovação
- **Execução:** em chat novo (`/sprint-run`).

## Objetivo

Daniel acompanha a sprint sem esforço: cada mensagem diz de qual tarefa é, a lista mostra a fase da tarefa em andamento, o `hx metrics` separa a soma das tarefas do tempo de relógio e o plano estima pelo histórico. O `hx` deixa de gravar fora do lugar com `HARNESS_HOME` inválido, o Bash em pasta com espaço deixa de confundir, e os casos de eval passam a testar o comportamento certo.

## Contexto

Retro da S01: planejado 4 h, soma das tarefas 1 h 58 min, relógio 45 min (8 de 9 tarefas abaixo do previsto). Uma variável vazia virou `HARNESS_HOME='\.hh'` e o `hx` gravou em `C:\`. O Bash do Claude Code imprime `claude-XXXX-cwd: No such file or directory` e "Exit code 1" em todo comando nas pastas `C:\Main Harness` e `C:\Dashboard IA`, embora o comando rode certo. A T08 da S01 reprovou 2 vezes por casos de eval ambíguos.

## Escopo

1. B017: `hx` recusa `HARNESS_HOME` relativo ou na raiz do disco.
2. B011: orientação para o Bash em pasta com espaço e aviso no `hx doctor`.
3. B016: mensagens ao Daniel começam com `[TNN] Título:`.
4. B018: tempo corrido no total do `hx metrics` e do `sprint close`.
5. B015: `hx task phase TNN <fase>` e a fase na linha 🔄 da lista.
6. B014: `sprint-plan` estima pelo histórico.
7. B010 + B012 + B013: casos de eval reescritos com uma regra única.
8. Validação real dos evals e release v0.3.0.

## Fora de escopo

B002 (auditoria `claude-code-setup`, fica para a S03), B005 (bloqueado) e B007 (frontend-design).

## Decisões

| Decisão | Detalhe |
|---|---|
| `HARNESS_HOME` | Vazio → padrão `~/.harness`. Definido, mas relativo ou igual à raiz de um disco (`C:\`, `/`) → erro claro e nada gravado. A checagem fica em `harnessHome()` (`core/paths.ts`), que todos os comandos usam. |
| Pasta com espaço | Não mexemos nas pastas (sem atalho/junction). O agente: sabe que a linha `claude-XXXX-cwd` e o "Exit code 1" que vem com ela são do Claude Code e lê a saída real; não faz `cd` no início (o Bash já abre no projeto); usa `cd "C:/Pasta Com Espaço"` quando precisar; prefere o PowerShell quando o Bash não for necessário. O `hx doctor` avisa quando o caminho do projeto tem espaço e mostra essa orientação. |
| Mensagens | Durante a sprint, toda mensagem do Tech Lead ao Daniel começa com `[TNN] Título curto:`, seguida do que está fazendo e, quando ajudar, do porquê em poucas palavras. Mensagens fora de tarefa (abertura, onda, entrega) usam `[S02]`. |
| Fase da tarefa | Fases fixas: `testes`, `código`, `revisão`, `commit`. `hx task phase TNN <fase>` grava a fase no estado; a lista mostra a fase só na linha 🔄. Sem subtarefas numeradas. `task done` limpa a fase. |
| Tempo corrido | Do início da 1ª tarefa ao fim da última. Total: `planejado · soma · corrido`. |
| Estimativa | A `sprint-plan` roda `hx metrics` das 2 últimas sprints, mostra uma tabela planejado × soma × corrido e estima cada tarefa pela parecida no histórico. |
| Regra dos casos de eval | O prompt do caso traz as **decisões do produto** (o quê), para a skill escrever em vez de perguntar, mas **nunca a ação que o teste confere** (como "edite o plano agora"). Um caso separado, com pedido vago, espera perguntas antes do plano. A regra fica no `CLAUDE.md` e na skill-creator do repo. |
| Reviewer | `model: opus` na T01 (entrada externa: variável de ambiente que decide onde gravar). Sonnet no resto. |

## Critérios de aceite

1. `HARNESS_HOME=\.hh hx sprint approve S01` e `HARNESS_HOME=C:\ hx ...` falham com erro claro e não criam nada; `HARNESS_HOME` vazio usa `~/.harness`.
2. `hx doctor` em pasta com espaço mostra o aviso com a orientação; em pasta sem espaço, nada.
3. `agents/tech-lead.md` e `commands/sprint-run.md` trazem a regra `[TNN] Título:` e a orientação do Bash.
4. `hx metrics` e `hx sprint close` mostram `planejado · soma · corrido` no total.
5. `hx task phase T05 revisão` faz a linha 🔄 da T05 mostrar `revisão`; fase inválida dá erro; `task done` limpa a fase; `sprint-run` manda chamar o comando a cada troca de fase.
6. A `sprint-plan` mostra planejado × real das sprints anteriores e usa o histórico na estimativa.
7. Casos da `sprint-plan`: o caso 3 não diz "edite o plano agora" e há um caso 4 vago que espera perguntas. Casos de `adr` e `handoff` têm as fixtures que pressupõem.
8. `hx eval sprint-plan`, `hx eval adr` e `hx eval handoff` passam (casos).
9. **`npm run check` com zero erros e zero avisos; `cli/dist/hx.js` rebuildado.**
10. Release v0.3.0 com `hx release minor`; backlog com B010–B018 como feito (S02).

## Plano de testes (tdd-workflow: teste antes do código)

- **Unitários (Vitest):**
  - T01: `harnessHome()` com vazio, relativo, `\.hh`, `C:\`, `/` e caminho absoluto válido (`paths.test.ts`, novo).
  - T02: `doctor` com caminho de projeto com e sem espaço (`doctor.test.ts`).
  - T04: total com tarefas paralelas (soma > corrido) e sequenciais (`sprint.test.ts` ou o teste de metrics existente).
  - T05: `task phase` grava e limpa a fase, recusa fase inválida e tarefa fora de andamento; a lista mostra a fase só no 🔄.
- **Evals:** T06 e T07 mudam o corpo/casos de skills; a T08 roda `hx eval` real (Sonnet, 1 rodada).
- `HARNESS_HOME` aponta para pasta temporária absoluta nos testes (e agora o código garante isso).

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |
|---|---|---|---|---|---|
| T01 | B017: `harnessHome()` recusa `HARNESS_HOME` relativo ou na raiz do disco, com erro claro | clone A | `cli/src/core/paths.ts`, `cli/test/paths.test.ts` (novo) | — | 15 min |
| T02 | B011 (código): `hx doctor` avisa projeto em pasta com espaço e mostra a orientação | clone B | `cli/src/commands/doctor.ts`, `cli/test/doctor.test.ts` | — | 15 min |
| T03 | B016 + B011 (texto): regra `[TNN] Título:` nas mensagens e orientação do Bash em pasta com espaço | clone C | `agents/tech-lead.md`, `commands/sprint-run.md`, `templates/CLAUDE.md` | — | 10 min |
| T04 | B018: tempo corrido no total do `hx metrics` e do `sprint close` | clone D | `cli/src/sprint/index.ts`, `cli/src/commands/metrics.ts`, testes de sprint/metrics | — | 15 min |
| T05 | B015: `hx task phase TNN <fase>`; fase na linha 🔄; `sprint-run` chama o comando a cada fase | tech-lead | `cli/src/commands/task.ts`, `cli/src/core/state.ts`, `cli/src/sprint/index.ts`, `commands/sprint-run.md`, `cli/test/task.test.ts` | T03, T04 | 25 min |
| T06 | B014: `sprint-plan` mostra planejado × real das sprints anteriores e estima pelo histórico | clone E | `skills/sprint-plan/SKILL.md` | T04 | 10 min |
| T07 | B010 + B012 + B013: regra dos casos de eval; caso 3 da `sprint-plan` sem a ação; caso 4 vago; fixtures de `adr` e `handoff` | clone F | `skills/sprint-plan/evals/`, `skills/adr/evals/`, `skills/handoff/evals/`, `.claude/skills/skill-creator/SKILL.md`, `CLAUDE.md` | — | 20 min |
| T08 | Validação real: `hx eval sprint-plan`, `adr`, `handoff` (casos); tempo, sessões e custo no `hx usage` | reviewer | (só leitura + resultados dos evals) | T06, T07 | 15 min |
| T09 | Revisão final, backlog (B010–B018 → feito (S02)), CHANGELOG e release v0.3.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md`, `docs/sprints/S02-release.md` | T01–T08 | 15 min |

**Ondas:** 1 = T01, T02, T03, T04, T07 em paralelo; 2 = T05 e T06 em paralelo; 3 = T08; 4 = T09.

**Paralelismo:** as tarefas paralelas não cruzam arquivos. `commands/sprint-run.md` é da T03 na onda 1 e da T05 na onda 2; `cli/src/sprint/index.ts` é da T04 na onda 1 e da T05 na onda 2. `SKILL.md` da `sprint-plan` (T06) e a pasta `evals/` dela (T07) são arquivos diferentes.

**Git:** um commit por tarefa na `main`. Rebuildar `cli/dist/hx.js` antes de cada commit que muda `cli/src`.

**Total estimado:** ~2 h 20 min de soma das tarefas; ~1 h de relógio com o paralelismo (calibrado pela S01: 8 de 9 tarefas levaram cerca de metade do previsto).

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-16 02:29:39 (horário de Brasília) — UTC 2026-10-16T05:29:39Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `a3245b2391d7b454f446ff2585c3ec531c573c1ee05d2291473440e3a00b07d0`
- **Versão do harness:** 0.2.1
