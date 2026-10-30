# Pedido ao harness: hx worker check deve sondar pedido grande, não só curto

- **Projeto:** main-harness
- **Data:** 2026-10-30
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Fazer o check mandar um pedido de ~100 KB (e um de uma linha, para separar cota de tamanho) antes de dar OK

## Por quê

S14: o check passou em deepseek, kimi e glm (cfp/), mas toda sessão real (~150 KB) deu 502 porque a rota corta em 6.000 caracteres; a T05 gastou 2 h 23 min contra 56 min previstos

## Exemplo

—
