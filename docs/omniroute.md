# OmniRoute: modelos grátis

Guia curto para usar, pelo `hx worker`, os modelos grátis que o OmniRoute já oferece. Não precisa de chave nova nem de crédito: vale só o token do OmniRoute que já está em `~/.harness/config.json`. **Nunca copie o token para documento, commit ou chat.**

## Modelos que funcionam

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
