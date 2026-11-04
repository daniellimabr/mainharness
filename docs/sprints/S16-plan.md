# S16 — Harness leve × atual e o custo do Dashboard

- **Projeto:** main-harness
- **Versão do harness:** 0.13.0
- **Status:** aguardando aprovação

## Objetivo

Daniel descobre, com números, duas coisas: (1) um **harness leve** (menos plugins, hooks, CLAUDE.md e persona de clone) entrega a mesma qualidade gastando menos tokens e tempo que o atual (B137); (2) quanto **tempo e token a comunicação com o Dashboard** (eventos e hooks de observação) custa às atividades do harness. A sprint também fecha o backlog pendente de ajustes pequenos (B104, B136, B138, B083/B082, B128, B095, B084/B085/B089).

## Escopo

1. **Botão de desligar o Dashboard (medição).** `HARNESS_DASHBOARD=off` faz `emit` não gravar nada e os hooks só de observação saírem na hora; proteção (`pre-bash`, `pre-edit`, `post-edit`) continua. Serve ao experimento e, se Daniel quiser, a quem não usa o Dashboard.
2. **Medir o custo do Dashboard.** Script `scripts/overhead.mjs` que:
   - cronometra cada hook (`node cli/dist/hx.js hook <nome>` com entrada de exemplo, N=20, ligado e desligado);
   - conta do log de eventos (`~/.harness/events`, sprints S13 a S15) quantas vezes cada hook rodou e multiplica: **segundos por sprint**;
   - mede o que cada hook injeta no contexto (`additionalContext`, saídas do `hx` que o chat republica) em caracteres e tokens estimados: **tokens por sprint**;
   - mede o tamanho e a taxa de crescimento dos arquivos de eventos (disco) e achados como as 105 linhas `error` do dia 30/10 (ruído?).
3. **Experimento harness leve.** Mesma tarefa-desafio (desafios 1, 2 e 3 do `scripts/bench.mjs`, bases já fixadas), Sonnet, três perfis:
   - **A atual:** harness como está.
   - **B leve:** só o plugin do harness com `hooks.json` reduzido aos 3 de proteção + `session-start`, sem plugins companheiros (ponytail, remember, claude-code-setup, security-guidance), `CLAUDE.md` e persona `executor` enxutos, skills só as que a tarefa usa.
   - **C atual sem Dashboard:** perfil A com `HARNESS_DASHBOARD=off` (isola a comunicação com o Dashboard do resto do peso do harness).
   - Medidas por corrida: nota 0–25 do juiz cego (mesma régua da S12/S14/S15), tempo, tokens (entrada, saída, cache), US$, chamadas de ferramenta, e o **custo de abertura** (`claude -p "ok"` 3 vezes por perfil: tokens de entrada antes do primeiro trabalho).
4. **Resultado, ADR e decisão de Daniel.** O que sai do padrão (se algo), o que vira opção, quanto custa o Dashboard e se vale desligar ou enxugar (ex.: `Stop` e `error`). Nada muda no padrão sem Daniel aprovar.
5. **Backlog pequeno:** B138 (`maxWorkers=3`), B104 (`hx release`: regra documentada e passo em que Daniel roda), B136 (`pre-bash` avisa as armadilhas de comando), B083+B082 (`task phase`/`review` em tarefa reaberta), B128 (mensagem do `sprint approve` barrado), B095 (`sprint approve` substitui a seção Aprovação), B084+B085+B089 (marcas `[planejado: SNN]`/`[concluído: SNN]` no backlog e roadmap atualizado no fechamento).
6. **Release v0.14.0** (Daniel digita o `hx release` no terminal dele: o modo auto nega, ver B104).

## Fora de escopo

- `hx shot` e conferência visual (B078, B096, B123), aviso toast (B109), B077, B079, B080, B081, B088, B090 a B093, B129, CI (B029).
- Mudar o padrão dos outros projetos antes da decisão de Daniel.
- Externos (DeepSeek e outros): ficam como no ADR 0016.
- Gasto fora do Claude: nenhum (só Sonnet).

## Critérios de aceite

1. Com `HARNESS_DASHBOARD=off`: nenhum arquivo novo em `~/.harness/events`, hooks de observação saem em menos de 30 ms de trabalho próprio, hooks de proteção seguem bloqueando (testes).
2. `scripts/overhead.mjs` produz tabela por hook: ms por chamada (ligado e desligado), chamadas por sprint, segundos por sprint, tokens injetados por sprint. Resultado em `docs/experiments/S16-overhead.md`.
3. As 9 corridas (3 desafios × A, B, C) estão em `docs/experiments/S16/` com nota, tempo, tokens, US$ e custo de abertura por perfil; corrida com falha do ambiente é refeita e não entra.
4. `docs/experiments/S16-resultado.md` responde, com número: quanto o perfil leve poupa (tokens e tempo) e a que nota; quanto o Dashboard custa por sprint (segundos, tokens, % do total) e a recomendação. Decisão de Daniel em `docs/decisoes-daniel.md`.
5. `npm test` usa no máximo 3 workers; B104, B136, B083, B082, B128, B095, B084, B085, B089 cobertos por teste ou eval e marcados `feito (S16)`.
6. Skills `sprint-plan` e `release-report` alteradas passam nos evals (`hx eval --changed`).
7. Release v0.14.0 publicada por Daniel; CHANGELOG, roadmap e backlog atualizados.
8. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01: `npm test` não passa de 3 workers (confere a config).
  - T04: tarefa reaberta por `sprint feedback` aceita `task phase` e `review pass|fail` e soma a passada; `sprint approve` com plano mudado troca a seção Aprovação antiga (uma só no arquivo) e, se barrado, a mensagem diz que Daniel roda no terminal.
  - T05: `pre-bash` avisa (não bloqueia) cada armadilha da lista e não avisa comando limpo.
  - T06: com `HARNESS_DASHBOARD=off`, `emit` não grava, hooks de observação saem sem I/O e os de proteção funcionam como antes.
  - T07: o script roda contra `HARNESS_HOME` temporário com log de eventos de exemplo e devolve a conta esperada.
- **Evals (T03):** `evals/evals.json` de `sprint-plan` e `release-report` com caso que confere as marcas de backlog e a atualização do roadmap.
- **Experimento (T10):** testes escondidos fora da pasta do clone, clone temporário limpo por corrida, uma corrida por vez, juiz cego com perfis em letras sorteadas.
- **Dados de teste:** `HARNESS_HOME` e projeto em pasta temporária (helpers existentes), `rm` com `maxRetries`.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | `maxWorkers=3` no `npm test` (B138) | clone (sonnet) | `vitest.config.mts`, `package.json` | — | 15 min | 11 min |
| T02 | `hx release` negado no modo auto: regra e passo "Daniel roda" nos textos (B104) | clone (haiku) | `agents/tech-lead.md`, `commands/sprint-run.md` | — | 10 min | 8 min |
| T03 | Marcas `[planejado]`/`[concluído]` no backlog e roadmap atualizado no fechamento, com evals (B084, B085, B089) | clone (sonnet) | `skills/sprint-plan/`, `skills/release-report/` | — | 60 min | 45 min |
| T04 | Tarefa reaberta aceita `phase`/`review`; `approve` troca a Aprovação; mensagem do barrado (B083, B082, B095, B128) | clone (sonnet) | `cli/src/sprint/`, `cli/test/sprint-*.test.ts` | — | 50 min | 38 min |
| T05 | `pre-bash` avisa as armadilhas de comando (B136) | clone (sonnet) | `cli/src/hooks/pre-bash.ts`, `cli/test/pre-bash*.test.ts` | — | 25 min | 19 min |
| T06 | `HARNESS_DASHBOARD=off` (emit e hooks de observação) | clone (sonnet) | `cli/src/events/emit.ts`, `cli/src/hooks/runner.ts`, `cli/test/dashboard-off.test.ts` | — | 35 min | 26 min |
| T07 | `scripts/overhead.mjs`: ms por hook, chamadas e tokens injetados por sprint | clone (sonnet) | `scripts/overhead.mjs`, `cli/test/overhead.test.ts` | T06 | 40 min | 30 min |
| T08 | Protocolo do experimento e definição do perfil leve | tech-lead (sonnet) | `docs/experiments/S16-protocolo.md` | — | 30 min | 23 min |
| T09 | `bench.mjs --perfil atual\|leve\|sem-dashboard` e os arquivos do perfil leve | clone (sonnet) | `scripts/bench.mjs`, `scripts/perfil-leve/` | T06, T08 | 45 min | 34 min |
| T10 | Rodar overhead e as 9 corridas, medir abertura, nota do juiz cego | tech-lead (sonnet) + reviewer (sonnet) | `docs/experiments/S16/`, `docs/experiments/S16-overhead.md` | T07, T09 | 2 h | 1 h 30 min |
| T11 | Resultado, ADR 0017 e decisão de Daniel | tech-lead (sonnet) | `docs/experiments/S16-resultado.md`, `docs/adr/0017-*.md`, `docs/decisoes-daniel.md` | T10 | 35 min | 26 min |
| T12 | Revisão final, backlog, CHANGELOG, roadmap e release v0.14.0 (Daniel roda o `hx release`) | tech-lead (sonnet) + reviewer (sonnet) | `docs/backlog.md`, `CHANGELOG.md`, `docs/roadmap.md` | T11 | 25 min | 19 min |

**Por que esses agentes:**

- T01 a T07 e T09 são Sonnet: código com caminho de erro (hooks, contrato do `hx`) ou skill com evals; casos de erro entram no handoff.
- T02 é Haiku: texto já decidido (regra e passo do B104), 2 arquivos, nada sensível; o Reviewer confere escopo e codificação.
- T08, T10, T11, T12 ficam com o Tech Lead: dependem de decisão do desenho do experimento e de leitura dos números.
- Sem `worker (deepseek)`: o experimento já compara Sonnet em perfis; misturar modelo tiraria a leitura.

**Ondas:** onda 1 = T01, T02, T04, T05, T06, T08; onda 2 = T03, T07, T09; onda 3 = T10; onda 4 = T11; onda 5 = T12.

**Revisão:** Reviewer **Sonnet** por onda, `hx review pass|fail` por tarefa. O juiz da T10 é o Reviewer Sonnet, às cegas.

**Paralelismo:** nenhuma tarefa da mesma onda divide arquivo (onda 1: config de teste, 2 textos, `sprint/`, `pre-bash.ts`, `events/emit.ts`+`hooks/runner.ts`; onda 2: skills, `overhead.mjs`, `bench.mjs`+`perfil-leve/`). `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`. Para não repetir a queda de máquina da S15, a onda 1 tem no máximo 5 clones ao mesmo tempo (T08 é o Tech Lead escrevendo).

**Espera por Daniel:** (a) esta aprovação; (b) decidir o ADR 0017 na T11; (c) digitar o `hx release` no terminal na T12; (d) o teste final. **Custo extra fora do Claude:** nenhum. Custo estimado no Claude: cerca de US$ 4 a 6 (9 corridas de Sonnet de ~US$ 0,4, abertura, juiz e a sprint).

**Git:** um commit por tarefa na `main`, `<tipo>(S16/TNN): <resumo>`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S13 | 1 h 40 min | 1 h 26 min | 4 h | 4 h 52 min |
| S14 | 2 h 21 min | 3 h 5 min | 3 h 37 min | 3 h 3 min |
| S15 | 3 h 30 min | 1 h 8 min | 4 h 23 min | 1 h 2 min |

**Fatores de calibração:** relógio S13 0,86, S14 1,31, S15 0,32, média **0,83**; soma S13 1,22, S14 0,84, S15 0,24, média **0,77**. Usei **0,75** na soma (os clones da S15 terminaram bem abaixo do planejado). Referência: T10 parece com a S15/T05 (corridas de modelo, 26 min de trabalho para 1 h 26 min planejadas), mas aqui são 9 corridas em série e medidas de abertura, por isso fica em 1 h 30 min.

**Total estimado:** soma 8 h 10 min brutas, **6 h 9 min** calibradas (× 0,75). Relógio do agente: onda 1 (T04, 38 min) + onda 2 (T03, 45 min) + T10 (1 h 30 min) + T11 (26 min) + T12 (19 min), cerca de **3 h 40 min**, sem contar a espera por Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-30 16:46:51 (horário de Brasília) — UTC 2026-10-30T19:46:51Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `8b810224bfe16367b33af14a770c2cfa191545c01f6693309ccaf4f07b9df046`
- **Versão do harness:** 0.13.0
