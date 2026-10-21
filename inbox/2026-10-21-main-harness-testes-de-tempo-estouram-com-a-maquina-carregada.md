# Pedido ao harness: Testes de tempo estouram com a máquina carregada

- **Projeto:** main-harness
- **Data:** 2026-10-21
- **Sprint:** —
- **Prioridade:** baixa

## O que precisa

Aumentar o timeout ou medir só o caminho rápido nos testes '5 MB transcript' (usage) e 'web project' (attach), para npm run check não falhar quando evals rodam em paralelo

## Por quê

S05: 2 falhas falsas em 2 rodadas do check completo (32 s > 30 s); isolados passam 17/17

## Exemplo

usage.test.ts 'second ingest of a 5 MB transcript is fast' 32819ms
