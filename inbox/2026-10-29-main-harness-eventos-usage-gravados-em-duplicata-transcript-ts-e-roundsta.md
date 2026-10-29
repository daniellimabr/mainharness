# Pedido ao harness: Eventos usage gravados em duplicata (transcript.ts) e roundStats soma duplicado

- **Projeto:** main-harness
- **Data:** 2026-10-29
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Deduplicar por message_id na gravação, não só na leitura

## Por quê

S12: hx usage/metrics precisaram de dedupe na leitura (T08); o log de eventos segue inchado e roundStats duplica a soma

## Exemplo

—
