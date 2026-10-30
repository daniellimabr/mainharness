# ADR 0015 — Nenhum trabalhador externo grátis executa tarefa (resultado do experimento S14)

- **Status:** aceito
- **Data:** 2026-10-30
- **Harness:** 0.12.0
- **Complementa:** ADR 0014 (regra "quem executa"); ADR 0012 (trabalhadores)

## Contexto

A S14 construiu `hx worker run/check` genérico (apelidos em `~/.harness/config.json`) para testar DeepSeek V4 Pro, Kimi K2.7 Code e GLM-5.2 grátis pelo OmniRoute (`docs/experiments/S14-resultado.md`). A rota `cfp/` limita o pedido a 6.000 caracteres e uma sessão real do Claude Code manda ~150 KB: 502 sempre. A NVIDIA NIM não tem esses três modelos; dos que tem, só o `gpt-oss-20b` respondeu em sessão real e reprovou no desafio 3 (aceite 5/1, escondidos 2/6, diff de 1 linha, 988 s).

## Decisão

- **Nenhum externo executa tarefa** pela rota grátis atual. A coluna Agente do plano segue a ADR 0014 (opus, sonnet, haiku); `worker (<apelido>)` **não** entra.
- `hx worker` e os apelidos ficam: servem para a próxima rodada de testes e para o `usage`.
- Reabrir só com rota nova que aceite contexto grande (pedido de ~150 KB) e tenha o modelo; o primeiro candidato é o Gemini 4 Argon (decisão de Daniel registrada).
- Antes de qualquer teste caro: pedido grande de sonda (~100 KB) no modelo; se falhar, não rodar.

## Consequências

- Sem economia nova de custo nesta sprint; a regra de quem executa não muda.
- Ficou a sonda de pedido grande como pré-condição (barata) para testar outros modelos.
- Base mínima: 1 modelo, 1 desafio. Não prova que DeepSeek, Kimi ou GLM seriam ruins; prova que não há rota para medir.
