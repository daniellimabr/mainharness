# S15 — Modelos de fora direto no provedor, sem o OmniRoute no meio

- **Projeto:** main-harness
- **Versão do harness:** 0.12.0
- **Status:** aguardando aprovação

## Objetivo

Daniel descobre, com números, se algum modelo de fora (DeepSeek V4 Pro, Kimi, GLM, Gemini 4 Argon) faz o trabalho de um clone com qualidade de Sonnet, **chamando o provedor direto**, com chave e franquia próprias, fora do limite de 5 h e do semanal do Claude. A S14 provou que o gargalo era a rota grátis do OmniRoute (`cfp/` corta o pedido em 6.000 caracteres), não os modelos. Os provedores abaixo falam o formato Anthropic por endereço próprio e não têm esse corte; o `hx worker` (S14) já aceita endereço e chave por apelido.

Daniel muda a decisão da S14 "nenhum gasto" em um ponto só: **US$ 5 de crédito na DeepSeek** (já comprados, chave gerada). Nenhum outro gasto: GLM, Kimi, Argon e Sonnet pela API só entram se existir camada grátis, sem cartão nem crédito. A sprint também limpa o backlog de ajustes do `hx` (B132, B134, B135).

## Escopo

1. **`hx worker check` com sonda grande (B134).** Faz dois pedidos: uma linha (separa cota) e ~100 KB (separa tamanho). Só dá "pronto" se os dois passam; o erro diz qual falhou (429 = cota, 413/502 = tamanho).
2. **Custo do clone pela tarefa dele (B135).** Cada clone e o Reviewer entram na tarefa do `agent_id`, não rateados igualmente; o rateio só vale para o chat principal.
3. **Evento `handoff` sem duplicata (B132).** Um por arquivo, também na compactação.
4. **Contas e apelidos diretos (Tech Lead + Daniel).** Apelidos em `~/.harness/config.json` (chave fora do repo, nunca em chat ou commit):
   - `deepseek`: `https://api.deepseek.com/anthropic`, `deepseek-v4-pro`. Recomendado como primeiro: endpoint Anthropic oficial e o mais barato.
   - `glm`: `https://api.z.ai/api/anthropic`. Só se houver camada grátis.
   - `kimi`: endpoint Anthropic da Moonshot (confirmar a URL no painel deles). Só se houver camada grátis.
   - `argon`: o Gemini não fala o formato Anthropic; entra pelo OmniRoute e a API da Google não tem camada grátis para ele (limite 0). **Fica fora**, sem gasto novo; B133 segue aberto.
   - Passam no `check` novo antes de qualquer corrida.
5. **Teste cego** (mesmo método da S12 e S14: testes escondidos, nota 0–25, juiz cego). Desafios 1, 2 e 3, nos apelidos que passarem na sonda. Linha de base já medida: Sonnet e Opus nos 3 desafios (S12 e S14), sem rodar de novo. Medidas: nota, tempo, US$ pagos, falhas do provedor.
6. **Resultado, ADR 0016 e decisão de Daniel.** Onde cada externo pode executar (ou "nenhum"), com custo real por tarefa contra o Sonnet. Se algum passar, `worker (<apelido>)` entra na coluna Agente (resolve B130) e `agents/tech-lead.md` e a `sprint-plan` ganham a regra.
7. **Release v0.13.0.** Backlog, CHANGELOG, roadmap, `docs/omniroute.md` (seção "direto no provedor").

## Fora de escopo

- B109, B123, B128, B129, B077, B078: ficam para a próxima.
- GPT-6 Astra (pede ChatGPT Plus), Gemini 4 Carbon (fechado).
- Argon (API paga) e qualquer gasto além dos US$ 5 da DeepSeek.
- Mudar quem executa nos outros projetos antes do ADR 0016.

## Critérios de aceite

1. `hx worker check <apelido>` só diz "pronto" se passam o pedido de uma linha e o de ~100 KB; cota, tamanho, chave errada e provedor fora do ar dão erros diferentes e saída diferente de 0.
2. `hx metrics` de uma sprint de teste com 3 clones de duração diferente em paralelo mostra o custo de cada um na tarefa certa; só o chat principal é rateado e vem marcado.
3. A compactação grava um único `handoff` por arquivo.
4. Pelo menos o `deepseek` passa no `check` novo, ou o resultado registra por que não (conta, cota, formato).
5. O protocolo e o resultado do teste estão em `docs/experiments/` com nota, tempo e US$ por modelo e desafio. As corridas inválidas não entram.
6. ADR 0016 escrito; decisão de Daniel em `docs/decisoes-daniel.md`.
7. Release v0.13.0 publicada; B132, B133, B134, B135 marcados `feito (S15)` (B130 se o ADR aceitar um externo).
8. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01: servidor HTTP falso que responde 200 a pedido pequeno e 413/502 a pedido grande, 429 sempre, 401 e sem resposta; confere mensagem e código de saída de cada caso. Corpo de ~100 KB gerado no teste.
  - T02: log de eventos com 3 clones de durações diferentes e 1 Reviewer, mais chat principal com 2 tarefas em paralelo; custo de cada clone na sua tarefa, só o chat rateado e marcado.
  - T03: duas compactações com o mesmo arquivo de handoff geram 1 evento; arquivo novo gera outro.
- **Experimento (T05):** testes escondidos fora da pasta do concorrente, pasta temporária limpa por corrida, juiz com nomes trocados.
- **Dados de teste:** `HARNESS_HOME` e projeto em pasta temporária (helpers existentes), `rm` com `maxRetries` no `afterEach`.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | `hx worker check` com sonda pequena e grande, erro por causa (B134) | clone (sonnet) | `cli/src/commands/worker.ts`, `cli/test/worker.test.ts` | — | 40 min | 38 min |
| T02 | Custo do clone e do Reviewer pela tarefa do `agent_id` (B135) | clone (sonnet) | `cli/src/sprint/index.ts`, `cli/test/metrics-task.test.ts` | — | 30 min | 29 min |
| T03 | `handoff` sem duplicata na compactação (B132) | clone (sonnet) | `cli/src/hooks/lifecycle.ts`, `cli/test/lifecycle-handoff.test.ts` | — | 25 min | 24 min |
| T04 | Contas e apelidos diretos: Daniel cria as chaves, Tech Lead configura e roda o `check` novo (B133) | tech-lead (sonnet) + Daniel | `~/.harness/config.json` (fora do repo), `docs/omniroute.md` | T01 | 45 min | 43 min |
| T05 | Teste cego: protocolo, corridas dos apelidos que passaram, nota do juiz | tech-lead (sonnet) + trabalhadores + reviewer (sonnet) | `docs/experiments/S15-protocolo.md`, `docs/experiments/S15/` | T04 | 90 min | 86 min |
| T06 | Resultado, ADR 0016 e decisão de Daniel | tech-lead (sonnet) | `docs/experiments/S15-resultado.md`, `docs/adr/0016-*.md`, `docs/decisoes-daniel.md` | T05 | 25 min | 24 min |
| T07 | Revisão final, regra do Agente (se aceitar), backlog, CHANGELOG, roadmap e release v0.13.0 | tech-lead (sonnet) + reviewer (sonnet) | `agents/tech-lead.md`, `skills/sprint-plan/`, `docs/backlog.md`, `CHANGELOG.md`, `docs/roadmap.md` | T06 | 20 min | 19 min |

**Por que esses agentes:**

- T01 a T03 são Sonnet: mudam contrato do `hx` ou hook, com caminho de erro (casos de erro listados no handoff).
- T04 e T05 ficam com o Tech Lead: dependem de chaves de Daniel e de decisões na hora (T05 estourou na S14 por mudar de rota; a sonda do T01 evita isso).
- T06 é Sonnet: decisão de desenho (ADR).
- Nenhuma tarefa é Haiku: não há texto já decidido.

**Ondas:** onda 1 = T01, T02, T03; onda 2 = T04; onda 3 = T05; onda 4 = T06; onda 5 = T07.

**Revisão:** Reviewer **Sonnet** por onda (T01 mexe em chave e contrato). O juiz da T05 é o Reviewer Sonnet, às cegas. Resultado em `hx review pass|fail` por tarefa.

**Paralelismo:** na onda 1 nenhuma tarefa divide arquivo (T01 `worker.ts`; T02 `sprint/index.ts`; T03 `lifecycle.ts`). `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.

**Espera por Daniel (T04):**

- (a) Criar a conta e a chave da DeepSeek (US$ 5, já pago) e colar no `~/.harness/config.json` (nunca no chat). GLM e Kimi só se a conta grátis liberar o modelo; Argon fica fora.
- (b) Decidir o ADR 0016 na T06.
- (c) O teste final.
- **Custo extra fora do Claude:** no máximo os US$ 5 da DeepSeek (a corrida de Sonnet da S14 custou US$ 0,38; a do DeepSeek é uma fração). Se o crédito acabar, a corrida para; nada é recarregado sem Daniel.

**Git:** um commit por tarefa na `main`, `<tipo>(S15/TNN): <resumo>`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S12 | 2 h 48 min | 2 h 41 min | 4 h 12 min | 3 h 24 min |
| S13 | 1 h 40 min | 1 h 26 min | 4 h | 4 h 52 min |
| S14 | 2 h 21 min | 3 h 5 min | 3 h 37 min | 3 h 3 min |

**Fatores de calibração:** relógio S12 0,96, S13 0,86 e S14 1,31, média **1,04**; soma S12 0,81, S13 1,22 e S14 0,84, média **0,96**. Referência: T01 parece com a S14/T01 (12 min de trabalho, 14 de fila); T05 com a S14/T05 (2 h 23 min, estourou por trocar de rota três vezes).

**Total estimado:** soma 4 h 35 min brutas, **4 h 23 min** calibradas (× 0,96). Relógio do agente: caminho T01 → T04 → T05 → T06 → T07 = 220 min brutos, cerca de **3 h 49 min** (× 1,04), sem contar a espera por Daniel nas chaves.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-30 14:16:07 (horário de Brasília) — UTC 2026-10-30T17:16:07Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `b72be48be3cc92898b8107aa3e51f2bcd2d6ee8222e01a55e0b613be85fbf905`
- **Versão do harness:** 0.12.0
