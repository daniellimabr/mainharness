# Pedido ao harness: Recusar HARNESS_HOME relativo ou na raiz do disco

- **Projeto:** main-harness
- **Data:** 2026-10-16
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

hx falha com erro claro quando HARNESS_HOME não é absoluto ou aponta para a raiz de um disco

## Por quê

S01: uma variável vazia gerou HARNESS_HOME='\.hh' e o hx gravou C:\.hh, C:\.claude e C:\docs; isso quebrou 3 testes e precisou de Daniel para apagar

## Exemplo

HARNESS_HOME=\.hh hx sprint approve S01 -> erro, nada gravado
