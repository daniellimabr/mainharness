# Pedido ao harness: hx eval usa o hx do repo, nao o estavel

- **Projeto:** main-harness
- **Data:** 2026-10-27
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Nos evals, o hx da sandbox deve ser o cli/dist/hx.js do repo, para testar comandos novos antes da release

## Por quê

S10: skill worker precisou de 4 rodadas de eval; 3 falharam porque o hx estavel 0.8.2 nao tinha 'worker'. Evals custaram US$ 9.14 de 26.99 (34%) da sprint

## Exemplo

hx eval worker com comando novo 'hx worker run' ainda nao lancado
