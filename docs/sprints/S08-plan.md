# S08 — Lições da S07: juiz do eval, CHANGELOG, release no modo auto e ondas paralelas

- **Projeto:** main-harness
- **Versão do harness:** 0.8.0
- **Status:** aguardando aprovação

## Objetivo

Fechar as quatro melhorias que a retrospectiva da S07 pediu. O `hx eval` deixa de contar falha quando só o juiz não respondeu. O `hx release` avisa commit sem prefixo convencional antes do CHANGELOG, e os commits de tarefa passam a sair com prefixo. O Tech Lead consegue rodar o `hx release` no modo auto quando Daniel pede. Apagar um módulo numa onda paralela não quebra mais os testes dos outros clones. Fecha com a release v0.8.1.

## Escopo

1. **B070:** quando o juiz não devolve JSON, ou deixa caso sem veredito, o `hx eval` chama o juiz **mais uma vez**, só para esses casos, sem rodar de novo a sessão do caso. Só depois disso conta "sem veredito do juiz".
2. **B071:** o `hx release` lista os commits desde a última tag que não começam com `feat`, `fix`, `docs`, `chore`, `refactor` ou `test` (com ou sem escopo, ex.: `feat(S08/T01):`), como aviso, antes de gerar o CHANGELOG. Não bloqueia: o histórico não é reescrito.
3. **B071 (prevenção):** o commit de tarefa sai como `<tipo>(SNN/TNN): <resumo>` (`commands/sprint-run.md` e `agents/tech-lead.md`).
4. **B072:** a regra do modo auto que o `hx setup` grava passa a liberar `hx release` e `hx rollback` **só quando Daniel pediu na conversa**. O `hx setup` troca a regra antiga pela nova (mesmo prefixo), e o `hx doctor` avisa quem ainda tem a antiga.
5. **B069:** tarefa que apaga módulo: o Tech Lead tira o import do roteador (`cli/src/index.ts`) e rebuilda **na abertura da onda**, antes de chamar os clones (`commands/sprint-run.md`). Sem mudança de código: o `globalSetup` continua buildando o bundle inteiro, para os testes de integração nunca rodarem com bundle velho.

## Fora de escopo

- **B029** (CI no GitHub): depende do backup remoto (roadmap 4).
- Bloquear commit sem prefixo no `pre-bash`: o aviso da release e a regra do commit de tarefa bastam por ora.

## Critérios de aceite

1. Juiz falso que responde sem JSON na 1ª chamada e com veredito na 2ª: o caso sai com o veredito da 2ª, e a sessão do caso roda uma vez só. Juiz que falha as duas vezes: "sem veredito do juiz", como hoje.
2. Repo de teste com commits `feat: a`, `S07/T01: b` e `fix(x): c` desde a tag: o `hx release` mostra o aviso com `S07/T01: b` e segue com a release.
3. `hx setup` com a regra antiga no `settings.json` troca pela nova, sem duplicar. A nova cita `hx release` e `hx rollback` só com pedido explícito de Daniel. `hx doctor` avisa com a regra antiga.
4. `commands/sprint-run.md` traz o formato do commit de tarefa e o passo do roteador na abertura da onda; `agents/tech-lead.md` traz o formato do commit.
5. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01 (`cli/test/eval.test.ts`): juiz falso com 1ª resposta sem JSON e 2ª válida; juiz que falha duas vezes; juiz com um caso faltando (repete só esse).
  - T02 (`cli/test/release.test.ts`): aviso com o commit sem prefixo; sem aviso quando todos têm prefixo.
  - T03 (`cli/test/setup.test.ts`, `cli/test/doctor.test.ts`): troca da regra antiga, sem duplicar; doctor avisa a regra antiga.
- **E2E:** na T05, a release v0.8.1 roda no modo auto depois do pedido de Daniel, sem negação, e mostra o aviso vazio (os commits da S08 já saem com prefixo).
- Tudo em pastas temporárias (`HARNESS_HOME`, `HOME`). Nenhum teste chama o `claude` de verdade.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | B070: `hx eval` repete só o juiz sem veredito | clone A | `cli/src/eval/run.ts`, `cli/test/eval.test.ts` | — | 20 min (S06/T05 parecida) | 9 min |
| T02 | B071: `hx release` avisa commit sem prefixo convencional | clone B | `cli/src/commands/release.ts`, `cli/test/release.test.ts` | — | 15 min | 7 min |
| T03 | B072: regra do modo auto libera `hx release`/`rollback` a pedido de Daniel | clone C | `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `cli/test/setup.test.ts`, `cli/test/doctor.test.ts` | — | 15 min (S07/T02) | 7 min |
| T04 | B069 + B071 (prevenção): roteador na abertura da onda e formato do commit de tarefa | tech-lead | `commands/sprint-run.md`, `agents/tech-lead.md` | — | 10 min | 5 min |
| T05 | Backlog (B069–B072), CHANGELOG e release v0.8.1 (`hx release patch`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md` | T01–T04 | 15 min (S07/T06: 12 min) | 7 min |

**Ondas:**

1. T01, T02 e T03 em clones; T04 com o Tech Lead ao mesmo tempo.
2. T05. Daniel precisa pedir a release na conversa (é o teste do B072); o `hx setup` roda antes, para gravar a regra nova.

O Reviewer revisa a onda 1 dentro das tarefas, sem linha própria. T03 (regra de permissão do modo auto) usa `model: opus`.

**Paralelismo:** nenhuma tarefa da onda 1 cruza arquivo com outra. `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`. Nenhuma tarefa apaga módulo.

**Git:** um commit por tarefa na `main`, já no formato `<tipo>(S08/TNN): <resumo>`.

**Histórico (hx metrics, soma até a entrega):**

| Sprint | Previsto | Corrido | Soma bruta | Soma real |
|---|---|---|---|---|
| S07 | 36 min | 52 min | 2 h 20 min | 1 h 13 min |
| S06 | 1 h 2 min | 27 min | 2 h 23 min | 51 min |
| S05 | 1 h 12 min | 53 min | 3 h 10 min | 1 h 38 min |

Fator, só das sprints com fase `revisão`:

- **soma:** S07 0,52, S06 0,36 e S05 0,52, média **0,47**;
- **relógio:** S07 0,65, S06 0,44 e S05 0,74, média **0,61**.

**Total estimado:**

- **Soma:** ~35 min (bruta 1 h 15 min × 0,47).
- **Relógio:** ~21 min de agente. É o caminho T01 → T05 (35 min brutos) × 0,61.
- O pedido de release de Daniel e o teste dele ficam à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-21 19:00:10 (horário de Brasília) — UTC 2026-10-21T22:00:10Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `e82847a54965c376c1b0ded8e1c6484b522b2a7746302aaebb28d2a2d5516775`
- **Versão do harness:** 0.8.0
