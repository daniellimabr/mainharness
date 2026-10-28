# S12 — Experimento: Opus × Sonnet × Gemini na mesma tarefa

- **Projeto:** main-harness
- **Versão do harness:** 0.10.1
- **Status:** aguardando aprovação

## Objetivo

Medir, com números, quando vale usar cada modelo que o harness põe para executar tarefas. A mesma tarefa-desafio é dada a **Opus**, **Sonnet** e **Gemini**, nas mesmas condições, e comparamos **qualidade, velocidade, tokens/custo, chamadas e consumo da franquia**. O resultado vira um relatório com uma proposta de ajuste da regra "quem executa" (ADR 0013). As melhores entregas viram código de verdade na `main`.

**Por quê (S11):** a T07 no Gemini levou cerca de 25 min, contra 3 a 11 min dos clones Sonnet, mas eram tarefas diferentes. Sem a mesma tarefa, não dá para separar o modelo da dificuldade (B103). Opus entra como terceiro parâmetro.

**Custo por papel (avaliação de 2026-10-28):** do acumulado de US$ 239 do `hx usage`, o chat principal custou cerca de 59%, os evals 25%, o Reviewer 13% e os clones 3%. O que encarece o chat principal é reler a conversa inteira a cada passo. Os dois projetos ainda compactam aos 250 mil (`autoCompactWindow`), embora o harness use 140 mil desde que o padrão mudou: a migração do padrão antigo em `config.ts` não chega ao `settings.json` dos projetos. A sprint passa a medir também o chat principal e o Reviewer, e a contagem do `hx usage` fica sem duplicatas para os números serem confiáveis.

## Escopo

1. **Testes estáveis antes de medir (B106).** Timeout maior no `beforeEach` do `cli/test/eval.test.ts` e `rm` com `maxRetries` em `cli/test/helpers.ts`. Falha intermitente da suíte estragaria a medida de tempo.
2. **Protocolo e executor do experimento.**
   - Condições iguais para os 3: mesmo commit de partida, mesmo handoff (texto idêntico), mesma persona (`main-harness:executor`), mesmas ferramentas, mesmo limite de 60 min, uma corrida por vez (sem disputa de máquina).
   - Cada corrida roda com `claude -p --output-format json` num **clone temporário do repo** (fora do projeto, `npm ci` antes de ligar o relógio), com `HARNESS_HOME` temporário, para não sujar a sprint nem a `main`. Sonnet e Opus pela assinatura (`--model`); Gemini pelo OmniRoute, com o mesmo ambiente do `hx worker run`.
   - Script único `scripts/bench.mjs`: prepara o clone, roda, e grava `docs/experiments/S12/<desafio>-<modelo>.json` com duração, chamadas (turnos), tokens (entrada, saída, cache), custo estimado, código de saída, número de erros 429, % da franquia do Claude antes/depois (quando disponível), linhas do diff, lint, testes de aceite e testes ocultos. Salva também o diff (`.patch`). O token do OmniRoute nunca vai para arquivo nem saída.
   - Protocolo escrito em `docs/experiments/S12-protocolo.md`.
3. **Dois desafios, de tamanhos diferentes**, ambos itens reais do backlog e dentro da regra do Gemini (até 3 arquivos, nada sensível), para os 3 modelos poderem disputar:
   - **Desafio 1, pequeno — B099:** gravar o lock do `hx worker run` antes do spawn.
   - **Desafio 2, médio — B105:** trabalhador que morre sem relatório grava um relatório de falha, e `hx worker status` avisa.
   - Para cada um: handoff, teste de aceite que vai no handoff e **testes ocultos** (casos de borda) que só o avaliador roda.
4. **Corridas e avaliação cega.** Cada desafio roda nos 3 modelos. O Reviewer (Opus) recebe os 3 diffs como A, B e C, sem saber quem fez qual, e dá nota de 0 a 5 em: correção, testes ocultos, tamanho e clareza (Ponytail), lint e tipos, segurança. O diff com maior nota vai para a `main` (empate: o mais barato).
   - **Reviewer Sonnet em paralelo:** um segundo Reviewer, em Sonnet, dá a mesma nota cega aos mesmos 3 diffs, sem ver a nota do Opus. Só a nota do Opus decide o vencedor; a do Sonnet serve para comparar (as notas batem? o Sonnet deixou passar algum problema?) e o custo de cada revisão.
5. **Relatório do experimento** (`docs/experiments/S12-resultado.md`): tabela por desafio e modelo, custo por entrega aprovada, e uma proposta de ajuste da regra "quem executa". Também traz:
   - **custo por papel** (chat principal, clones, Reviewer, evals, Gemini), das S10–S12, já com a contagem sem duplicatas;
   - **Reviewer Opus × Sonnet:** notas, problemas achados por cada um e custo, com a proposta de quando usar cada um;
   - **chat principal:** tamanho médio do contexto e custo por resposta nas sprints anteriores, como linha de base para medir a compactação aos 140 mil na S13.
   As regras só mudam depois que Daniel ler (viram ADR na próxima sprint, se ele aprovar).
6. **Backlog, CHANGELOG e release v0.10.2.** B099, B103, B105, B106, B110 e B111 viram `feito (S12)`.
7. **`hx usage` e `hx metrics` sem duplicatas (avaliação, item 12).** A soma conta cada resposta uma vez só, pelo `message_id` (hoje, se `~/.harness/usage-cache` for apagado, o consumo é contado de novo).
8. **Compactar aos 140 mil em todos os projetos.** O `autoCompactWindow` do `settings.json` de cada projeto segue o `contextLimit` efetivo do harness, inclusive quando o `config.json` ainda tem o 250000 antigo. A correção acontece na migração do projeto ao abrir um chat, e o `hx doctor` avisa se os valores divergirem. O ADR 0006 ganha uma nota com o limite atual e o motivo, que é o custo de reler o contexto a cada passo.
9. **Ajustes da auditoria de prompts (`/doctor prompt-audit`, 28/10).** Antes das corridas, para o experimento rodar com as regras certas:
   - `CLAUDE.md`: o Reviewer é "sempre em Opus (ADR 0013)", e não mais "Sonnet; Opus em segurança".
   - `agents/reviewer.md`: `model: opus` como padrão, sem depender de quem chama passar `model: opus`.
   - `agents/tech-lead.md`: sai o "se precisar, `cd "C:/Pasta Com Espaço"`", que contradiz a regra "no Bash, sem `cd`" (o `pre-bash` bloqueia).

## Fora de escopo

- Mudar a regra de modelo por papel nesta sprint (só a proposta), inclusive a do Reviewer.
- Medir o efeito da compactação aos 140 mil: a S12 grava a linha de base, e a comparação sai no Release Report da S13.
- Hooks de atenção e erro, aviso no Windows e evento `context` (B107–B109): ficam para a S13.
- Rodar cada desafio mais de uma vez por modelo (variância): fica como próximo passo se os números ficarem próximos.
- Rodada de correção depois da nota: medimos a primeira entrega.
- Transformar o `bench.mjs` em comando do `hx`: só se o experimento virar rotina.
- Outros itens do backlog (B029, B077–B096, B100, B104).
- Da auditoria: a cópia duplicada da skill `archify` em `~/.claude/skills/` (fora do repo; decisão de Daniel), a descrição da `graphify` e a linha repetida no `~/.claude/CLAUDE.md` (inofensivas).

## Critérios de aceite

1. A suíte roda 3 vezes seguidas sem falha intermitente, com clones em paralelo.
2. `node scripts/bench.mjs` com um `claude` falso grava o JSON e o `.patch` com todos os campos, e o token do OmniRoute não aparece em nenhum arquivo nem na saída.
3. Os 2 desafios têm handoff, teste de aceite e testes ocultos; os testes ocultos falham no commit de partida.
4. 6 corridas feitas (2 desafios × 3 modelos), cada uma com JSON e `.patch` em `docs/experiments/S12/`.
5. Notas cegas do Reviewer Opus e do Reviewer Sonnet registradas para os 6 diffs, com o mapa A/B/C revelado só depois.
6. Os diffs vencedores de B099 e B105 estão na `main`, com testes passando.
7. Relatório com a tabela comparativa, a proposta de regra, o custo por papel, a comparação dos Reviewers e a linha de base do chat principal.
8. O mesmo transcript lido duas vezes (cache apagado entre uma leitura e outra) dá o mesmo total no `hx usage` e no `hx metrics`.
9. Depois de abrir um chat, o Main Harness e o Dashboard IA têm `autoCompactWindow: 140000`; o `hx doctor` avisa quando o valor diverge do `contextLimit`.
10. `CLAUDE.md` e `agents/reviewer.md` dizem Opus para o Reviewer, e `agents/tech-lead.md` não libera mais `cd`.
11. Release v0.10.2 publicada.
12. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow):** T02 `cli/test/bench.test.ts` com `claude` falso (`HX_CLAUDE_BIN`): campos do JSON, `.patch`, token mascarado, limite de tempo.
- **Desafios (T03):** teste de aceite e testes ocultos escritos antes das corridas; os ocultos ficam em `docs/experiments/S12/hidden/` e o `bench.mjs` os copia para o clone só na hora de avaliar.
- **T01:** 3 rodadas seguidas da suíte com `hx run`.
- **T08:** `cli/test/usage.test.ts` e `cli/test/metrics.test.ts`: dois eventos `usage` com o mesmo `message_id` somam uma vez só.
- **T09:** `cli/test/setup.test.ts`: `settings.json` com 250000 e `config.json` com o 250000 antigo ficam com 140000 depois da migração; `cli/test/doctor.test.ts`: o aviso aparece quando os valores divergem.
- As corridas chamam o `claude` e o Gemini de verdade (é o experimento); nenhum teste automático chama.

## Tarefas

Fator da S11: soma 0,80 e relógio 1,30.

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Testes estáveis no Windows (B106) | clone (sonnet) | `cli/test/eval.test.ts`, `cli/test/helpers.ts` | — | 15 min | 12 min |
| T02 | Protocolo e `bench.mjs` | clone (opus) | `scripts/bench.mjs`, `cli/test/bench.test.ts`, `docs/experiments/S12-protocolo.md` | — | 35 min | 28 min |
| T03 | Desafios: handoffs, aceite e testes ocultos | clone (opus) | `docs/experiments/S12/desafio-*.md`, `docs/experiments/S12/hidden/*` | — | 30 min | 24 min |
| T04 | Desafio 1 (B099): 3 corridas, nota cega, vencedor na `main` | tech-lead (sonnet) + reviewer (opus) + reviewer (sonnet) | `docs/experiments/S12/d1-*`, `cli/src/commands/worker.ts`, `cli/test/worker-run.test.ts` | T01, T02, T03 | 55 min | 44 min |
| T05 | Desafio 2 (B105): 3 corridas, nota cega, vencedor na `main` | tech-lead (sonnet) + reviewer (opus) + reviewer (sonnet) | `docs/experiments/S12/d2-*`, `cli/src/commands/worker.ts`, `cli/test/worker-run.test.ts` | T04 | 65 min | 52 min |
| T06 | Relatório: experimento, custo por papel, Reviewers, linha de base do chat principal | clone (opus) | `docs/experiments/S12-resultado.md` | T05, T08 | 40 min | 32 min |
| T07 | Backlog, CHANGELOG, roadmap e release v0.10.2 | tech-lead (sonnet) | `docs/backlog.md`, `CHANGELOG.md`, `docs/roadmap.md`, `docs/adr/0006-continuacao-aos-250k.md` | T06, T09 | 15 min | 12 min |
| T08 | `hx usage` e `hx metrics` sem duplicatas (`message_id`) | clone (sonnet) | `cli/src/commands/usage.ts`, `cli/src/commands/metrics.ts`, `cli/test/usage.test.ts`, `cli/test/metrics.test.ts` | — | 20 min | 16 min |
| T09 | Compactar aos 140 mil em todos os projetos (migração + `hx doctor`) | clone (opus) | `cli/src/attach/setup.ts`, `cli/src/core/config.ts`, `cli/src/hooks/session-start.ts`, `cli/src/commands/doctor.ts`, `cli/test/setup.test.ts`, `cli/test/doctor.test.ts`, `.claude/settings.json` | — | 30 min | 24 min |
| T10 | Ajustes da auditoria de prompts (Reviewer em Opus, `cd` no `tech-lead.md`) | clone (sonnet) | `CLAUDE.md`, `agents/reviewer.md`, `agents/tech-lead.md` | — | 10 min | 8 min |

**Por que esses agentes:** T02 é Opus porque mexe com o token do OmniRoute e fecha decisões de desenho do experimento. T03 é Opus porque a qualidade dos testes ocultos decide a nota. T06 é Opus porque é análise. T09 é Opus porque muda configuração de todos os projetos e a migração que roda ao abrir um chat. T08 é Sonnet: regra simples com teste claro. T10 é Sonnet: troca de texto já decidida. As corridas das T04 e T05 rodam os 3 modelos por definição; o Tech Lead só aciona o script.

**Ondas e revisão** (Reviewer em **Opus**, `hx review pass|fail` por tarefa):

1. **Onda 1:** T01, T08 e T10 (clones Sonnet), T02, T03 e T09 (clones Opus), em paralelo. → **Revisão 1:** T01, T02, T03, T08, T09 e T10 (o Reviewer confere que os ocultos falham no commit de partida).
2. **Onda 2:** T04 → **nota cega** do Opus e do Sonnet (a do Opus é a revisão da T04, sobre o diff vencedor). Depois T05, partindo da `main` já com B099 → as duas notas cegas.
3. **Onda 3:** T06 e T07. → **Revisão final** com a release.

**Paralelismo:**

- Onda 1 sem arquivo em comum (T08 só nos comandos de consumo; T09 em setup, config, session-start, doctor e `.claude/settings.json`; T10 só no `CLAUDE.md` e em `agents/`).
- As 6 corridas são **uma por vez** (tempo comparável e um Gemini por vez). Elas acontecem em clones temporários fora do projeto, então não tocam a `main`.
- `worker.ts` é da T04 e depois da T05, que só começa depois do commit da T04.
- `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.

**Custo à parte:** o `hx metrics` da sprint mostra o custo total; o custo de cada corrida vem do JSON do `bench.mjs`, porque as corridas rodam fora do registro de eventos da sprint.

**Git:** um commit por tarefa na `main`, `<tipo>(S12/TNN): <resumo>`.

**Total estimado:** soma 5 h 15 min brutos → **4 h 12 min** calibrada (× 0,80). Relógio de agente: caminho T02 → T04 → T05 → T06 → T07 (210 min brutos) × 1,30 ≈ **4 h 33 min**, quase todo nas 6 corridas (o Gemini sozinho deve levar ~25 min por corrida). Espera por Daniel: só o teste final e a leitura do relatório.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-28 19:37:12 (horário de Brasília) — UTC 2026-10-28T22:37:12Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `57fbd930d29bdacd52ba0a4a32f054a84a9344ec5064b468efe1e3fcda511d91`
- **Versão do harness:** 0.10.1
