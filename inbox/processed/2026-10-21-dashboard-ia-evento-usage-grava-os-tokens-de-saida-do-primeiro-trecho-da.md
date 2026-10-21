# Pedido ao harness: Evento usage grava os tokens de saída do primeiro trecho da resposta

- **Projeto:** dashboard-ia
- **Data:** 2026-10-21
- **Sprint:** S04
- **Prioridade:** media

## O que precisa

Gravar o evento usage com o valor final da mensagem (output_tokens da última linha do transcript com aquele message.id), não o da primeira.

## Por quê

Na revisão da S04 do Dashboard IA, 274 mensagens tinham saída errada no evento: 2.594 tokens contra 322.532 no transcript. O painel só mostra certo porque o transcript sobrescreve o evento.

## Exemplo

message_id msg_X: evento output=8, transcript output=208
