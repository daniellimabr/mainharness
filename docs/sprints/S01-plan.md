# S01 — Evals baratos, Reviewer no Sonnet e plugins companheiros (v0.2.0)

- **Projeto:** main-harness
- **Versão do harness:** 0.1.3 (alvo: 0.2.0, comando novo)
- **Status:** aguardando aprovação
- **Execução:** em chat novo (`/sprint-run`). Última sprint antes de Daniel começar o projeto Dashboard IA; depois os pedidos virão de lá via `hx request`.

## Objetivo

Daniel recebe um harness que não estoura o limite de uso: evals de skill rodam com `hx eval` (Sonnet, 1 rodada, só o que mudou), o Reviewer roda no Sonnet na rotina, e os plugins companheiros dos projetos ficam todos na mesma versão.

## Contexto

A S00 estourou o limite de uso 3 vezes (US$ 42 medidos, fora os evals que não entram na conta). Causas: evals das skills (10 skills × 16 consultas × 2 rodadas = 320 sessões `claude -p` no Opus, mais os casos) e Reviewer no Opus. Os scripts de eval da S00 não foram versionados, e o `run_eval.py` do skill-creator não roda no Windows.

## Escopo

1. `hx eval <skill>|--changed`: runner versionado e compatível com Windows (B006).
2. Gate de release que aceita o resultado do eval conforme o que mudou.
3. Consultas de acionamento enxutas: 8 por skill (4 acionam, 4 não).
4. Reviewer no Sonnet; Opus só na revisão de segurança; limite de 2 reprovações por tarefa.
5. Plugins companheiros (main-harness, ponytail, security-guidance) atualizados pelo `hx release` e conferidos pelo `hx doctor` (B009).
6. Remoção de duplicações de código (B004).
7. Saída UTF-8 do `hx` no PowerShell 5.1 (B008).
8. ADR 0009 (inclui revisão enxuta e critério do pre-bash), seção "Como rodar evals" no `CLAUDE.md` e backlog atualizado.
9. Validação real do `hx eval` e release v0.2.0.

## Fora de escopo

B007 (frontend-design, exige mais evals), B001, B002, B003, B005 e a comunicação harness ↔ Dashboard (virá por `hx request` do Dashboard). O plugin `remember` é de escopo de usuário e fica fora da lista de companheiros.

## Decisões (ADR 0009, escrito na T07)

| Decisão | Detalhe |
|---|---|
| Evals no Sonnet | Nunca Haiku. 1 rodada por consulta. Paralelismo máximo 3, em sandbox temporário. |
| Escopo por mudança | Desde a última tag: descrição (frontmatter) mudou → só `trigger.json`; corpo mudou → só `evals.json`. Sem rodada baseline "sem skill", exceto em skill nova. Mudança só em `evals/` não dispara eval. |
| Consumo visível | `hx eval` emite eventos `usage` com tokens e US$ do JSON de saída, para o `hx usage` contar as sessões de eval. |
| Reviewer | `model: sonnet` na rotina. O Tech Lead chama com `model: opus` quando a tarefa toca superfície de segurança (hooks, pre-bash, attach, release, entrada externa). |
| Limite de reprovação | Máximo de 2 reprovações por tarefa. Na 3ª, o Reviewer para e escala ao Tech Lead, que decide com Daniel se preciso. |
| Revisão enxuta | Revisão por onda (uma revisão cobre as tarefas da onda; `hx review` continua por tarefa). Revisão de correção continua o mesmo Reviewer (SendMessage), sem abrir outro. O Reviewer não repete lint/tipos/testes que o Tech Lead já rodou com `hx run`: confere o resultado e foca em segurança, Ponytail e critérios de aceite. Na S00, ~73% do custo do Reviewer foi eval (T15). |
| pre-bash | Protege contra acidentes da IA, não contra ataque deliberado (o Claude Code tem as próprias permissões). Reprovação só quando um comando comum destrutivo passa. Na S00, a busca por desvios gerou 3 reprovações. |
| Sem Writer | Decisão de Daniel: o Tech Lead escreve os documentos (plano, ADR, PRD, Release Report, diagramas). Delegar a um modelo mais barato não compensa: abrir um agente grava ~30 mil tokens de contexto, e ler cache custa o mesmo no Opus e no Sonnet. Para ganhar tempo, o Tech Lead se copia. |
| Plugins companheiros | Lista `PLUGINS` em `cli/src/attach/setup.ts`: main-harness, ponytail, security-guidance. Hoje o Dashboard está no ponytail 5.2.0 e os outros projetos no 4.8.4. |

## Critérios de aceite

1. Rodar evals de 1 skill alterada custa no máximo 8 sessões Sonnet de acionamento ou 3 de casos.
2. As sessões de eval aparecem no `hx usage`.
3. O gate de release aceita o resultado conforme o que mudou e ignora mudanças só em `evals/`.
4. Cada `trigger.json` tem 8 consultas (4 acionam, 4 não).
5. `agents/reviewer.md` com `model: sonnet`; `tech-lead.md` e `sprint-run.md` descrevem o override para Opus e o limite de 2 reprovações.
6. `hx release` atualiza os 3 plugins em todos os projetos de `projects.json`; `hx doctor` avisa plugin faltando ou desatualizado.
7. Dashboard IA com os mesmos plugins e versões do harness; `hx doctor` lá sem avisos.
8. Acentos corretos na saída do `hx` no PowerShell 5.1.
9. Duplicações da T05 removidas, com testes passando.
10. ADR 0009, seção "Como rodar evals" e backlog (B006, B004, B008 e B009 como planejado na S01) escritos.
11. **`npm run check` com zero erros e zero avisos; `cli/dist/hx.js` rebuildado.**
12. Release v0.2.0 feito com `hx release minor`.

## Plano de testes (tdd-workflow: teste antes do código)

- **Unitários (Vitest):**
  - T01: escopo por mudança (descrição, corpo, só `evals/`, skill nova); parse do JSON de saída do `claude -p`; evento `usage`; limite de paralelismo; gate aceitando e recusando resultados (`eval.test.ts`, `release.test.ts`).
  - T04: lista `PLUGINS`; `doctor` avisa plugin faltando e desatualizado; `release` roda `plugin update` de todos (`doctor.test.ts`, `attach.test.ts`).
  - T05 e T06: os testes existentes continuam passando após a remoção das duplicações.
- **Integração:** `claude` simulado (script falso) para o `hx eval`, sem gastar sessões; repos git temporários para o escopo desde a última tag.
- **Prática (T08):** `hx eval` real em `adr` e `handoff`, conferindo tempo, número de sessões e custo no `hx usage`.
- **Prática (T09):** `hx release minor`, plugins atualizados no Dashboard IA, `hx doctor` lá sem avisos; saída com acentos no PowerShell 5.1.
- `HARNESS_HOME` redireciona `%USERPROFILE%\.harness` nos testes.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |
|---|---|---|---|---|---|
| T01 | `hx eval <skill>\|--changed` (B006): runner de evals com `claude -p --model sonnet --output-format json`, 1 rodada, paralelismo máx. 3, sandbox temporário; escopo pela mudança desde a última tag; grava `trigger-results.json`/`results.json`; emite eventos `usage`; gate de release ajustado | tech-lead (clone A) | `cli/src/eval/` (novo), `cli/src/commands/eval.ts` (novo), `cli/src/index.ts`, `cli/src/release/skills.ts`, `cli/test/eval.test.ts`, `cli/test/release.test.ts` | — | 60 min |
| T02 | Enxugar `trigger.json` de 16 para 8 consultas (4 acionam, 4 não; as mais discriminantes) | clone B | `skills/*/evals/trigger.json`, `skills/optional/*/evals/trigger.json` | — | 15 min |
| T03 | Reviewer no Sonnet; override Opus em segurança; limite de 2 reprovações; revisão por onda, re-revisão continuando o mesmo Reviewer, sem repetir lint/testes; critério do pre-bash (acidente, não ataque); **remover o Writer** (apagar o agente e passar as escritas ao Tech Lead em agentes, comandos, skill e textos) | clone C | `agents/reviewer.md`, `agents/tech-lead.md`, `agents/writer.md` (apagar), `commands/sprint-run.md`, `commands/sprint-plan.md`, `commands/release-report.md`, `skills/sprint-plan/SKILL.md`, `skills/archify/SOURCE.md`, `.claude-plugin/plugin.json`, `templates/CLAUDE.md`, `cli/src/sprint/index.ts` (texto) | — | 35 min |
| T04 | Plugins companheiros: `PLUGINS` em `setup.ts`; `hx release` atualiza todos em cada projeto; `hx doctor` avisa faltando ou desatualizado | clone D | `cli/src/attach/setup.ts`, `cli/src/commands/doctor.ts`, `cli/test/doctor.test.ts`, `cli/test/attach.test.ts` | — | 30 min |
| T05 | B004 (Ponytail): remover duplicações — wrappers de git em 4 lugares (`cli/src/release/git.ts` fica), `runTool` × `runFixed`, `ESLINT_CONFIGS` repetido | tech-lead | `cli/src/release/git.ts`, `cli/src/attach/setup.ts`, `cli/src/commands/doctor.ts`, `cli/src/commands/setup.ts`, `cli/src/lint/index.ts` e testes afetados | T01, T04 | 30 min |
| T06 | B008: saída UTF-8 do `hx` no PowerShell 5.1 | tech-lead | `bin/hx.cmd`, `cli/src/commands/setup.ts` (atalhos em `~/.harness/bin`, se necessário) | T05 | 15 min |
| T07 | ADR 0009, seção "Como rodar evals" no `CLAUDE.md`, backlog (B006, B004, B008 → planejado (S01); novo B009 plugins companheiros → planejado (S01)) | tech-lead | `docs/adr/0009-*.md`, `CLAUDE.md` (inclui tirar o Writer), `docs/backlog.md` | — | 15 min |
| T08 | Validação real do `hx eval` em `adr` e `handoff`, mais os casos de `sprint-plan` (corpo mudou na T03, exigido pelo gate): tempo, número de sessões, custo no `hx usage` | reviewer | (só leitura + resultados dos evals) | T01, T02 | 20 min |
| T09 | Revisão final + release v0.2.0 (`hx release minor`); plugins atualizados no Dashboard IA; `hx doctor` lá sem avisos | tech-lead + reviewer | `CHANGELOG.md`, `docs/sprints/S01-release.md` | T01–T08 | 20 min |

**Ondas:** 1 = T01, T02, T03, T04, T07 em paralelo; 2 = T05 → T06, e T08 em paralelo; 3 = T09.

**Paralelismo:** as tarefas paralelas não cruzam arquivos. `cli/src/index.ts` só é tocado pela T01. `setup.ts` e `doctor.ts` são da T04 na onda 1 e da T05 na onda 2.

**Git:** um commit por tarefa na `main`. Rebuildar `cli/dist/hx.js` antes de cada commit que muda `cli/src`.

**Total estimado:** ~4 h de trabalho de agentes.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-16 00:39:01 (horário de Brasília) — UTC 2026-10-16T03:39:01Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `12e77ab3f8695e3841738f9d3ed62030ef4309577f73c15315de3bbe9a9c4cef`
- **Versão do harness:** 0.1.3
