# S14 — Modelos externos pelo OmniRoute, com o Claude como juiz

- **Projeto:** main-harness
- **Versão do harness:** 0.11.0
- **Status:** aguardando aprovação

## Objetivo

Daniel descobre, com números, se algum modelo de fora (DeepSeek V4 Pro, Gemini 4 Argon pela API, Kimi K3 ou GLM-5.3) faz o trabalho pesado com qualidade de Sonnet. Se fizer, ele passa a gastar menos do limite de 5 h e do semanal do Claude. Para isso a sprint traz de volta um trabalhador externo genérico, uma trava contra arquivo com acento quebrado e o custo por tarefa confiável. Ela fecha com um teste cego contra Sonnet e Opus e com a decisão sobre o Google AI Pro (decisões em `docs/decisoes-daniel.md`, S14).

## Escopo

1. **Trabalhador externo genérico.** Volta o `hx worker`, agora para qualquer modelo que fale o formato Anthropic: pelo OmniRoute ou direto, como o `api.deepseek.com/anthropic`.
   - Comandos: `hx worker run TNN <handoff> --model <apelido>` e `hx worker check <apelido>`.
   - O `check` faz uma chamada curta de verdade ao modelo (resolve B100).
   - Os apelidos (endereço, modelo, preço por milhão de tokens) ficam em `~/.harness/config.json` (`workers`). A chave fica nesse mesmo arquivo, fora do repo.
   - As variáveis de ambiente valem só no processo filho. Nada grava em `~/.claude/settings.json`.
   - O consumo do trabalhador entra em `usage`, com modelo e tarefa.
2. **Trava de codificação.** O `post-edit` acusa BOM e texto quebrado (`Ã§`, `Ã£`, `â€`) no arquivo editado, porque lint e prettier não pegam isso. Foi a falha do Gemini na S12.
3. **Custo por tarefa confiável (B126, B127, B131).** O `hx metrics` mostra, por tarefa, US$ e chamadas, de três fontes:
   - clones e Reviewer: o `agent_id` é ligado ao `TNN` do `agent.start`;
   - trabalhadores externos;
   - chat principal: com uma tarefa em andamento, vai inteiro para ela; com várias em paralelo, é rateado igualmente, e o rateio é marcado como tal.
   - "sem-tarefa" fica só para o que acontece fora de tarefa.
4. **Guia de configuração (`docs/omniroute.md`).** Como pôr no OmniRoute (ou direto) cada candidato: DeepSeek, Gemini API (AI Studio), Kimi e GLM. Inclui o preço de cada um e como conferir com `hx worker check`. Daniel cria as chaves (US$ 5 a 10 de crédito por provedor bastam).
5. **Teste cego (`docs/experiments/S14-protocolo.md`).** Mesmo método da S12: desafios com testes escondidos, nota de 0 a 25 e juiz que não sabe o modelo.
   - Desafios: os 2 da S12 mais 1 novo, com texto em português e caminho de erro, para pegar acento e borda.
   - Concorrentes: DeepSeek V4 Pro, Gemini 4 Argon, Kimi K3 ou GLM-5.3 (o que estiver no OmniRoute).
   - Linha de base: Sonnet 5.5 e Opus 5.5 vêm da S12 nos desafios 1 e 2 e rodam só o desafio 3, para economizar.
   - Juiz: Reviewer Sonnet, às cegas. Na S12 ele deu o mesmo ranking que o Opus, pela metade do custo.
   - Medidas: nota, tempo, US$ e quanto do limite do Claude cada um gastou (zero para os externos, fora o juiz).
6. **Resultado e decisão.** O `docs/experiments/S14-resultado.md` traz o ranking. Um ADR 0015 propõe onde cada externo pode executar (ou "nenhum", se ninguém chegar perto do Sonnet). Daniel decide o ADR e o Google AI Pro com esses números, e as duas decisões vão para `docs/decisoes-daniel.md`.
7. **Release v0.12.0** (minor: volta um comando). Backlog, CHANGELOG e roadmap.
   - Se o ADR 0015 for aceito, o `tech-lead.md` e o `sprint-plan` aceitam `worker (<apelido>)` na coluna Agente, o que resolve B130 nesse caso.
   - Se não for, só a release.

## Fora de escopo

- Ajustes rápidos do inbox (B128, B130 fora do caso acima, B132), aviso no Windows (B109) e `hx shot` (B123). Ficam para a próxima sprint, por decisão de Daniel.
- GPT-6 Astra: pede ChatGPT Plus (descartado).
- Gemini 4 Carbon: não está aberto ao público.
- Assinar o Google AI Pro antes do teste.
- Mudar quem executa nos outros projetos durante a sprint: só depois do ADR 0015.

## Critérios de aceite

1. `hx worker check <apelido>` responde "pronto" só quando o modelo responde a uma chamada de verdade. Chave errada ou serviço fora do ar dão um erro claro e código de saída diferente de 0.
2. `hx worker run` roda um handoff num modelo externo, grava `agent.start`, `usage` e `agent.stop` com o modelo e a tarefa, e não muda `~/.claude/settings.json` (há teste para isso).
3. Editar um arquivo com BOM ou com `Ã§` faz o `post-edit` acusar o problema. Arquivo em UTF-8 limpo não gera aviso.
4. `hx metrics` de uma sprint de teste com clones, Reviewer, trabalhador e duas tarefas em paralelo mostra US$ e chamadas por tarefa, marca o rateio e deixa "sem-tarefa" só fora de tarefa.
5. O guia `docs/omniroute.md` cobre os quatro provedores, e cada candidato configurado passa no `hx worker check`.
6. O protocolo e o resultado do teste cego estão em `docs/experiments/`, com nota, tempo e US$ por modelo e desafio.
7. O ADR 0015 está escrito, e as decisões de Daniel (ADR e Google AI Pro) estão em `docs/decisoes-daniel.md`.
8. Release v0.12.0 publicada; B100, B116, B126, B127 e B131 marcados como `feito (S14)` (e B130, se o ADR 0015 for aceito).
9. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01:
    - Config de exemplo em `HARNESS_HOME` temporário. O `check` usa um servidor HTTP local falso que responde 200, 401 ou não responde, e cobre os três casos.
    - O `run` usa um `claude` falso (o shim dos testes) e confere as variáveis de ambiente do filho e os eventos gravados.
    - `settings.json` com o mesmo hash antes e depois.
  - T02: arquivos com BOM, com `Ã§` e `â€™` e em UTF-8 limpo → aviso só nos dois primeiros.
  - T03: log de eventos de exemplo com duas tarefas em paralelo, dois clones, um Reviewer e um trabalhador → US$ e chamadas certos por tarefa, rateio marcado.
- **Experimento (T05):** os testes escondidos ficam fora da pasta do concorrente. Cada corrida acontece numa pasta temporária limpa, e o juiz recebe as entregas com nomes trocados.
- **Dados de teste:** `HARNESS_HOME` e projeto em pasta temporária (helpers existentes), com limpeza no `afterEach` (`rm` com `maxRetries`).

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Trabalhador externo genérico: `hx worker run\|check`, apelidos na config, consumo em `usage` (B100) | clone (opus) | `cli/src/commands/worker.ts`, `cli/src/core/config.ts`, `cli/src/events/schema.ts`, `cli/test/worker.test.ts` | — | 45 min | 42 min |
| T02 | Trava de codificação no `post-edit` (BOM e texto quebrado) | clone (opus) | `cli/src/hooks/post-edit.ts`, `cli/test/post-edit-encoding.test.ts` | — | 20 min | 19 min |
| T03 | Custo e chamadas por tarefa: clones, Reviewer, trabalhador e rateio do chat (B126, B127, B131, B116) | clone (opus) | `cli/src/sprint/index.ts`, `cli/test/metrics-task.test.ts` | — | 40 min | 38 min |
| T04 | Guia `docs/omniroute.md`: DeepSeek, Gemini API, Kimi e GLM, com preço e conferência | clone (sonnet) | `docs/omniroute.md` | — | 20 min | 19 min |
| T05 | Teste cego: protocolo, desafio 3, corridas dos 3 externos + linha de base, nota do juiz | tech-lead (sonnet) + trabalhadores + reviewer (sonnet) | `docs/experiments/S14-protocolo.md`, `docs/experiments/S14/` | T01, T02, T03, T04 | 60 min | 56 min |
| T06 | Resultado, ADR 0015 e decisões de Daniel (ADR e Google AI Pro) | tech-lead (opus) | `docs/experiments/S14-resultado.md`, `docs/adr/0015-*.md`, `docs/decisoes-daniel.md` | T05 | 25 min | 24 min |
| T07 | Revisão final, regra do Agente (se o ADR 0015 for aceito), backlog, CHANGELOG, roadmap e release v0.12.0 | tech-lead (sonnet) + reviewer (opus) | `agents/tech-lead.md`, `skills/sprint-plan/`, `docs/backlog.md`, `CHANGELOG.md`, `docs/roadmap.md` | T06 | 20 min | 19 min |

**Por que esses agentes:**

- T01 é Opus: muda um contrato do `hx` (comando, config, eventos), lida com chave e processo filho e tem caminho de erro.
- T02 é Opus: lógica nova em hook.
- T03 é Opus: muda o contrato do `sprint.metrics`, e a atribuição usa dado lido do log de eventos.
- T04 é Sonnet, não Haiku: o texto do guia ainda não está decidido, porque depende do que cada provedor oferece hoje.
- T05: o Tech Lead orquestra. Os concorrentes rodam como trabalhadores e o juiz é o Reviewer Sonnet às cegas, como na S12.
- T06 é Opus: é uma decisão de desenho (ADR).

**Ondas:** onda 1 = T01, T02, T03, T04; onda 2 = T05; onda 3 = T06; onda 4 = T07.

**Revisão:**

- Onda 1: Reviewer **Opus** (T01 tem chave e contrato do `hx`, T02 é hook).
- T05: o juiz do teste é o próprio Reviewer Sonnet.
- T06 e T07: Reviewer **Opus** (decisão e revisão final).
- O resultado vai para o `hx review pass|fail` de cada tarefa.

**Paralelismo:**

- Na onda 1, nenhuma tarefa divide arquivo:
  - T01: `worker.ts`, `config.ts`, `schema.ts`;
  - T02: `post-edit.ts`;
  - T03: `sprint/index.ts`;
  - T04: só `docs/omniroute.md`.
- T03 lê os eventos do trabalhador pelo formato combinado neste plano: `agent.start` com `agent_type: "worker"`, `model` e `task`, e `usage` com `agent_id`. Não precisa esperar o código da T01.
- `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.

**Espera por Daniel:**

- (a) Criar as chaves e pôr crédito nos provedores durante a onda 1. O guia da T04 sai primeiro para isso.
- (b) Decidir o ADR 0015 e o Google AI Pro na T06.
- (c) O teste final.

**Git:** um commit por tarefa na `main`, no formato `<tipo>(S14/TNN): <resumo>`.

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S11 | 1 h 12 min | 1 h 34 min | 2 h 45 min | 2 h 12 min |
| S12 | 2 h 48 min | 2 h 41 min | 4 h 12 min | 3 h 24 min |
| S13 | 1 h 40 min | 1 h 26 min | 4 h | 4 h 52 min |

**Fatores de calibração:**

- Relógio: S11 1,31, S12 0,96 e S13 0,86, média **1,04**.
- Soma: S11 0,80, S12 0,81 e S13 1,22, média **0,94**.

Tarefas da S13 que servem de referência:

- T01 se parece com a S13/T01 (43 min reais).
- T03 se parece com a S13/T08 (46 min).
- T02 se parece com a S13/T05 (42 min, com 9 de fila).

**Total estimado:**

- Soma: 3 h 50 min brutas, **3 h 37 min** depois de calibrar (× 0,94).
- Relógio do agente: o caminho T01 → T05 → T06 → T07 tem 150 min brutos, cerca de **2 h 36 min** com o fator 1,04. A conta não inclui as esperas por Daniel.
- Custo extra fora do Claude: cerca de US$ 15 a 30 de crédito nos provedores.
