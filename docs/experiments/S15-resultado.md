# S15 — Resultado: DeepSeek V4 Pro direto no provedor

Protocolo em `S15-protocolo.md`; notas do juiz em `S15/notas-juiz.md`.

## Resposta curta
**O DeepSeek V4 Pro, chamado direto, faz o trabalho de um clone com nota de Sonnet** (66 contra 67 em 75 pontos nos três desafios), sem falha do provedor e sem o corte do OmniRoute. GLM, Kimi e Argon não foram testados (sem camada grátis; Argon fora, ver `docs/omniroute.md`). Uma corrida por caso: indica, não prova.

## Notas (juiz cego Sonnet, 0–25)
| Desafio | DeepSeek | Sonnet | Opus |
|---|---|---|---|
| 1 (lock do worker) | 22 | 20 | 24 |
| 2 | 22 | 24 | 24 |
| 3 (`worker list`) | 22 | 23 | 20 |
| **Soma** | **66** | **67** | **68** |

Diferença para o Sonnet por desafio: +2, −2, −1 (limite do protocolo: até 3). Segurança sem achado nos três; lint e tipos ok.

## Tempo e custo
| Desafio | Tempo DeepSeek | Tempo Sonnet | Tempo Opus |
|---|---|---|---|
| 1 | 384 s | 110 s | 207 s |
| 2 | 387 s | 81 s | 174 s |
| 3 | 488 s | 151 s | 223 s |

Tokens do DeepSeek por corrida: ~57 mil de entrada, ~33 mil de saída, 1,8–2,5 mi lidos de cache. US$ pagos: **a confirmar no painel da DeepSeek** (o `cost_usd` do JSON é preço de tabela do Claude, não cobrado). Sonnet no desafio 3: US$ 0,38.

## Ressalvas
- **Aceite 0/N em dois casos (D1 e D2):** o teste de aceite que o DeepSeek escreveu é idêntico ao dos diffs que passaram, os escondidos passaram todos e o juiz achou o código correto; só esses dois diffs trazem ruído em `.claude/harness.json`. Parece falha de ambiente da corrida, não do código, mas não foi reproduzida. O juiz pesou pouco (−1 a −2 em Correção).
- **D3:** o aceite do DeepSeek falhou em 1 de 11 (`workers` ausente deveria dar "Nenhum trabalhador configurado." e saída 0).
- 3 a 5 vezes mais lento que o Sonnet (384–488 s contra 81–151 s).
- Uma corrida por caso e um juiz só.

## Onde pode executar
Tarefas de código com handoff claro e teste de aceite, no nível dos desafios (lock, comando novo do `hx`), com o Reviewer conferindo o aceite. Fora disso (contrato sensível, hooks, segurança) segue Sonnet até haver mais corridas.
