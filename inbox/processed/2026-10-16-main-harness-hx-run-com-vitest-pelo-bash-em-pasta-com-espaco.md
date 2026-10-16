# Pedido ao harness: hx run com vitest pelo Bash em pasta com espaço

- **Projeto:** main-harness
- **Data:** 2026-10-16
- **Sprint:** —
- **Prioridade:** baixa

## O que precisa

Pelo Bash do Claude Code, 'hx run npx vitest run <arquivo>' falha nesta pasta com 'Cannot read properties of undefined (reading config)'; pelo PowerShell funciona. Investigar a causa (provável letra do drive c: x C: no cwd) e corrigir no hx run.

## Por quê

S02: a 1ª rodada de testes da sprint falhou 2 vezes pelo Bash antes de trocar para o PowerShell; hoje a orientação manda usar o PowerShell, o que contorna mas não resolve.

## Exemplo

hx run npx vitest run cli/test/sprint.test.ts (Bash) -> testes rodam.
