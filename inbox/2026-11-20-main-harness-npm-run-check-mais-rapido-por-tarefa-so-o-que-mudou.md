# Pedido ao harness: npm run check mais rapido por tarefa (so o que mudou)

- **Projeto:** main-harness
- **Data:** 2026-11-20
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Um modo de check incremental (lint e testes so dos arquivos alterados, completo so na revisao final) para o Reviewer e o Tech Lead usarem a cada tarefa.

## Por quê

S18: o check completo levou 354 s (321 s so de testes, 65 arquivos) e rodou a cada onda; com 10 tarefas e 2 reprovacoes, o relogio da sprint foi 1 h 35 min e a revisao ficou em 9 min nas tarefas T06, T07 e T08.

## Exemplo

hx run npm run check -- --changed roda eslint e vitest related nos arquivos do diff
