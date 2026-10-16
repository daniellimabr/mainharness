# ADR 0007 — Consumo lido dos transcripts (adaptador)

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

Tokens e US$ por projeto, chat, sprint e agente, sem API nem servidor. Trocável por OpenTelemetry no futuro.

## Formato observado (Claude Code 2.1.292, Windows)

- Sessão principal: `%USERPROFILE%\.claude\projects\<cwd com separadores trocados por ->\<sessionId>.jsonl`.
- Subagentes: `...\<sessionId>\subagents\agent-<id>.jsonl`.
- Linhas `type: "assistant"` trazem `message.id`, `message.model`, `requestId`, `timestamp`, `cwd`, `sessionId`, `isSidechain` e `message.usage` com `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` e `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens`.
- **A mesma resposta aparece em várias linhas** (uma por bloco de conteúdo), com o mesmo `message.id` e o mesmo `usage`. É preciso deduplicar por `message.id`.

## Decisão

- Interface `UsageSource` em `cli/src/usage/` com uma implementação `TranscriptSource`. Trocar por OpenTelemetry = nova implementação, mesmo evento `usage`.
- Leitura incremental: `%USERPROFILE%\.harness\cache\usage\<sessionId>.json` guarda o byte já lido por arquivo e os `message.id` vistos no fim do último bloco.
- Um evento `usage` por resposta nova, com `data: {model, input, output, cache_write, cache_read, usd}`; o agente vem do frontmatter do subagente (`agent_type` do hook) ou `tech-lead` para a sessão principal.
- Preços em `config.json` (US$ por milhão de tokens; escrita de cache 5 min = 1,25× entrada, 1 h = 2× entrada):

| Modelo | Entrada | Saída | Cache 5m | Cache 1h | Leitura cache |
|---|---|---|---|---|---|
| claude-opus-5-5 | 4,00 | 20,00 | 5,00 | 8,00 | 0,20 |
| claude-sonnet-5-5 | 2,00 | 10,00 | 2,50 | 4,00 | 0,20 |
| claude-fable-5-1 | 10,00 | 50,00 | 12,50 | 20,00 | 0,25 |
| claude-haiku-4-5 | 1,00 | 5,00 | 1,25 | 2,00 | 0,10 |

- Modelo sem preço na tabela: `usd: null` e linha no log (nunca quebra).

## Consequências

- O valor é **estimado** (assinatura não cobra por token). O formato do transcript não é contrato público; se mudar, só o adaptador muda. Um teste com transcript de exemplo protege o parser.
