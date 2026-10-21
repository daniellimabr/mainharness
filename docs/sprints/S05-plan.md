# S05 — Eventos completos para o Dashboard e ciclo de pedidos fechado

- **Projeto:** main-harness
- **Versão do harness:** 0.5.0
- **Status:** aguardando aprovação

## Objetivo

O Dashboard IA recebe todos os eventos que pediu (agentes, comandos de Daniel, título do chat, consumo correto), os tempos da sprint ficam honestos (tarefa reaberta e espera por Daniel) e o projeto que fez um pedido fica sabendo quando ele foi atendido. Fecha com a release v0.6.0.

## Escopo

1. **B052** (completa B032): eventos `agent.start`/`agent.end` (hooks `SubagentStart`/`SubagentStop`, com id do agente e tarefa), título do chat no `session.start`, evento `prompt` por comando de Daniel (hook `UserPromptSubmit`, só horário e sessão, nunca o texto), `project.status` opcional (`hx status --where --next`), e pesquisa de fonte oficial para o % do limite (5 h e semanal): se existir, gravar; se não, documentar que não há. `task.phase` documentado em `docs/contracts/events.md`.
2. **B048:** typecheck do Stop só no repo do harness (mesmo arquivo do item 1).
3. **B051:** evento `usage` com o `output_tokens` final da mensagem (última linha do mesmo `message.id`), inclusive quando a resposta chega entre duas leituras.
4. **B046, B047:** `pre-bash` trata `--output=` do git e redirecionamentos (`>`, `>>`, `Out-File`, `Set-Content`) para `cli/dist/hx.js` e `C:\harness-stable` como escrita (mesma regra do `pre-edit`).
5. **B044:** `hx setup` grava a regra `autoMode.allow` do `hx` em `~/.claude/settings.json` (sem apagar o resto); `hx doctor` confere e avisa.
6. **B053:** tarefa reaberta soma as passadas na duração (`hx metrics`, tabela de execução), em vez de trocar o início.
7. **B045:** tempo esperando Daniel (do fim da vez do agente até o próximo comando dele) separado do tempo de trabalho em `hx metrics`, `sprint close` e no Release Report.
8. **B049, B050:** `sprint-plan` confere se a previsão de relógio já usa o fator real/previsto (B039, v0.5.0) e corrige o que faltar; a revisão da onda deixa de ser tarefa no plano (o Reviewer revisa dentro das tarefas; só a revisão final com release continua).
9. **B028:** `hx release` roda `claude plugin validate` antes de publicar e para se falhar.
10. **B030:** ciclo de pedidos completo. O `session-start` de um projeto mostra, uma vez, os pedidos dele que ficaram `feito (SNN)` no backlog do harness, com a versão. Validação real com o Dashboard IA depois da release.
11. **B032, B034:** já existem (eventos v1 e `projects.json` com id fixo); o Reviewer confirma e o backlog marca como feito.

## Fora de escopo

- **B005** (retomar sozinho após o limite): precisa de autorização de Daniel.
- **B029** (CI no GitHub): depende do backup remoto (roadmap 4), ainda não ativo.
- Painel/telas do Dashboard: ficam no próprio projeto.

## Critérios de aceite

1. Um clone e o Reviewer geram `agent.start` e `agent.end` com `agent_id` e tarefa; cada comando de Daniel gera um evento `prompt` sem o texto; `session.start` traz o título do chat quando o Claude Code o informa.
2. `docs/contracts/events.md` descreve todos os tipos novos e `task.phase`; `EVENT_VERSION` continua 1 (só tipos novos, nada removido).
3. O evento `usage` de uma mensagem em vários trechos tem o `output_tokens` da última linha, também quando os trechos chegam em leituras diferentes.
4. `git log --output=C:\harness-stable\x` e `echo x > cli/dist/hx.js` são tratados como escrita protegida (nega ou pergunta, igual ao `pre-edit`).
5. Depois de `hx setup`, `~/.claude/settings.json` tem a regra do `hx` em `autoMode.allow` e mantém as chaves que já existiam; sem a regra, `hx doctor` avisa.
6. Tarefa feita, reaberta e feita de novo mostra a soma das passadas (ex.: 6 + 4 = 10 min).
7. `hx metrics` mostra "Espera por Daniel" à parte do tempo de trabalho; o Release Report traz essa linha.
8. O plano gerado pela `sprint-plan` não tem linha de "revisão da onda"; os evals da skill passam.
9. `hx release` com manifesto inválido para antes de publicar.
10. No Dashboard IA, depois da v0.6.0, o chat novo mostra os pedidos atendidos (B051, B052, B053 etc.) uma vez só.
11. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (Vitest, teste antes do código):**
  - T01: hooks `SubagentStart`/`SubagentStop`/`UserPromptSubmit` com stdin sintético gravam o evento certo; o texto do prompt nunca aparece no evento; `session.start` com e sem título; Stop fora do repo do harness não roda `tsc` (`cli/test/events-s05.test.ts`).
  - T02: transcript sintético com 3 linhas do mesmo `message.id` (8, 120, 208) numa leitura e dividido em duas leituras: o evento final tem 208 e só um evento por mensagem (`cli/test/usage.test.ts`).
  - T03: `--output=`, `>`, `>>`, `Out-File`, `Set-Content` para os dois destinos (barra normal e invertida, maiúsculas, aspas); arquivo comum segue livre (`cli/test/pre-bash-s05.test.ts`).
  - T04: `settings.json` vazio, com outras chaves e já com a regra (idempotente); doctor com e sem a regra (`cli/test/setup.test.ts`, `cli/test/doctor.test.ts`).
  - T05: eventos sintéticos start→done→start→done (`cli/test/sprint.test.ts`).
  - T06: eventos `stop` e `prompt` sintéticos com esperas de 5 e 40 min (`cli/test/sprint.test.ts`, depois da T05).
  - T08: `claude plugin validate` mockado falhando para o release (`cli/test/release.test.ts`).
  - T09: backlog de teste com linhas `feito (S05)` de dois projetos: só as do projeto aparecem, e só na primeira sessão (`cli/test/session-start-requests.test.ts`).
- **Evals:** T10 roda `hx eval sprint-plan` real (Sonnet, 1 rodada, `--failed` para repetir).
- **E2E:** depois da release, Daniel abre um chat novo no Dashboard IA e confere os pedidos atendidos e os eventos novos no painel.
- Tudo em pastas temporárias (`HARNESS_HOME`, `HOME` e repos de teste); nada toca `C:\harness-stable` nem o `~/.claude` real.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | B052 + B048: eventos de agente, comando, título do chat, `project.status`, pesquisa do % de limite, contrato | clone A | `cli/src/events/schema.ts`, `cli/src/hooks/index.ts`, `cli/src/hooks/lifecycle.ts`, `cli/src/hooks/session-start.ts`, `cli/src/hooks/prompt.ts` (novo), `cli/src/commands/status.ts` (novo), `hooks/hooks.json`, `docs/contracts/events.md`, `cli/test/events-s05.test.ts` | — | 30 min (S04/T04) | 33 min |
| T02 | B051: `usage` com o `output_tokens` final | clone B | `cli/src/usage/transcript.ts`, `cli/test/usage.test.ts` | — | 15 min (S04/T05) | 17 min |
| T03 | B046, B047: `pre-bash` com `--output=` e redirecionamentos | clone C | `cli/src/hooks/pre-bash.ts`, `cli/test/pre-bash-s05.test.ts` | — | 15 min (S04/T01) | 17 min |
| T04 | B044: `hx setup` grava `autoMode.allow`; `hx doctor` confere | clone D | `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `cli/test/setup.test.ts`, `cli/test/doctor.test.ts` | — | 15 min (S04/T03) | 17 min |
| T05 | B053: tarefa reaberta soma as passadas | clone E | `cli/src/sprint/index.ts`, `cli/src/commands/task.ts`, `cli/test/sprint.test.ts` | — | 15 min (S04/T04) | 17 min |
| T06 | B045: espera por Daniel separada (`hx metrics`, `sprint close`, Release Report) | clone E | `cli/src/sprint/index.ts`, `cli/src/commands/metrics.ts`, `cli/src/commands/sprint.ts`, `skills/release-report/SKILL.md`, `templates/release-report.md`, `cli/test/sprint.test.ts` | T01, T05 | 20 min (S04/T04) | 22 min |
| T07 | B049, B050: relógio calibrado e sem tarefa de revisão da onda na `sprint-plan` | tech-lead | `skills/sprint-plan/SKILL.md`, `templates/sprint-plan.md` | — | 10 min (S04/T08) | 11 min |
| T08 | B028: `hx release` valida o manifesto | clone F | `cli/src/commands/release.ts`, `cli/test/release.test.ts` | — | 10 min (S04/T06) | 11 min |
| T09 | B030: projeto fica sabendo dos pedidos atendidos | clone A | `cli/src/hooks/session-start.ts`, `cli/test/session-start-requests.test.ts` | T01 | 15 min (S04/T02) | 17 min |
| T10 | Validação real: `hx eval sprint-plan` | reviewer | (só leitura + resultados dos evals) | T07 | 10 min (S04/T10) | 11 min |
| T11 | Revisão final, backlog (B028, B030, B032, B034, B044–B053), CHANGELOG e release v0.6.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md`, `docs/sprints/S05-release.md` | T01–T10 | 15 min (S04/T11) | 17 min |

**Ondas:** 1 = T01, T02, T03, T04, T05, T07, T08 em paralelo; 2 = T06 (depois de T01 e T05) e T09 (depois de T01), T10 (depois de T07); 3 = T11.

**Paralelismo:** nenhuma tarefa da onda 1 cruza arquivo com outra. T05 e T06 dividem `cli/src/sprint/index.ts` e `cli/test/sprint.test.ts`, por isso rodam em sequência no mesmo clone. T01 e T09 dividem `session-start.ts`, também em sequência. `cli/dist/hx.js` e `index.md` são do Tech Lead (rebuild antes de cada commit que muda `cli/src`). Clones rodam só o próprio arquivo de teste. O Reviewer revisa cada onda; T01, T03, T04 e T09 (hooks e entrada externa) com `model: opus`.

**Git:** um commit por tarefa na `main`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S03 | 45 min | 4 h 17 min | 1 h 50 min | 6 h 47 min |
| S04 | 48 min | 58 min | 2 h 6 min | 3 h 41 min |
| S02 | 55 min | 30 min | 2 h 20 min | 1 h 14 min |

Fator: S04 relógio 121%, soma 175% (inflada pela fila da revisão da onda); S02 relógio 55%, soma 53%. Média: relógio ~0,9, soma ~1,1. A S03 fica fora (cerca de 3 h de pausa da sessão), substituída pela S02.

**Total estimado:** soma de ~3 h 10 min (bruta ~2 h 50 min). Relógio: ~1 h 5 min de agente (caminho T01 → T06 → T11 ≈ 72 min × 0,9) mais a espera pelo teste de Daniel no Dashboard, à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-21 08:10:54 (horário de Brasília) — UTC 2026-10-21T11:10:54Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `0d16d04a1759813e709e1172af5f863aae43c9d7f7b76e24435d17ece54ad8b9`
- **Versão do harness:** 0.5.0
