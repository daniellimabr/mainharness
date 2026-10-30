# Pedido ao harness: vitest com maxWorkers=3 no npm test

- **Projeto:** main-harness
- **Data:** 2026-10-30
- **Sprint:** —
- **Prioridade:** baixa

## O que precisa

Fixar --maxWorkers=3 no script de teste (ou no vitest.config.mts).

## Por quê

Na S15 a suite inteira caiu 2 vezes com exit 3221226505 em worker.test.ts; isolado passa 5/5 e com --maxWorkers=3 passa 516/516.

## Exemplo

—
