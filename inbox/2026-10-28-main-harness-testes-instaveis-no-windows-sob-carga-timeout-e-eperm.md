# Pedido ao harness: Testes instáveis no Windows sob carga (timeout e EPERM)

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Os testes que fazem git init no beforeEach (eval.test.ts) ganham timeout maior, e o rm de pasta temporária em cli/test/helpers.ts tenta de novo com maxRetries.

## Por quê

S11: 5 rodadas da suíte com falhas que não eram do código (3 timeouts de 10 s no beforeEach de eval.test.ts, 2 EPERM no rm de worker-run.test.ts) com clones rodando em paralelo; cada falha custou uma rodada extra de ~2,5 min.

## Exemplo

—
