# Pedido ao harness: Build do globalSetup não quebrar com módulo removido por outro clone

- **Projeto:** main-harness
- **Data:** 2026-10-21
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Os testes de um clone rodam mesmo quando outro clone da mesma onda apagou um módulo que o roteador ainda importa (ex.: o plano manda o Tech Lead ajustar o roteador logo na abertura da onda, ou o globalSetup só builda o que o teste usa)

## Por quê

S07: a T02 apagou o statusline.ts e o build do globalSetup quebrou a suíte da T01, T02 e T04; três clones montaram configs próprias sem o globalSetup para testar

## Exemplo

—
