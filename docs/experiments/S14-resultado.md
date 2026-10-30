# S14 — Resultado do teste cego com trabalhadores externos

Pergunta: DeepSeek V4 Pro, Kimi K2.7 Code ou GLM-5.2 (grátis pelo OmniRoute) fazem trabalho pesado com qualidade de Sonnet? Protocolo em `S14-protocolo.md`.

## Resposta curta
Não deu para medir os três. Só o `gpt-oss-20b` (NVIDIA NIM) rodou uma sessão real, e falhou. Nenhum externo grátis executa tarefa hoje.

## O que aconteceu
- **Rota `cfp/` (Cloudflare Playground):** aceita no máximo 6.000 caracteres por pedido. Uma sessão real do Claude Code manda ~150 KB (system prompt, 27 ferramentas), então todo pedido vira 502 `STREAM_EARLY_EOF`. `hx worker check` passa (pedido curto); sessão real, nunca. As 9 corridas (3 desafios x 3 modelos) foram inválidas e apagadas.
- **NVIDIA NIM (conectada em 2026-10-30):** o catálogo ao vivo não tem DeepSeek V4 Pro, Kimi K2.7/K3 nem GLM-5.2. Só `kimi-k2.6`, `deepseek-v4.1-flash`, `glm-5.3-flash` e `gpt-oss-20b`. Com pedido de ~108 KB: `kimi-k2.6` dá 404 (castigo de 2 min), `deepseek-v4.1-flash` e `glm-5.3-flash` não respondem em 90–180 s, `gpt-oss-20b` responde em 3 s.
- **Rotas `dva/`, `aug/`, `zc/`:** dependem de programas locais (bridge do Devin, `auggie`, `zcode`) que não estão instalados.

## Corridas válidas (desafio 3, `hx worker list`)
| Modelo | Aceite | Escondidos | Diff | Tempo | Custo | Lint/tipos |
|---|---|---|---|---|---|---|
| Sonnet | 8/0 | 8/0 | 95 | 151 s | US$ 0,38 | ok |
| Opus | 10/0 | 6/2 | 105 | 223 s | US$ 0,77 | ok |
| gpt-oss-20b | 5/1 | 2/6 | 1 | 988 s | grátis (o US$ 9,29 do JSON é preço de tabela do Claude, não cobrado) | formato falha |

O `gpt-oss-20b` gastou 30 turnos e 1,6 M de tokens para mudar 1 linha, e o teste de aceite não passa. Reprovado; não gastei corridas nos desafios 1 e 2 com ele. Sem nota do juiz: a falha é objetiva (aceite e escondidos).

## Limites desta leitura
Uma corrida, um desafio, um modelo pequeno. Não diz nada sobre DeepSeek V4 Pro, Kimi K2.7 Code ou GLM-5.2, que seguem sem rota viável.

## Próximo teste
Gemini 4 Argon (já decidido em `docs/decisoes-daniel.md`) ou um provedor que aceite contexto grande e tenha esses modelos (ex.: OpenRouter `:free`).
