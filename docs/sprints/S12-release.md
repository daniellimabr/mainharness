# S12 — Release Report

## Resumo da entrega

**v0.10.2: experimento de modelos e regra "quem executa" revisada.** A mesma tarefa em Opus, Sonnet e Gemini com nota cega: Opus venceu os dois desafios (B099 e B105, já na `main`), Sonnet errou um caso de borda em cada um e Gemini não serviu para código. Daniel aprovou na sprint a proposta do relatório: ADR 0014 (Haiku no lugar do Gemini, que fica desligado; Reviewer em Sonnet na rotina e Opus em área sensível e na revisão final).

Também saíram: `hx usage` e `hx metrics` sem duplicatas por `message_id`, compactação aos 140 mil em todos os projetos (migração + `hx doctor`), testes estáveis no Windows e ajustes da auditoria de prompts. Relatório completo: `docs/experiments/S12-resultado.md`.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Testes estáveis no Windows (B106) | clone (sonnet) | 12 min | 19:51 | 20:23 | 21 min (fila: 1 min, revisão: 10 min) |
| ✅ | T02 | Protocolo e `bench.mjs` | clone (opus) | 28 min | 19:51 | 20:23 | 20 min (fila: 2 min, revisão: 10 min) |
| ✅ | T03 | Desafios: handoffs, aceite e testes ocultos | clone (opus) | 24 min | 19:51 | 20:23 | 12 min (fila: 10 min, revisão: 10 min) |
| ✅ | T04 | Desafio 1 (B099): 3 corridas, nota cega, vencedor na `main` | tech-lead (sonnet) + reviewer (opus) + reviewer (sonnet) | 44 min | 20:25 | 21:38 | 1 h 13 min |
| ✅ | T05 | Desafio 2 (B105): 3 corridas, nota cega, vencedor na `main` | tech-lead (sonnet) + reviewer (opus) + reviewer (sonnet) | 52 min | 21:38 | 22:24 | 46 min |
| ✅ | T06 | Relatório: experimento, custo por papel, Reviewers, linha de base do chat principal | clone (opus) | 32 min | 22:24 | 22:31 | 4 min (fila: 3 min) |
| ✅ | T07 | Backlog, CHANGELOG, roadmap e release v0.10.2 | tech-lead (sonnet) | 12 min | 22:29 | 22:31 | 2 min |
| ✅ | T08 | `hx usage` e `hx metrics` sem duplicatas (`message_id`) | clone (sonnet) | 16 min | 19:51 | 20:23 | 7 min (fila: 15 min, revisão: 10 min) |
| ✅ | T09 | Compactar aos 140 mil em todos os projetos (migração + `hx doctor`) | clone (opus) | 24 min | 19:51 | 20:23 | 14 min (fila: 8 min, revisão: 10 min) |
| ✅ | T10 | Ajustes da auditoria de prompts (Reviewer em Opus, `cd` no `tech-lead.md`) | clone (sonnet) | 8 min | 19:51 | 20:23 | 5 min (fila: 17 min, revisão: 10 min) |
| ✅ | **Total** | 10 tarefas |  | 2 h 48 min | 2026-10-28 19:51 | 2026-10-28 22:31 | 2 h 41 min |

## Observações por tarefa

| Tarefa | Quem fez de fato | Passou de primeira? | Nota |
|---|---|---|---|
| T01, T08, T10 | clone Sonnet | sim | Rotina, sem achados. |
| T02, T03, T09 | clone Opus | sim | A T09 (migração do `settings.json`) teve revisão cuidadosa e passou. |
| T04, T05 | Tech Lead (Sonnet) + Reviewers | sim | 3 corridas cada, nota cega, vencedor Opus na `main`. A T04 levou 73 min (previsto 44) por causa do OmniRoute fora do ar e do Gemini estourar 60 min. |
| T06 | clone Opus | sim | Só um "59%" que deveria ser "cerca de 60%". |
| T07 | Tech Lead (Sonnet) | não (1 reprovação) | Roadmap e ADR 0014 se contradiziam sobre o Reviewer. Corrigido e aprovado na re-revisão. |

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 2 h 48 min · 2 h 41 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 0 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 2 h 34 min · 29 min |
| Soma das tarefas (planejada · real) | 4 h 12 min · 3 h 24 min |
| Tarefas feitas | 10/10 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 684 / 227.626 / 1.297.879 / 27.303.201 |
| Custo total | US$ 14.48 |
| Custo por agente | tech-lead US$ 6.03 · main-harness:executor US$ 5.46 · main-harness:reviewer US$ 2.99 |
| Custo por modelo | claude-sonnet-5-5 US$ 6.79 · claude-opus-5-5 US$ 7.68 |
| Tokens por modelo (entrada / saída / escrita em cache / leitura de cache) | claude-sonnet-5-5 404 / 111.775 / 641.872 / 18.179.446 · claude-opus-5-5 280 / 115.851 / 656.007 / 9.123.755 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 0 |
| Handoffs | 2 |

## Revisão

Reviewer Opus em 3 ondas, com SendMessage na mesma sessão. Onda 1: T01, T02, T03, T08, T09 e T10 aprovadas. Onda 2: T04 e T05, com nota cega do Opus e do Sonnet em paralelo. Onda 3: T06 aprovada; T07 reprovada uma vez (texto contraditório) e aprovada na re-revisão. Nenhum achado de segurança. Os dois Reviewers deram o mesmo ranking nos desafios, o Sonnet por metade do custo (base do ADR 0014).

## Retorno de Daniel

Sem ajustes pedidos (0 rodadas). Durante a sprint ele decidiu: confirmar os 140 mil; desligar o Gemini e usar Haiku para texto simples; aceitar a proposta do experimento e aplicá-la no patch; abrir chat novo para a conversa sobre tokens e reels (handoff gravado). Ideias registradas no backlog: B112 a B116.

## Retrospectiva

### Comparação

| | S10 | S11 | S12 |
|---|---|---|---|
| Custo (US$, estimado) | 26.99 | 11.77 | 14.48 |
| Relógio (previsto · corrido) | 1 h 45 min · 2 h 44 min | 1 h 12 min · 1 h 34 min | 2 h 48 min · 2 h 41 min |
| Retrabalho | 0 | 1 | 0 |
| Reprovações | 0 | 2 | 1 |

O corrido ficou 4% abaixo do previsto, mas 2 h 34 min dos 2 h 41 min foram espera por Daniel (trabalho de verdade: 29 min). Os US$ 14.48 vêm do `hx metrics` e não incluem as 6 corridas do experimento (cerca de US$ 2,22, no relatório).

### O que funcionou

- O experimento deu uma regra com número: o Opus custa cerca de US$ 0,40 a mais por corrida, mas evita a rodada de correção.
- Clones em paralelo na onda 1: 6 tarefas em 32 min de relógio.
- A revisão cega com dois Reviewers mostrou que o Sonnet revisa rotina por metade do preço.

### O que não funcionou

- O Gemini custou tempo (60 e 36 min) e deixou lixo (BOM, acentos). Foi desligado.
- A T07 voltou uma vez porque a regra nova foi escrita em 5 lugares e um ficou desatualizado.
- A conversa de tokens e reels desviou do objetivo da sprint e virou chat à parte.

### Oportunidades no harness

- Eventos `usage` ainda são gravados em duplicata (`transcript.ts`) e o `roundStats` soma duplicado: o dedupe só existe na leitura.
- `hx task done` e `hx task phase` em tarefa já fechada pelo `hx review pass` imprimem "não está em andamento" (10 de 10 tarefas): ruído.
- `worker-run.test.ts` oscila no Windows sob carga (EPERM e timeout de hook).
