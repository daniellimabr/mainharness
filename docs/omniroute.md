# OmniRoute: modelos grátis

Guia curto para usar, pelo `hx worker`, os modelos grátis que o OmniRoute já oferece. Não precisa de chave nova nem de crédito: vale só o token do OmniRoute que já está em `~/.harness/config.json`. **Nunca copie o token para documento, commit ou chat.**

## Modelos que funcionam

> **Aviso (S14):** o `hx worker check` passa nestes três, mas numa sessão real do Claude Code (~150 KB por pedido) a rota `cfp/` recusa com 502: ela limita o pedido a 6.000 caracteres. Serve só para chamadas curtas. Veja `docs/adr/0015-externos-gratis-nao-executam.md`.

| Modelo | Uso |
|---|---|
| `cfp/deepseek-ai/deepseek-v4-pro-0813` | DeepSeek V4 Pro, uso geral e raciocínio |
| `cfp/moonshotai/kimi-k2.7-code` | Kimi K2.7, voltado a código |
| `cfp/zai-org/glm-5.2` | GLM-5.2, uso geral |

## Como configurar um apelido

Na chave `workers` de `~/.harness/config.json`, cada apelido tem endereço do OmniRoute, modelo e preço por milhão de tokens (grátis = 0). O token fica no mesmo arquivo e não sai dele. Exemplo, sem o token:

```json
"workers": {
  "deepseek": {
    "url": "<endereço do OmniRoute>",
    "model": "cfp/deepseek-ai/deepseek-v4-pro-0813",
    "token": "<token do OmniRoute>",
    "price": { "input": 0, "output": 0 }
  }
}
```

## Como conferir e usar

- `hx worker check <apelido>`: faz uma chamada mínima e diz se o modelo responde. Rode antes de confiar num apelido novo.
- `hx worker run TNN <handoff> --model <apelido>`: manda o handoff da tarefa para o modelo externo. O Claude continua como juiz.

Se o `check` falhar, não insista: veja a tabela abaixo e troque de modelo.

## Roteadores `auto/*`

O OmniRoute tem roteadores `auto/*` que escolhem o modelo sozinhos. Servem para testar rápido, mas o modelo muda de uma chamada para outra, então **não use em teste comparativo** (o resultado deixa de ser atribuível a um modelo). Para tarefa de sprint, prefira um modelo fixo.

## Limites dos provedores grátis

Não confirmei os números oficiais de cada provedor (cota por minuto/dia e tamanho de contexto); trate como **não confirmado**. O que se sabe na prática:

- Grátis pode devolver 429 (cota) ou 5xx (provedor instável) sem aviso.
- A cota é do provedor atrás do OmniRoute, não do harness; o `hx usage` registra o consumo, mas não o limite.
- Se bater 429, espere ou troque de apelido; não repita em laço.

## O que não funcionou (2026-10-29)

| Modelo | Resultado |
|---|---|
| `dva/*` | erro 500 |
| `zc/glm-5.3` | erro 502 |
| `gemini/gemini-4-argon` | 429; a conta grátis não libera esse modelo |

Reteste só se houver motivo (provedor avisou conserto); anote a data aqui.

## Direto no provedor (S15)

Sem o OmniRoute no meio: o apelido aponta para o endereço Anthropic do próprio provedor, com chave e franquia próprias (fora do limite do Claude). Não há o corte de 6.000 caracteres da rota grátis `cfp/`.

- `deepseek`: `url` `https://api.deepseek.com/anthropic`, `model` `deepseek-v4-pro`, `token` a chave da DeepSeek (crédito pago, US$ 5). Passou no `hx worker check` em 2026-10-30.
- `glm` (`https://api.z.ai/api/anthropic`) e `kimi`: só com camada grátis. Argon (Gemini) não fala o formato Anthropic e fica fora.
- O `check` faz duas sondas: uma linha (cota) e ~100 KB (tamanho). 429 = cota, 413/502 = tamanho, 401/403 = chave, sem resposta = provedor fora do ar.
- Preço por milhão de tokens no `price` do apelido, para o `hx usage` contar o gasto real.
