# S14 — Protocolo do teste cego

Pergunta: DeepSeek V4 Pro, Kimi K2.7 Code ou GLM-5.2 (grátis pelo OmniRoute) entregam trabalho com qualidade de Sonnet? Reaproveita o protocolo da S12 (`S12-protocolo.md`).

## Condições (iguais para todos)
- Mesmo commit base, mesmo handoff, persona `main-harness:executor`, ferramentas `Read,Edit,Write,Glob,Grep,Bash,PowerShell`.
- Clone temporário com `npm ci` antes do relógio, `HARNESS_HOME` temporário, limite de 60 min, uma corrida por vez.
- Teste de aceite no handoff; testes escondidos copiados só depois do diff.
- Roteadores `auto/*` do OmniRoute não entram (escondem o modelo real).

## Desafios e bases
| Desafio | Base | Quem roda |
|---|---|---|
| 1 (S12) | `af8b9996f9750f50ced5e4ecb045cc5a7d9e6e68` | deepseek, kimi, glm (Sonnet e Opus: resultado da S12) |
| 2 (S12) | `bd59ba1b0deb082701fb54652c959d7281d8e127` | deepseek, kimi, glm (Sonnet e Opus: resultado da S12) |
| 3 (novo: `hx worker list`) | `ebf31dc685c90246a0b5ad88bc08a74fe00943a6` | deepseek, kimi, glm, sonnet, opus |

Comando: `node scripts/bench.mjs <desafio> <opus|sonnet|apelido> --base <commit>`. Saída em `docs/experiments/S14/<desafio>-<modelo>.json/.patch` (desafios 1 e 2: handoff e escondidos ficam em `S12/`).

## Nota (0–25)
Correção (aceite) · testes escondidos · tamanho/clareza · lint/tipos · segurança, 5 pontos cada. Juiz: Reviewer Sonnet, às cegas, com letras A/B/C sorteadas. Vencedor por nota; empate pelo mais barato.

## Leitura do resultado
Um externo "pode executar" um tipo de tarefa se ficar a até 3 pontos do Sonnet nos três desafios, sem falhar a segurança. Amostra pequena (1 corrida por caso): indica, não prova.
