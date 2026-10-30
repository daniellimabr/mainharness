# S15 — Protocolo do teste cego (modelo direto no provedor)

Pergunta: o DeepSeek V4 Pro chamado direto (`https://api.deepseek.com/anthropic`, chave e crédito próprios, sem OmniRoute) entrega trabalho com qualidade de Sonnet? Mesmo método da S12 e S14 (`S14-protocolo.md`): mesmas condições, mesmo handoff, testes escondidos, nota 0–25, juiz cego.

## Condições
- Idênticas à S14: mesmo commit base, persona `main-harness:executor`, ferramentas `Read,Edit,Write,Glob,Grep,Bash,PowerShell`, clone temporário com `npm ci`, `HARNESS_HOME` temporário, limite de 60 min, uma corrida por vez.
- Só entram apelidos que passam no `hx worker check` novo (sonda de uma linha e de ~100 KB). Passou: `deepseek`. GLM, Kimi e Argon: fora (sem camada grátis, ver `docs/omniroute.md`).
- Linha de base: Sonnet e Opus dos desafios 1, 2 (S12) e 3 (S14), sem rodar de novo.
- Se o crédito da DeepSeek (US$ 5) acabar, a corrida para. Corrida com falha do provedor (não do modelo) é inválida e não entra.

## Desafios e bases
| Desafio | Base |
|---|---|
| 1 | `af8b9996f9750f50ced5e4ecb045cc5a7d9e6e68` |
| 2 | `bd59ba1b0deb082701fb54652c959d7281d8e127` |
| 3 | `ebf31dc685c90246a0b5ad88bc08a74fe00943a6` |

Comando: `node scripts/bench.mjs <desafio> deepseek --base <commit>`. Saída em `docs/experiments/S15/`.

## Medidas
Nota (0–25: correção, escondidos, tamanho/clareza, lint/tipos, segurança), tempo, US$ pagos (tokens x `price` do apelido; o `cost_usd` do JSON é preço de tabela do Claude, não cobrado) e falhas do provedor. Juiz: Reviewer Sonnet, às cegas, com o diff do externo e os do Sonnet e Opus em letras sorteadas.

## Leitura
Pode executar um tipo de tarefa se ficar a até 3 pontos do Sonnet nos três desafios, sem falhar a segurança. Uma corrida por caso: indica, não prova.
